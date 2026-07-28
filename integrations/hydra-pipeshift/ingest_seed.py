"""Ingest DriftLens seed-pack evidence into HydraDB for RocketRide recall."""

from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "driftlens-seed-pack" / "driftlens-seed"
API = "https://api.hydradb.com"
DATABASE = os.environ.get("HYDRADB_TENANT_ID", "love2agents").strip()
COLLECTION = os.environ.get("HYDRADB_COLLECTION", "Ali_amjad").strip()

PROVIDER_DIRS = {
    "google-drive": "drive",
    "slack": "slack",
    "linear": "linear",
    "github": "github",
}


def load_env() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def headers() -> dict[str, str]:
    key = os.environ.get("HYDRADB_API_KEY", "").strip()
    if not key:
        raise SystemExit("HYDRADB_API_KEY is missing")
    return {
        "Authorization": f"Bearer {key}",
        "API-Version": "2",
    }


def slugify(path: Path) -> str:
    rel = path.relative_to(SEED).as_posix()
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", rel).strip("_").lower()
    return f"driftlens_{slug}"[:120]


def build_memories() -> list[dict]:
    memories: list[dict] = []
    for folder, provider in PROVIDER_DIRS.items():
        root = SEED / folder
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            if path.name.lower() in {"readme.md", "expected-results.json"}:
                continue
            if path.suffix.lower() not in {".md", ".csv", ".ts", ".txt", ".json"}:
                continue
            text = path.read_text(encoding="utf-8")
            rel = path.relative_to(SEED).as_posix()
            memories.append(
                {
                    "id": slugify(path),
                    "title": f"{provider.upper()} · {path.name}",
                    "text": (
                        f"Source system: {provider}\n"
                        f"Path: {rel}\n"
                        f"Component tags present in corpus: controller_01, "
                        f"occlusion_sensor_01\n\n"
                        f"{text}"
                    ),
                    "is_markdown": path.suffix.lower() == ".md",
                    "infer": False,
                    "metadata": {"provider": provider},
                    "additional_metadata": {
                        "app_provider": provider,
                        "source_name": folder,
                        "path": rel,
                    },
                }
            )
    return memories


def ingest_batch(memories: list[dict]) -> list[str]:
    data = {
        "type": "memory",
        "database": DATABASE,
        "collection": COLLECTION,
        "upsert": "true",
        "memories": json.dumps(memories),
    }
    response = requests.post(
        f"{API}/context/ingest",
        headers=headers(),
        data=data,
        timeout=180,
    )
    if response.status_code >= 400:
        raise SystemExit(f"ingest failed ({response.status_code}): {response.text}")
    payload = response.json()
    print(json.dumps(payload, indent=2)[:2500])
    results = (payload.get("data") or {}).get("results") or []
    ids = [item.get("id") or item.get("source_id") for item in results]
    return [i for i in ids if i]


def wait_ready(ids: list[str], timeout_s: int = 420) -> None:
    deadline = time.time() + timeout_s
    pending = set(ids)
    while pending and time.time() < deadline:
        response = requests.get(
            f"{API}/context/status",
            headers=headers(),
            params={
                "database": DATABASE,
                "collection": COLLECTION,
                "ids": ",".join(sorted(pending)),
            },
            timeout=60,
        )
        if response.status_code >= 400:
            print(f"status poll warning ({response.status_code}): {response.text[:400]}")
            time.sleep(5)
            continue
        payload = response.json()
        items = ((payload.get("data") or {}).get("statuses")) or []
        done: set[str] = set()
        for item in items:
            sid = item.get("id") or item.get("source_id")
            status = (item.get("indexing_status") or item.get("status") or "").lower()
            if sid and status in {"completed", "complete", "ready", "indexed", "success"}:
                done.add(sid)
            if sid and status in {"failed", "error", "errored"}:
                raise SystemExit(f"ingestion failed for {sid}: {item}")
        pending -= done
        print(f"indexed={len(ids) - len(pending)}/{len(ids)} pending={len(pending)}")
        if pending:
            time.sleep(5)
    if pending:
        print(f"WARNING: still pending after timeout: {sorted(pending)}")
    else:
        print("All sources indexed.")


def recall_smoke() -> None:
    body = {
        "database": DATABASE,
        "collection": COLLECTION,
        "query": (
            "Find all evidence for medical-device components controller_01 and "
            "occlusion_sensor_01 across Drive Slack Linear GitHub. Include reviewed "
            "values, implemented values, assessments, verification status, and provider metadata."
        ),
        "type": "memory",
        "query_by": "hybrid",
        "max_results": 20,
    }
    response = requests.post(
        f"{API}/query",
        headers={**headers(), "Content-Type": "application/json"},
        json=body,
        timeout=60,
    )
    payload = response.json()
    chunks = ((payload.get("data") or {}).get("chunks")) or []
    providers = sorted(
        {
            (c.get("metadata") or {}).get("provider")
            or (c.get("additional_metadata") or {}).get("app_provider")
            for c in chunks
            if c.get("metadata") or c.get("additional_metadata")
        }
    )
    print(f"recall status={response.status_code} chunks={len(chunks)} providers={providers}")
    for chunk in chunks[:8]:
        title = chunk.get("source_title")
        provider = (chunk.get("metadata") or {}).get("provider")
        score = chunk.get("relevancy_score")
        print(f"- [{provider}] {title} score={score}")


def main() -> None:
    load_env()
    memories = build_memories()
    print(f"database={DATABASE} collection={COLLECTION}")
    print(f"prepared {len(memories)} memories")
    for memory in memories:
        print(f"  - {memory['id']} ({memory['metadata']['provider']})")

    # HydraDB enforces a ~1000 memory_token budget per request.
    all_ids: list[str] = []
    for i, memory in enumerate(memories, start=1):
        print(f"\ningesting {i}/{len(memories)}: {memory['id']}")
        all_ids.extend(ingest_batch([memory]))
        time.sleep(1.2)

    print(f"\nqueued {len(all_ids)} ids; waiting for index completion...")
    wait_ready(all_ids)
    recall_smoke()


if __name__ == "__main__":
    main()
