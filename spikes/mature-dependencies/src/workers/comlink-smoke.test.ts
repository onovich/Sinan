import * as Comlink from "comlink";
import nodeEndpoint, { type NodeEndpoint } from "comlink/dist/esm/node-adapter.mjs";
import { Worker } from "node:worker_threads";
import { describe, expect, test } from "vitest";
import { summarizeWorkerFailure } from "./comlink-smoke";

describe("Comlink worker smoke", () => {
  test("supports RPC, transferable buffers, structured errors, and termination in Node worker_threads", async () => {
    const worker = new Worker(
      `
        const { parentPort } = require("node:worker_threads");
        Promise.all([
          import("comlink"),
          import("comlink/dist/esm/node-adapter.mjs")
        ]).then(([Comlink, nodeAdapter]) => {
          const api = {
            summarizeBytes(bytes) {
              return {
                byteLength: bytes.byteLength,
                checksum: Array.from(bytes).reduce((sum, value) => sum + value, 0)
              };
            },
            failWithDiagnostic() {
              throw new Error("sinan-worker-spike-failure");
            }
          };
          Comlink.expose(api, nodeAdapter.default(parentPort));
        });
      `,
      { eval: true }
    );

    const remote = Comlink.wrap<{
      summarizeBytes(bytes: Uint8Array): Promise<{ byteLength: number; checksum: number }>;
      failWithDiagnostic(): Promise<void>;
    }>(nodeEndpoint(worker as unknown as NodeEndpoint));

    const bytes = new Uint8Array([1, 2, 3, 4]);
    const transferable = bytes.buffer as ArrayBuffer;
    const summary = await remote.summarizeBytes(Comlink.transfer(bytes, [transferable]));
    let diagnostic = "";

    try {
      await remote.failWithDiagnostic();
    } catch (error) {
      diagnostic = summarizeWorkerFailure(error);
    }

    remote[Comlink.releaseProxy]();
    await worker.terminate();

    expect(summary).toEqual({ byteLength: 4, checksum: 10 });
    expect(transferable.byteLength).toBe(0);
    expect(diagnostic).toContain("sinan-worker-spike-failure");
  });
});
