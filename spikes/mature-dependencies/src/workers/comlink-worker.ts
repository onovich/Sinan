import * as Comlink from "comlink";

export interface ByteSummary {
  byteLength: number;
  checksum: number;
}

export const workerApi = {
  summarizeBytes(bytes: Uint8Array): ByteSummary {
    return {
      byteLength: bytes.byteLength,
      checksum: bytes.reduce((sum, value) => sum + value, 0)
    };
  },

  failWithDiagnostic(): never {
    throw new Error("sinan-worker-spike-failure");
  }
};

Comlink.expose(workerApi);

export type ComlinkWorkerApi = typeof workerApi;
