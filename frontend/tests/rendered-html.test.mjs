import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker(label) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(label, `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const context = { waitUntil() {}, passThroughOnException() {} };

test("server-renders the DriftLens review workspace", async () => {
  const worker = await loadWorker("page-test");
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>DriftLens/);
  assert.match(html, /Component review/);
  assert.match(html, /Infusion Pump IP-042/);
  assert.match(html, /Occlusion Sensor/);
  assert.match(html, /EVIDENCE TRACE/);
  assert.match(html, /Human review required/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("investigate API returns the shared result contract", async () => {
  const worker = await loadWorker("api-test");
  const response = await worker.fetch(
    new Request("http://localhost/api/investigate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ component_id: "controller_01" }),
    }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.component_name, "Motor Controller");
  assert.equal(body.status, "unreviewed_drift");
  assert.equal(body.conclusion, "Implementation changed without complete review evidence.");
  assert.equal(typeof body.confidence, "number");
});
