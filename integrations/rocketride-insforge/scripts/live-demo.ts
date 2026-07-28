import { readFile } from "node:fs/promises";

import {
  storeInvestigation,
  validateRocketRideResult,
} from "../src/index.js";

try {
  const samplePath = new URL("../test-data.json", import.meta.url);
  const sample = validateRocketRideResult(
    JSON.parse(await readFile(samplePath, "utf8")),
  );
  const saved = await storeInvestigation(sample);
  console.log(JSON.stringify(saved, null, 2));
} catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown InsForge live demo error";
  console.error(`InsForge live demo failed: ${message}`);
  process.exitCode = 1;
}
