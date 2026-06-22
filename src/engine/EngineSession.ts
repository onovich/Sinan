import type { ProjectData } from '../data/DataRepository';
import {
  getRenderableMaterials,
  getRenderableModelAssetId,
  getRenderableRenderStyle,
} from '../data/projectDataSelectors';
import {
  createDefaultShaderGlobals,
  normalizeShaderGlobals,
  type ShaderGlobals,
  type ShaderGlobalsInput,
} from '../runtime/materials';
import type {
  RuntimeDebugAabb,
  RuntimeLodGroup,
  RuntimeMaterialParameterUpdate,
  RuntimePalette,
  RuntimeRenderEnvironmentStyle,
  RuntimeRenderStyle,
  RuntimeScatterGroup,
  RuntimeSize,
  RuntimeStyleQualityProfile,
} from '../runtime/RuntimeTypes';
import type { WebRuntime } from '../runtime/WebRuntime';
import {
  AabbColliderComponentSchema,
  TriggerZoneComponentSchema,
} from '../schemas/collider.schema';
import type { EntityData } from '../schemas/entity.schema';
import { World } from '../world';
import { EngineLoop, type EngineFrameScheduler } from './EngineLoop';
import type { EngineMode } from './EngineMode';

export type EngineSessionStatus = 'idle' | 'loading' | 'loaded' | 'disposed';

export interface EngineSessionOptions {
  maxFrameDeltaSeconds?: number;
  mode?: EngineMode;
  runtime: WebRuntime;
  styleQualityProfile?: RuntimeStyleQualityProfile;
}

export interface EngineProjectLoadOptions {
  isCancelled?: () => boolean;
  styleQualityProfile?: RuntimeStyleQualityProfile;
}

export class EngineSession {
  private readonly loop: EngineLoop;
  private currentProject: ProjectData | undefined;
  private loadedEntityIds = new Set<string>();
  private loadRevision = 0;
  private shaderGlobals: ShaderGlobals = createDefaultShaderGlobals();
  private status: EngineSessionStatus = 'idle';
  private triggerDebugVisible = false;
  private world: World | undefined;

  constructor(private readonly options: EngineSessionOptions) {
    this.loop = new EngineLoop(
      {
        update: ({ deltaSeconds, elapsedSeconds }) => {
          this.syncShaderGlobals({ deltaSeconds, elapsedSeconds });
          this.options.runtime.update(deltaSeconds);
        },
        render: () => {
          this.options.runtime.render();
        },
      },
      options.mode ?? 'edit',
      { maxDeltaSeconds: options.maxFrameDeltaSeconds },
    );
  }

  dispose(): void {
    if (this.status === 'disposed') {
      return;
    }

    this.loop.dispose();
    this.options.runtime.dispose();
    this.currentProject = undefined;
    this.loadedEntityIds.clear();
    this.loadRevision += 1;
    this.world = undefined;
    this.status = 'disposed';
  }

  getMode(): EngineMode {
    return this.loop.getMode();
  }

  getStatus(): EngineSessionStatus {
    return this.status;
  }

  getWorld(): World | undefined {
    return this.world;
  }

  async loadProject(
    project: ProjectData,
    loadOptions: EngineProjectLoadOptions = {},
  ): Promise<World | undefined> {
    this.ensureActive();
    const revision = this.loadRevision + 1;
    this.loadRevision = revision;
    this.currentProject = project;
    this.status = 'loading';
    this.world = World.fromLevel(project.level);
    this.options.runtime.setStyleQualityProfile?.(
      loadOptions.styleQualityProfile ?? this.options.styleQualityProfile ?? 'standard',
    );
    this.options.runtime.setStyleResources?.(toRuntimeStyleResources(project));
    this.options.runtime.setRenderEnvironment?.(
      toRuntimeRenderEnvironment(project.level.environment),
    );

    await Promise.all(
      Object.entries(project.assets.assets)
        .filter(([, asset]) => asset.type === 'model')
        .map(([assetId, asset]) => this.options.runtime.loadModel(assetId, asset.url)),
    );

    if (this.isLoadCancelled(revision, loadOptions)) {
      return undefined;
    }

    const nextEntityIds = new Set(project.level.entities.map((entity) => entity.id));
    for (const entityId of this.loadedEntityIds) {
      if (!nextEntityIds.has(entityId)) {
        this.options.runtime.destroyObject(entityId);
        this.options.runtime.setDebugAabb(entityId, undefined);
      }
    }

    for (const entity of project.level.entities) {
      if (this.isLoadCancelled(revision, loadOptions)) {
        return undefined;
      }

      const modelAssetId = getRenderableModelAssetId(project, entity);

      if (modelAssetId) {
        this.options.runtime.instantiateModel(modelAssetId, entity.id);
      } else {
        this.options.runtime.createEmpty(entity.id);
      }

      this.options.runtime.setTransform(entity.id, entity.transform);
      this.options.runtime.setRenderStyle?.(
        entity.id,
        toRuntimeRenderStyle(getRenderableRenderStyle(project, entity)),
      );
      this.options.runtime.setRenderableMaterials?.(
        entity.id,
        getRenderableMaterials(project, entity),
      );
      this.options.runtime.setEntityLodGroup?.(
        entity.id,
        modelAssetId ? toRuntimeLodGroup(project, modelAssetId) : undefined,
      );
    }

    this.options.runtime.setScatterGroups?.(toRuntimeScatterGroups(project.level.scatterGroups));
    this.options.runtime.setSphericalPlacements?.(this.world.getSphericalPlacements());
    this.loadedEntityIds = nextEntityIds;
    this.syncTriggerDebug();
    this.status = 'loaded';

    return this.world;
  }

