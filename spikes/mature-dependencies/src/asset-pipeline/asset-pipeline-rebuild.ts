import { createAssetPipelineDiagnostic, type AssetBuildReport, type AssetPipelineDiagnostic } from "./asset-pipeline-types";

function firstArtifactHash(report: AssetBuildReport): string | undefined {
  return report.manifestPatch.entries.find((entry) => entry.artifactHash)?.artifactHash;
}

export function compareAssetBuildReproducibility(previous: AssetBuildReport, next: AssetBuildReport): AssetPipelineDiagnostic[] {
  const diagnostics: AssetPipelineDiagnostic[] = [];
  const sameSource = previous.sourceHash === next.sourceHash;
  const sameProfile = previous.profileHash === next.profileHash;
  const previousArtifactHash = firstArtifactHash(previous);
  const nextArtifactHash = firstArtifactHash(next);

  if (!sameSource || !sameProfile) {
    diagnostics.push(
      createAssetPipelineDiagnostic("stale-source", "Asset source or profile changed; generated artifact was rebuilt.", "warning", true, {
        sourceChanged: !sameSource,
        profileChanged: !sameProfile
      })
    );
    return diagnostics;
  }

  if (previousArtifactHash && nextArtifactHash && previousArtifactHash !== nextArtifactHash) {
    diagnostics.push(
      createAssetPipelineDiagnostic("non-reproducible", "Generated artifact hash changed for identical source and profile.", "error", false, {
        previousArtifactHash,
        nextArtifactHash
      })
    );
  }

  return diagnostics;
}
