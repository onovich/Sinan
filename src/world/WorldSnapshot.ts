import type { TransformData } from '../schemas/transform.schema';

export interface WorldEntitySnapshot {
  componentTypes: string[];
  id: string;
  name?: string;
  prefab?: string;
  transform: TransformData;
}

export interface WorldSnapshot {
  entityCount: number;
  entities: WorldEntitySnapshot[];
  levelId: string;
}
