import { readFile } from "node:fs/promises";

import {
  createInvestigationStore,
  InMemoryInsForgeRepository,
  validateRocketRideResult,
} from "../src/index.js";

const samplePath = new URL("../test-data.json", import.meta.url);
const sample = validateRocketRideResult(
  JSON.parse(await readFile(samplePath, "utf8")),
);
const repository = new InMemoryInsForgeRepository();
const store = createInvestigationStore(repository);
const saved = await store.storeInvestigation(sample);

if (saved.review_status !== "pending") {
  throw new Error("Demo failed: review_status was not pending");
}
if (saved.component_id !== "controller_01") {
  throw new Error("Demo failed: component_id did not match");
}

console.log(JSON.stringify(saved, null, 2));