  resize(size: RuntimeSize): void {
    this.ensureActive();
    this.options.runtime.resize(size);
    this.syncShaderGlobals({
      viewportSize: [Math.max(1, Math.floor(size.width)), Math.max(1, Math.floor(size.height))],
    });
  }

  setMode(mode: EngineMode): void {
    this.ensureActive();
    this.loop.setMode(mode);
  }

  setSelectedEntity(entityId: string | undefined): void {
    this.ensureActive();
    this.options.runtime.setSelectedEntity?.(entityId);
  }

  setMaterialParameter(update: RuntimeMaterialParameterUpdate): void {
    this.ensureActive();
    this.options.runtime.setMaterialParameter?.(update);
  }

  setTriggerDebugVisible(visible: boolean): void {
    this.ensureActive();
    this.triggerDebugVisible = visible;
    this.syncTriggerDebug();
  }

  startLoop(scheduler: EngineFrameScheduler): void {
    this.ensureActive();
    this.loop.start(scheduler, {
      maxDeltaSeconds: this.options.maxFrameDeltaSeconds,
    });
  }

  step(deltaSeconds: number): void {
    this.ensureActive();
    this.loop.step(deltaSeconds);
  }

  stopLoop(): void {
    this.loop.stop();
  }

  private isLoadCancelled(revision: number, loadOptions: EngineProjectLoadOptions): boolean {
    return (
      this.status === 'disposed' ||
      revision !== this.loadRevision ||
      loadOptions.isCancelled?.() === true
    );
  }

  private syncTriggerDebug(): void {
    if (!this.currentProject) {
      return;
    }

    for (const entity of this.currentProject.level.entities) {
      this.options.runtime.setDebugAabb(
        entity.id,
        this.triggerDebugVisible ? createTriggerDebugAabb(entity) : undefined,
      );
    }
  }

  private syncShaderGlobals(input: ShaderGlobalsInput): void {
    this.shaderGlobals = normalizeShaderGlobals(input, this.shaderGlobals, {
      maxDeltaSeconds: this.options.maxFrameDeltaSeconds ?? 0.05,
    });
    this.options.runtime.setShaderGlobals?.(this.shaderGlobals);
  }

  private ensureActive(): void {
    if (this.status === 'disposed') {
      throw new Error('EngineSession has been disposed.');
    }
  }
}

function createTriggerDebugAabb(entity: EntityData): RuntimeDebugAabb | undefined {
  const colliderResult = AabbColliderComponentSchema.safeParse(entity.components.Collider);

  if (!colliderResult.success) {
    return undefined;
  }

  const triggerZoneResult = TriggerZoneComponentSchema.safeParse(entity.components.TriggerZone);
  const isTrigger =
    colliderResult.data.isTrigger === true ||
    (triggerZoneResult.success && triggerZoneResult.data.enabled !== false);

  if (!isTrigger) {
    return undefined;
  }

  const { center, size, debugColor } = colliderResult.data;
  const { position, scale } = entity.transform;

  return {
    center: [
      position[0] + center[0] * scale[0],
      position[1] + center[1] * scale[1],
      position[2] + center[2] * scale[2],
    ],
    size: [
      Math.abs(size[0] * scale[0]),
      Math.abs(size[1] * scale[1]),
      Math.abs(size[2] * scale[2]),
    ],
    color: debugColor,
    visible: true,
  };
}

function toRuntimeStyleResources(project: ProjectData): {
  palettes: Record<string, RuntimePalette>;
} {
  return {
    palettes: Object.fromEntries(
      Object.entries(project.palettes).map(([paletteId, palette]) => [
        paletteId,
        {
          id: palette.id,
          tones: palette.tones,
        },
      ]),
    ),
  };
}

function toRuntimeRenderStyle(
  style: RuntimeRenderStyle | undefined,
): RuntimeRenderStyle | undefined {
  return style;
}

function toRuntimeRenderEnvironment(
  environment: ProjectData['level']['environment'],
): RuntimeRenderEnvironmentStyle | undefined {
  if (!environment) {
    return undefined;
  }

  return {
    background: environment.background,
    ambientLight: environment.ambientLight,
    fog: environment.fog,
    colorGrade: environment.colorGrade,
  };
}

function toRuntimeLodGroup(
  project: ProjectData,
  modelAssetId: string,
): RuntimeLodGroup | undefined {
  const groupId = project.assets.assets[modelAssetId]?.metadata?.lodGroup;
  const group = groupId ? project.assets.lodGroups?.[groupId] : undefined;

  if (!group) {
    return undefined;
  }

  return {
    strategy: group.strategy,
    hysteresis: group.hysteresis,
    lowEndBias: group.lowEndBias,
    fallbackAsset: group.fallbackAsset,
    levels: group.levels.map((level) => ({
      level: level.level,
      asset: level.asset,
      minDistance: level.minDistance,
    })),
  };
}

function toRuntimeScatterGroups(
  scatterGroups: ProjectData['level']['scatterGroups'],
): RuntimeScatterGroup[] {
  return (scatterGroups ?? []).map((group) => ({
    id: group.id,
    source: group.source,
    count: group.count,
    seed: group.seed,
    placement: group.placement,
    alignment: group.alignment,
    transform: group.transform,
    quality: group.quality,
    fallback: group.fallback,
  }));
}
