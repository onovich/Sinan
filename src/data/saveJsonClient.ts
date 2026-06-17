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
    throw new Error(await response.text());
  }
}
