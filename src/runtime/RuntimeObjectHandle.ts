export type RuntimeObjectId = string;

export interface RuntimeObjectHandle {
  entityId: string;
  runtimeObjectId: RuntimeObjectId;
}

export interface ModelHandle {
  assetId: string;
}
