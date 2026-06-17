export type Vec3 = readonly [number, number, number];
export type Quat = readonly [number, number, number, number];

export interface RuntimeTransform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export interface RuntimeSize {
  width: number;
  height: number;
  pixelRatio?: number;
}

export interface RuntimeInitOptions extends RuntimeSize {
  canvas: HTMLCanvasElement;
}

export interface PickResult {
  entityId: string;
  point: Vec3;
  normal?: Vec3;
}
