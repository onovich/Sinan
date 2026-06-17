import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Vec3 = readonly [number, number, number];
type Quat = readonly [number, number, number, number];
type Rgba = readonly [number, number, number, number];

interface AssetSpec {
  relativePath: string;
  nodeName: string;
  bounds: {
    min: Vec3;
    max: Vec3;
  };
  color: Rgba;
  animation?: {
    name: string;
    times: readonly number[];
    rotations: readonly Quat[];
  };
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const assets: AssetSpec[] = [
  {
    relativePath: 'public/models/room_blockout.glb',
    nodeName: 'RoomBlockout',
    bounds: {
      min: [-5, -0.04, -5],
      max: [5, 0.04, 5],
    },
    color: [0.16, 0.21, 0.24, 1],
  },
  {
    relativePath: 'public/models/props/switch_wall.glb',
    nodeName: 'SwitchWall',
    bounds: {
      min: [-0.24, -0.24, -0.1],
      max: [0.24, 0.24, 0.1],
    },
    color: [0.34, 0.65, 0.84, 1],
  },
  {
    relativePath: 'public/models/props/door_wood.glb',
    nodeName: 'DoorWood',
    bounds: {
      min: [0, 0, -0.14],
      max: [1.2, 2.2, 0.14],
    },
    color: [0.63, 0.45, 0.27, 1],
    animation: {
      name: 'Open',
      times: [0, 1.6],
      rotations: [yRotation(0), yRotation((95 * Math.PI) / 180)],
    },
  },
  {
    relativePath: 'public/models/markers/player_spawn.glb',
    nodeName: 'PlayerSpawnMarker',
    bounds: {
      min: [-0.28, 0, -0.28],
      max: [0.28, 0.85, 0.28],
    },
    color: [0.46, 0.7, 0.54, 1],
  },
];

async function main(): Promise<void> {
  for (const asset of assets) {
    const absolutePath = path.join(repoRoot, asset.relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, createGlb(asset));
    console.log(`Wrote ${asset.relativePath}`);
  }
}

function createGlb(asset: AssetSpec): Buffer {
  const geometry = createBoxGeometry(asset.bounds.min, asset.bounds.max);
  const bufferViews: unknown[] = [];
  const accessors: unknown[] = [];
  const binaryParts: Buffer[] = [];
  let binaryLength = 0;

  const addBufferView = (buffer: Buffer, target?: number): number => {
    const padding = paddingFor(binaryLength);
    if (padding > 0) {
      binaryParts.push(Buffer.alloc(padding));
      binaryLength += padding;
    }

    const bufferView = {
      buffer: 0,
      byteOffset: binaryLength,
      byteLength: buffer.byteLength,
      ...(target ? { target } : {}),
    };
    const index = bufferViews.length;
    bufferViews.push(bufferView);
    binaryParts.push(buffer);
    binaryLength += buffer.byteLength;

    return index;
  };

  const addAccessor = (input: {
    buffer: Buffer;
    componentType: number;
    count: number;
    type: string;
    target?: number;
    min?: readonly number[];
    max?: readonly number[];
  }): number => {
    const bufferView = addBufferView(input.buffer, input.target);
    const index = accessors.length;
    accessors.push({
      bufferView,
      componentType: input.componentType,
      count: input.count,
      type: input.type,
      ...(input.min ? { min: input.min } : {}),
      ...(input.max ? { max: input.max } : {}),
    });

    return index;
  };

  const positionAccessor = addAccessor({
    buffer: floatBuffer(geometry.positions),
    componentType: 5126,
    count: geometry.positions.length / 3,
    type: 'VEC3',
    target: 34962,
    min: [...asset.bounds.min],
    max: [...asset.bounds.max],
  });
  const normalAccessor = addAccessor({
    buffer: floatBuffer(geometry.normals),
    componentType: 5126,
    count: geometry.normals.length / 3,
    type: 'VEC3',
    target: 34962,
  });
  const indexAccessor = addAccessor({
    buffer: uint16Buffer(geometry.indices),
    componentType: 5123,
    count: geometry.indices.length,
    type: 'SCALAR',
    target: 34963,
  });

  const animations: unknown[] = [];
  if (asset.animation) {
    const timeAccessor = addAccessor({
      buffer: floatBuffer(asset.animation.times),
      componentType: 5126,
      count: asset.animation.times.length,
      type: 'SCALAR',
      min: [Math.min(...asset.animation.times)],
      max: [Math.max(...asset.animation.times)],
    });
    const rotationAccessor = addAccessor({
      buffer: floatBuffer(asset.animation.rotations.flatMap((rotation) => [...rotation])),
      componentType: 5126,
      count: asset.animation.rotations.length,
      type: 'VEC4',
    });

    animations.push({
      name: asset.animation.name,
      samplers: [
        {
          input: timeAccessor,
          output: rotationAccessor,
          interpolation: 'LINEAR',
        },
      ],
      channels: [
        {
          sampler: 0,
          target: {
            node: 0,
            path: 'rotation',
          },
        },
      ],
    });
  }

  const binChunk = Buffer.concat(binaryParts);
  const json = {
    asset: {
      version: '2.0',
      generator: 'Sinan development GLB generator',
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      {
        name: asset.nodeName,
        mesh: 0,
      },
    ],
    meshes: [
      {
        name: `${asset.nodeName}Mesh`,
        primitives: [
          {
            attributes: {
              POSITION: positionAccessor,
              NORMAL: normalAccessor,
            },
            indices: indexAccessor,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: `${asset.nodeName}Material`,
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: [...asset.color],
          roughnessFactor: 0.55,
          metallicFactor: 0.04,
        },
      },
    ],
    buffers: [{ byteLength: binChunk.byteLength }],
    bufferViews,
    accessors,
    ...(animations.length > 0 ? { animations } : {}),
  };

  return writeGlb(json, binChunk);
}

function createBoxGeometry(
  min: Vec3,
  max: Vec3,
): {
  positions: number[];
  normals: number[];
  indices: number[];
} {
  const [minX, minY, minZ] = min;
  const [maxX, maxY, maxZ] = max;
  const faces = [
    {
      normal: [1, 0, 0],
      corners: [
        [maxX, minY, minZ],
        [maxX, maxY, minZ],
        [maxX, maxY, maxZ],
        [maxX, minY, maxZ],
      ],
    },
    {
      normal: [-1, 0, 0],
      corners: [
        [minX, minY, maxZ],
        [minX, maxY, maxZ],
        [minX, maxY, minZ],
        [minX, minY, minZ],
      ],
    },
    {
      normal: [0, 1, 0],
      corners: [
        [minX, maxY, minZ],
        [minX, maxY, maxZ],
        [maxX, maxY, maxZ],
        [maxX, maxY, minZ],
      ],
    },
    {
      normal: [0, -1, 0],
      corners: [
        [minX, minY, maxZ],
        [minX, minY, minZ],
        [maxX, minY, minZ],
        [maxX, minY, maxZ],
      ],
    },
    {
      normal: [0, 0, 1],
      corners: [
        [maxX, minY, maxZ],
        [maxX, maxY, maxZ],
        [minX, maxY, maxZ],
        [minX, minY, maxZ],
      ],
    },
    {
      normal: [0, 0, -1],
      corners: [
        [minX, minY, minZ],
        [minX, maxY, minZ],
        [maxX, maxY, minZ],
        [maxX, minY, minZ],
      ],
    },
  ];
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (const face of faces) {
    const offset = positions.length / 3;
    for (const corner of face.corners) {
      positions.push(...corner);
      normals.push(...face.normal);
    }
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
  }

  return { positions, normals, indices };
}

function writeGlb(json: unknown, binChunk: Buffer): Buffer {
  const jsonBuffer = paddedBuffer(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
  const binaryBuffer = paddedBuffer(binChunk, 0x00);
  const totalLength = 12 + 8 + jsonBuffer.byteLength + 8 + binaryBuffer.byteLength;
  const output = Buffer.alloc(totalLength);
  let offset = 0;

  output.writeUInt32LE(0x46546c67, offset);
  offset += 4;
  output.writeUInt32LE(2, offset);
  offset += 4;
  output.writeUInt32LE(totalLength, offset);
  offset += 4;
  output.writeUInt32LE(jsonBuffer.byteLength, offset);
  offset += 4;
  output.writeUInt32LE(0x4e4f534a, offset);
  offset += 4;
  jsonBuffer.copy(output, offset);
  offset += jsonBuffer.byteLength;
  output.writeUInt32LE(binaryBuffer.byteLength, offset);
  offset += 4;
  output.writeUInt32LE(0x004e4942, offset);
  offset += 4;
  binaryBuffer.copy(output, offset);

  return output;
}

function floatBuffer(values: readonly number[]): Buffer {
  return Buffer.from(new Float32Array(values).buffer);
}

function uint16Buffer(values: readonly number[]): Buffer {
  return Buffer.from(new Uint16Array(values).buffer);
}

function paddedBuffer(buffer: Buffer, paddingByte: number): Buffer {
  const padding = paddingFor(buffer.byteLength);

  if (padding === 0) {
    return buffer;
  }

  return Buffer.concat([buffer, Buffer.alloc(padding, paddingByte)]);
}

function paddingFor(length: number): number {
  return (4 - (length % 4)) % 4;
}

function yRotation(radians: number): Quat {
  return [0, Math.sin(radians / 2), 0, Math.cos(radians / 2)];
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
