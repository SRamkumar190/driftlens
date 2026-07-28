import assert from "node:assert/strict";
import test from "node:test";

import {
  InsForgeConfigurationError,
  loadInsForgeConfig,
} from "../src/index.js";

test("InsForge configuration requires both URL and server API key", () => {
  assert.throws(
    () => loadInsForgeConfig({}),
    (error: unknown) =>
      error instanceof InsForgeConfigurationError &&
      /INSFORGE_API_URL/.test(error.message),
  );

  assert.throws(
    () =>
      loadInsForgeConfig({
        INSFORGE_API_URL: "https://example.insforge.app",
      }),
    (error: unknown) =>
      error instanceof InsForgeConfigurationError &&
      /INSFORGE_API_KEY/.test(error.message),
  );

  assert.deepEqual(
    loadInsForgeConfig({
      INSFORGE_API_URL: "https://example.insforge.app/",
      INSFORGE_API_KEY: "test-project-key",
    }),
    {
      apiUrl: "https://example.insforge.app",
      apiKey: "test-project-key",
    },
  );
});
