"""Deploy driftlens-analysis.pipe to RocketRide Cloud with required user env."""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path

from rocketride import RocketRideClient

ROOT = Path(__file__).resolve().parents[2]
PIPE = Path(__file__).resolve().parent / "driftlens-analysis.pipe"
OUT = Path(__file__).resolve().parent / "._deploy_result.json"


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


async def main() -> None:
    load_env()
    api_key = os.environ["ROCKETRIDE_API_KEY"].strip()
    openai_key = os.environ["ROCKETRIDE_OPENAI_KEY"].strip()
    hydra_key = os.environ["ROCKETRIDE_HYDRA_DB_API_KEY"].strip()
    old_token = os.environ.get("ROCKETRIDE_OLD_TASK_TOKEN", "").strip()

    missing = [
        name
        for name, value in [
            ("ROCKETRIDE_OPENAI_KEY", openai_key),
            ("ROCKETRIDE_HYDRA_DB_API_KEY", hydra_key),
        ]
        if not value
    ]
    if missing:
        raise SystemExit(f"Missing env: {missing}")

    pipeline = json.loads(PIPE.read_text(encoding="utf-8"))
    print("components:", [component["id"] for component in pipeline["components"]])

    client = RocketRideClient()
    await client.connect()
    try:
        if hasattr(client, "login"):
            try:
                await client.login(api_key=api_key)
            except TypeError:
                pass

        patch = {
            "ROCKETRIDE_OPENAI_KEY": openai_key,
            "ROCKETRIDE_HYDRA_DB_API_KEY": hydra_key,
            "ROCKETRIDE_HYDRADB_DATABASE": os.environ.get(
                "ROCKETRIDE_HYDRADB_DATABASE", "love2agents"
            ),
            "ROCKETRIDE_INSFORGE_URL": os.environ.get(
                "ROCKETRIDE_INSFORGE_URL", ""
            ),
            "ROCKETRIDE_INSFORGE_FUNCTION_SECRET": os.environ.get(
                "ROCKETRIDE_INSFORGE_FUNCTION_SECRET",
                os.environ.get("DRIFTLENS_FUNCTION_SECRET", ""),
            ),
        }
        try:
            existing = await client.account.get_env("user")
            merged = {**(existing or {}), **patch}
            await client.account.set_env("user", merged)
            print("set cloud user env keys:", sorted(merged))
        except Exception as exc:  # noqa: BLE001
            print("set_env warning:", type(exc).__name__, exc)

        if old_token:
            try:
                await client.terminate(old_token)
                print("terminated configured prior task")
            except Exception as exc:  # noqa: BLE001
                print("terminate skip:", type(exc).__name__, exc)

        try:
            existing_token = await client.get_task_token(
                pipeline.get("project_id", ""),
                pipeline.get("source", "driftlens_webhook"),
            )
            if existing_token and existing_token != old_token:
                await client.terminate(existing_token)
                print("terminated resolved prior task")
        except Exception as exc:  # noqa: BLE001
            print("get_task_token skip:", type(exc).__name__, exc)

        result = await client.use(
            pipeline=pipeline,
            name="driftlens_webhook",
            env=patch,
            pipelineTraceLevel="summary",
        )
        OUT.write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")
        print(
            "deploy result keys:",
            sorted(result.keys()) if isinstance(result, dict) else type(result),
        )
    finally:
        try:
            await client.disconnect()
        except Exception:
            pass


if __name__ == "__main__":
    asyncio.run(main())
