import * as Comlink from "comlink";
import type { ComlinkWorkerApi } from "./comlink-worker";

export interface ComlinkSmokeResult {
  supported: boolean;
  rpcOk: boolean;
  transferableAttempted: boolean;
  transferableDetached: boolean;
  structuredDiagnostic: string | null;
  terminated: boolean;
  adapterBoundary: string;
}

export function summarizeWorkerFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runComlinkBrowserSmoke(): Promise<ComlinkSmokeResult> {
  if (typeof Worker === "undefined") {
    return {
      supported: false,
      rpcOk: false,
      transferableAttempted: false,
      transferableDetached: false,
      structuredDiagnostic: "Worker is not available in this environment.",
      terminated: false,
      adapterBoundary: "Sinan WorkerTaskAdapter contract -> Comlink RPC -> Web Worker"
    };
  }

  const worker = new Worker(new URL("./comlink-worker.ts", import.meta.url), { type: "module" });
  const remote = Comlink.wrap<ComlinkWorkerApi>(worker);
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const transferable = bytes.buffer as ArrayBuffer;
  let structuredDiagnostic: string | null = null;

  try {
    const summary = await remote.summarizeBytes(Comlink.transfer(bytes, [transferable]));
    try {
      await remote.failWithDiagnostic();
    } catch (error) {
      structuredDiagnostic = summarizeWorkerFailure(error);
    }

    remote[Comlink.releaseProxy]();
    worker.terminate();

    return {
      supported: true,
      rpcOk: summary.byteLength === 4 && summary.checksum === 10,
      transferableAttempted: true,
      transferableDetached: transferable.byteLength === 0,
      structuredDiagnostic,
      terminated: true,
      adapterBoundary: "Sinan WorkerTaskAdapter contract -> Comlink RPC -> Web Worker"
    };
  } catch (error) {
    worker.terminate();
    return {
      supported: true,
      rpcOk: false,
      transferableAttempted: true,
      transferableDetached: transferable.byteLength === 0,
      structuredDiagnostic: summarizeWorkerFailure(error),
      terminated: true,
      adapterBoundary: "Sinan WorkerTaskAdapter contract -> Comlink RPC -> Web Worker"
    };
  }
}
