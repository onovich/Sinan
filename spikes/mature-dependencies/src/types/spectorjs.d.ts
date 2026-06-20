declare module "spectorjs" {
  const moduleValue: unknown;
  export default moduleValue;
}

declare module "fake-indexeddb/auto" {}

declare module "comlink/dist/esm/node-adapter.mjs" {
  import type { Endpoint } from "comlink";

  export interface NodeEndpoint {
    postMessage(message: unknown, transfer?: unknown[]): void;
    on(type: string, listener: (...args: unknown[]) => void): void;
    off(type: string, listener: (...args: unknown[]) => void): void;
    start?: () => void;
  }

  export default function nodeEndpoint(endpoint: NodeEndpoint): Endpoint;
}
