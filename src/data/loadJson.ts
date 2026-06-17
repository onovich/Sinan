import { z } from 'zod';

export interface ProjectJsonLoader {
  loadJson(path: string): Promise<unknown>;
}

export class FetchJsonLoader implements ProjectJsonLoader {
  async loadJson(path: string): Promise<unknown> {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Failed to load JSON from ${path}: HTTP ${response.status}`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to parse JSON from ${path}: ${formatUnknownError(error)}`);
    }
  }
}

export class DataValidationError extends Error {
  constructor(
    readonly path: string,
    readonly issues: readonly z.core.$ZodIssue[],
  ) {
    super(`Invalid data in ${path}:\n${formatIssues(issues)}`);
    this.name = 'DataValidationError';
  }
}

export async function loadAndParseJson<T>(
  loader: ProjectJsonLoader,
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const raw = await loader.loadJson(path);
  const result = schema.safeParse(raw);

  if (!result.success) {
    throw new DataValidationError(path, result.error.issues);
  }

  return result.data;
}

function formatIssues(issues: readonly z.core.$ZodIssue[]): string {
  return issues.map((issue) => `- ${formatIssuePath(issue.path)}: ${issue.message}`).join('\n');
}

function formatIssuePath(path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return '<root>';
  }

  return path.map(String).join('.');
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
