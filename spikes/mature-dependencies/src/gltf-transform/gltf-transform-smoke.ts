import { NodeIO } from "@gltf-transform/core";
import { inspect, prune, reorder } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface GltfTransformSmokeResult {
  fixturePath: string;
  reportPath: string;
  meshoptReady: boolean;
  glbBytes: number;
  sceneCount: number;
  meshCount: number;
  materialCount: number;
  deterministicReportKeys: string[];
  adapterBoundary: string;
}

export async function runGltfTransformSmoke(
  fixturePath = fileURLToPath(new URL("../../fixtures/minimal-triangle.gltf", import.meta.url)),
  reportPath = fileURLToPath(new URL("../../reports/gltf-transform-report.json", import.meta.url))
): Promise<GltfTransformSmokeResult> {
  const io = new NodeIO();
  const document = await io.read(fixturePath);
  const before = inspect(document);

  await MeshoptEncoder.ready;
  await document.transform(reorder({ encoder: MeshoptEncoder }), prune());

  const after = inspect(document);
  const glb = await io.writeBinary(document);
  const roundTrip = await io.readBinary(glb);
  const roundTripReport = inspect(roundTrip);

  const result: GltfTransformSmokeResult = {
    fixturePath,
    reportPath,
    meshoptReady: true,
    glbBytes: glb.byteLength,
    sceneCount: roundTripReport.scenes.properties.length,
    meshCount: roundTripReport.meshes.properties.length,
    materialCount: roundTripReport.materials.properties.length,
    deterministicReportKeys: Object.keys(roundTripReport).sort(),
    adapterBoundary:
      "Sinan asset manifest/build profile -> offline adapter -> glTF Transform and meshoptimizer"
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        before,
        after,
        roundTrip: roundTripReport,
        summary: result
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  return result;
}
