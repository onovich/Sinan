export const SAVE_JSON_ENDPOINT = '/__sinan/save-json';

export async function saveJson(path: string, data: unknown): Promise<void> {
  const response = await fetch(SAVE_JSON_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ path, data }),
  });

  if (!response.ok) {
    throw new Error(await readSaveError(response));
  }
}

async function readSaveError(response: Response): Promise<string> {
  const text = await response.text();

  try {
    const parsed = JSON.parse(text) as { error?: unknown };

    if (typeof parsed.error === 'string') {
      return parsed.error;
    }
  } catch {
    // Fall back to the raw response body below.
  }

  return text || `Save request failed with HTTP ${response.status}.`;
}
