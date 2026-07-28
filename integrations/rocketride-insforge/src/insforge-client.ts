import {
  createAdminClient,
  type InsForgeClient,
} from "@insforge/sdk";

import { InsForgeConfigurationError } from "./errors.js";

export interface InsForgeConfig {
  apiUrl: string;
  apiKey: string;
}

function requiredValue(
  value: string | undefined,
  variableName: string,
): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new InsForgeConfigurationError(
      `${variableName} is required for live InsForge storage`,
    );
  }
  return trimmed;
}

function validateApiUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new InsForgeConfigurationError(
      "INSFORGE_API_URL must be a valid absolute URL",
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new InsForgeConfigurationError(
      "INSFORGE_API_URL must use http or https",
    );
  }
  return value.replace(/\/+$/, "");
}

export function loadInsForgeConfig(
  env: NodeJS.ProcessEnv = process.env,
): InsForgeConfig {
  const apiUrl = requiredValue(
    env.INSFORGE_API_URL,
    "INSFORGE_API_URL",
  );
  const apiKey = requiredValue(
    env.INSFORGE_API_KEY,
    "INSFORGE_API_KEY",
  );

  return {
    apiUrl: validateApiUrl(apiUrl),
    apiKey,
  };
}

export function createInsForgeAdminClient(
  config: InsForgeConfig = loadInsForgeConfig(),
): InsForgeClient {
  return createAdminClient({
    baseUrl: config.apiUrl,
    apiKey: config.apiKey,
  });
}
