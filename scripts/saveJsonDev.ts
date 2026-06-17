import { mkdir, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';

import { z } from 'zod';

export const SAVE_JSON_ENDPOINT = '/__sinan/save-json';

const SaveJsonPayloadSchema = z
  .object({
    path: z.string().min(1),
    data: z.unknown(),
  })
  .strict();

export type SaveJsonPayload = z.infer<typeof SaveJsonPayloadSchema>;

export function resolveDataWritePath(repoRoot: string, requestedPath: string): string {
  const normalized = requestedPath.replaceAll('\\', '/');

  if (
    path.isAbsolute(requestedPath) ||
    normalized.includes('\0') ||
    normalized.includes('..') ||
    !normalized.startsWith('data/') ||
    !normalized.endsWith('.json')
  ) {
    throw new Error('Save path must be a relative data/**/*.json path.');
  }

  const dataRoot = path.resolve(repoRoot, 'data');
  const target = path.resolve(repoRoot, normalized);
  const relativeToData = path.relative(dataRoot, target);

  if (relativeToData.startsWith('..') || path.isAbsolute(relativeToData)) {
    throw new Error('Save path escapes data directory.');
  }

  return target;
}

export async function writeJsonToDataPath(
  repoRoot: string,
  payload: SaveJsonPayload,
): Promise<string> {
  const target = resolveDataWritePath(repoRoot, payload.path);
  const json = `${JSON.stringify(payload.data, null, 2)}\n`;

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, json, 'utf8');

  return target;
}

export function createSaveJsonMiddleware(repoRoot: string) {
  return (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    if (request.url?.split('?')[0] !== SAVE_JSON_ENDPOINT) {
      next();
      return;
    }

    void handleSaveJsonRequest(repoRoot, request, response);
  };
}

async function handleSaveJsonRequest(
  repoRoot: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const payload = SaveJsonPayloadSchema.parse(JSON.parse(await readRequestBody(request)));
    await writeJsonToDataPath(repoRoot, payload);
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Uint8Array[] = [];
  let size = 0;

  for await (const chunk of request as AsyncIterable<Buffer | string>) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    size += buffer.byteLength;

    if (size > 1_000_000) {
      throw new Error('Request body is too large.');
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}
