import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import {
  investigate,
  type InvestigateRequest,
} from '../integration/investigate';
import { investigateSlackBattery } from '../integration/slackBattery';

function readJsonBody(request: IncomingMessage) {
  return new Promise<unknown>((resolveBody, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error('Request body is too large'));
    });
    request.on('end', () => {
      try {
        resolveBody(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Request body must be valid JSON'));
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

function investigateMiddleware(options: {
  webhookUrl?: string;
  webhookAuth?: string;
  functionUrl?: string;
  functionSecret?: string;
  allowDemoFallback: boolean;
}) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    next: (error?: unknown) => void,
  ) => {
    if (request.url !== '/api/investigate') {
      next();
      return;
    }
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      const payload = await readJsonBody(request) as InvestigateRequest;
      const result = await investigate(payload, options);
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : 'Investigation failed',
      });
    }
  };
}

function investigateApiPlugin(options: {
  webhookUrl?: string;
  webhookAuth?: string;
  functionUrl?: string;
  functionSecret?: string;
  allowDemoFallback: boolean;
  hydraApiKey?: string;
  hydraDatabase?: string;
  hydraCollection?: string;
}): Plugin {
  const investigationHandler = investigateMiddleware(options);
  const slackBatteryHandler = async (
    request: IncomingMessage,
    response: ServerResponse,
    next: (error?: unknown) => void,
  ) => {
    if (request.url !== '/api/slack-battery') {
      next();
      return;
    }
    if (request.method !== 'GET') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      const component = await investigateSlackBattery({
        apiKey: options.hydraApiKey,
        database: options.hydraDatabase,
        collection: options.hydraCollection,
      });
      sendJson(response, component ? 200 : 404, { component });
    } catch (error) {
      sendJson(response, 502, {
        error: error instanceof Error ? error.message : 'HydraDB query failed',
      });
    }
  };

  return {
    name: 'driftlens-investigate-api',
    configureServer(server) {
      server.middlewares.use(slackBatteryHandler);
      server.middlewares.use(investigationHandler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(slackBatteryHandler);
      server.middlewares.use(investigationHandler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const repositoryRoot = resolve(process.cwd(), '..');
  const env = { ...loadEnv(mode, repositoryRoot, ''), ...process.env };

  return {
    plugins: [
      react(),
      investigateApiPlugin({
        webhookUrl: env.ROCKETRIDE_WEBHOOK_URL,
        webhookAuth: env.ROCKETRIDE_WEBHOOK_AUTH,
        functionUrl: env.DRIFTLENS_FUNCTION_URL,
        functionSecret: env.DRIFTLENS_FUNCTION_SECRET,
        allowDemoFallback: env.DRIFTLENS_DEMO_FALLBACK !== 'false',
        hydraApiKey: env.HYDRADB_API_KEY,
        hydraDatabase: env.HYDRADB_TENANT_ID || 'love2agents',
        hydraCollection: env.HYDRADB_SLACK_COLLECTION || 'all-hjkljk',
      }),
    ],
    test: {
      environment: 'jsdom',
      include: [
        'src/**/*.test.{ts,tsx}',
        'scripts/**/*.test.ts',
      ],
    },
  };
});
