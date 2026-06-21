export const browserSmokeStatuses = [
  "PASS",
  "POLICY-SKIP",
  "ENVIRONMENT-BLOCKED",
  "BUNDLE-BLOCKED",
  "CANDIDATE-BLOCKED",
  "CONTRACT-BLOCKED"
] as const;

export type BrowserSmokeStatus = (typeof browserSmokeStatuses)[number];

export type BrowserSmokeLayer = "environment" | "bundle" | "candidate" | "contract" | "policy";

export interface BrowserSmokeResult {
  candidate: string;
  status: BrowserSmokeStatus;
  decision: BrowserSmokeStatus;
  layer: BrowserSmokeLayer;
  browser: string;
  port: number;
  durationMs: number;
  command: string;
  consoleErrors: string[];
  artifacts: string[];
  diagnostics: string[];
  timestamp: string;
}

export const browserSmokeArtifactPolicy = {
  commit: ["small JSON summaries", "Markdown reports", "test source", "Playwright config"],
  doNotCommit: ["browser binaries", "cache folders", "traces", "videos", "screenshots", "dist", "coverage", "node_modules"]
} as const;

export function isBrowserSmokeStatus(value: string): value is BrowserSmokeStatus {
  return browserSmokeStatuses.includes(value as BrowserSmokeStatus);
}
