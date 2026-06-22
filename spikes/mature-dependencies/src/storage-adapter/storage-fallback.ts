import { MemoryStorageAdapter } from "./memory-storage-adapter";
import type { StorageAdapter, StorageDiagnostic, StorageResult } from "./storage-types";

export interface StorageFallbackOpenResult {
  adapter: StorageAdapter;
  result: StorageResult;
  usedFallback: boolean;
  primaryResult: StorageResult;
  fallbackResult?: StorageResult;
}

export async function openStorageAdapterWithVolatileFallback(primary: StorageAdapter): Promise<StorageFallbackOpenResult> {
  const primaryResult = await primary.open();
  if (primaryResult.ok) {
    return {
      adapter: primary,
      result: primaryResult,
      usedFallback: false,
      primaryResult
    };
  }

  const fallback = new MemoryStorageAdapter(primary.config, {
    volatile: true,
    fallbackReason: "Primary storage adapter unavailable; using volatile in-memory fallback."
  });
  const fallbackResult = await fallback.open();
  const diagnostics: StorageDiagnostic[] = [
    ...primaryResult.diagnostics,
    ...fallbackResult.diagnostics,
    {
      code: "volatile-fallback",
      severity: "warning",
      message: "Primary storage adapter unavailable; writes are volatile until durable storage is restored.",
      retryable: true
    }
  ];

  return {
    adapter: fallback,
    result: {
      status: "fallback",
      ok: fallbackResult.ok,
      diagnostics,
      volatile: true
    },
    usedFallback: true,
    primaryResult,
    fallbackResult
  };
}
