import { describe, expect, it } from 'vitest';

import type { ProjectData } from '../data/DataRepository';
import type { SocialRuntimeSnapshot } from '../game/social';
import type {
  RuntimeDebugAabb,
  RuntimeDeliveryRouteFeedbackState,
  RuntimeLodGroup,
  RuntimeRenderStyle,
  RuntimeRenderableMaterialSlots,
  RuntimeScatterGroup,
  RuntimeShaderGlobals,
  RuntimeSize,
  RuntimeSocialState,
  RuntimeSphericalPlacementDiagnostics,
  RuntimeStyleQualityProfile,
  RuntimeStyleResources,
} from '../runtime/RuntimeTypes';
import type { WebRuntime } from '../runtime/WebRuntime';
import type { TransformData } from '../schemas/transform.schema';
import { EngineSession } from './EngineSession';

const transform: TransformData = {
  position: [1, 2, 3],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('EngineSession', () => {
  it('loads project data into world and synchronizes runtime objects', async () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      runtime: createRuntimeProbe(calls),
      styleQualityProfile: 'low-end',
    });

    const world = await session.loadProject(createProject());

    expect(session.getStatus()).toBe('loaded');
    expect(session.getWorld()).toBe(world);
    expect(world?.snapshot()).toMatchObject({
      entityCount: 1,
      levelId: 'level_01',
    });
    expect(calls).toEqual([
      { type: 'styleQuality', profile: 'low-end' },
      {
        type: 'styleResources',
        resources: {
          palettes: {
            world_01: {
              id: 'world_01',
              tones: {
                accent: '#5aa7d6',
                base: '#76b28b',
              },
            },
          },
        },
      },
      {
        type: 'environment',
        environment: {
          ambientLight: 0.35,
          background: '#111111',
        },
      },
      { type: 'loadModel', assetId: 'model.switch_wall', url: '/models/props/switch_wall.glb' },
      { type: 'instantiateModel', assetId: 'model.switch_wall', entityId: 'switch_a' },
      { type: 'setTransform', entityId: 'switch_a', transform },
      {
        type: 'setRenderStyle',
        entityId: 'switch_a',
        style: {
          highlight: 'selected',
          outline: 'interactable',
          palette: 'world_01',
          profile: 'palette-toon',
          tone: 'accent',
        },
      },
      {
        type: 'setRenderableMaterials',
        entityId: 'switch_a',
        materials: {
          main: {
            materialId: 'debug.uv-gradient',
            parameters: {
              strength: 0.5,
            },
          },
        },
      },
      { type: 'setDebugAabb', entityId: 'switch_a', bounds: undefined },
    ]);
  });

  it('delegates frame update, render, resize, selection, and disposal', () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      mode: 'play',
      runtime: createRuntimeProbe(calls),
    });

    session.step(0.05);
    session.resize({ height: 600, pixelRatio: 2, width: 800 });
    session.setSelectedEntity('switch_a');
    session.dispose();
    session.dispose();

    expect(calls).toEqual([
      { type: 'update', deltaSeconds: 0.05 },
      { type: 'render' },
      { type: 'resize', size: { height: 600, pixelRatio: 2, width: 800 } },
      { type: 'setSelectedEntity', entityId: 'switch_a' },
      { type: 'dispose' },
    ]);
    expect(session.getMode()).toBe('play');
    expect(session.getStatus()).toBe('disposed');
    expect(() => session.step(0.016)).toThrow('EngineSession has been disposed.');
  });

  it('delegates material parameter updates through the runtime', () => {
    const calls: unknown[] = [];
    const session = new EngineSession({ runtime: createRuntimeProbe(calls) });

    session.setMaterialParameter({
      entityId: 'gate_a',
      slot: 'main',
      parameter: 'progress',
      value: 0.5,
    });

    expect(calls).toEqual([
      {
        type: 'setMaterialParameter',
        update: {
          entityId: 'gate_a',
          slot: 'main',
          parameter: 'progress',
          value: 0.5,
        },
      },
    ]);
  });

  it('routes shader globals from frame steps and resize through the runtime', () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      maxFrameDeltaSeconds: 0.1,
      runtime: createRuntimeProbe(calls, { recordShaderGlobals: true }),
    });

    session.resize({ height: 600, pixelRatio: 2, width: 800 });
    session.step(0.016);
    session.step(0.25);

    expect(calls[0]).toEqual({
      type: 'resize',
      size: { height: 600, pixelRatio: 2, width: 800 },
    });
    expect(calls[1]).toEqual({
      type: 'setShaderGlobals',
      globals: {
        elapsedSeconds: 0,
        deltaSeconds: 0,
        viewportSize: [800, 600],
      },
    });
    expect(calls[2]).toEqual({
      type: 'setShaderGlobals',
      globals: {
        elapsedSeconds: 0.016,
        deltaSeconds: 0.016,
        viewportSize: [800, 600],
      },
    });
    expect(calls[3]).toEqual({ type: 'update', deltaSeconds: 0.016 });
    expect(calls[4]).toEqual({ type: 'render' });
    expect(calls[5]).toMatchObject({
      type: 'setShaderGlobals',
      globals: {
        deltaSeconds: 0.1,
        viewportSize: [800, 600],
      },
    });
    expect((calls[5] as { globals: RuntimeShaderGlobals }).globals.elapsedSeconds).toBeCloseTo(
      0.116,
    );
    expect(calls[6]).toEqual({ type: 'update', deltaSeconds: 0.1 });
    expect(calls[7]).toEqual({ type: 'render' });
  });

  it('syncs trigger debug helpers from renderer-neutral collider data', async () => {
    const calls: unknown[] = [];
    const session = new EngineSession({ runtime: createRuntimeProbe(calls) });

    await session.loadProject(createProject());
    session.setTriggerDebugVisible(true);

    expect(calls).toContainEqual({
      type: 'setDebugAabb',
      entityId: 'switch_a',
      bounds: {
        center: [1, 2, 3],
        color: '#f4bd4e',
        size: [2, 2, 2],
        visible: true,
      },
    });
  });

  it('passes manifest LOD groups to runtime entities without renderer details', async () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      runtime: createRuntimeProbe(calls, { recordLodGroups: true }),
    });

    await session.loadProject(createLodProject());

    expect(calls).toContainEqual({
      type: 'setEntityLodGroup',
      entityId: 'switch_a',
      group: {
        strategy: 'distance',
        hysteresis: 1,
        lowEndBias: 1,
        fallbackAsset: 'model.switch_wall.lod2',
        levels: [
          { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
          { level: 1, asset: 'model.switch_wall.lod1', minDistance: 8 },
          { level: 2, asset: 'model.switch_wall.lod2', minDistance: 16 },
        ],
      },
    });
  });

  it('passes level scatter groups to the runtime after project load', async () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      runtime: createRuntimeProbe(calls, { recordScatterGroups: true }),
    });

    await session.loadProject(createScatterProject());

    expect(calls).toContainEqual({
      type: 'setScatterGroups',
      groups: [
        {
          id: 'scatter_switch_markers',
          source: {
            type: 'asset',
            asset: 'model.switch_wall.lod2',
          },
          count: 6,
          seed: 'gate-demo-switch-markers',
          placement: {
            shape: 'box',
            center: [1.2, 0.7, 6.2],
            size: [2.4, 0, 1.6],
          },
          alignment: 'y-up',
          transform: {
            uniformScale: {
              min: 0.55,
              max: 0.85,
            },
          },
          quality: {
            lowEndCountScale: 0.5,
          },
          fallback: {
            mode: 'placeholder',
            asset: 'model.switch_wall.lod2',
          },
        },
      ],
    });
  });

  it('passes derived spherical placements to the runtime after object creation', async () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      runtime: createRuntimeProbe(calls, { recordSphericalPlacements: true }),
    });

    await session.loadProject(createSphericalProject());

    expect(calls).toContainEqual({
      type: 'setTransform',
      entityId: 'switch_a',
      transform: {
        position: [0, 2, 0],
        rotation: [0, 0, 0, 1],
        scale: [2, 2, 2],
      },
    });
    expect(calls).toContainEqual({
      type: 'setSphericalPlacements',
      diagnostics: {
        issueCount: 0,
        issues: [],
        placementCount: 1,
        placements: [
          expect.objectContaining({
            authoredLocalPosition: [0, 2, 0],
            entityId: 'switch_a',
            regionId: 'city',
            transform: {
              position: [0, 0, 14],
              rotation: [0.707107, 0, 0, 0.707107],
              scale: [2, 2, 2],
            },
          }),
        ],
      },
    });
  });

  it('passes delivery route target feedback to the runtime after spherical placement sync', async () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      runtime: createRuntimeProbe(calls, {
        recordDeliveryRouteFeedback: true,
        recordSphericalPlacements: true,
      }),
    });

    await session.loadProject(createDeliveryProject());

    const feedbackCall = calls.find(isDeliveryRouteFeedbackCall);

    expect(feedbackCall?.state).toMatchObject({
      issueCount: 0,
      jobId: 'job.mail',
      markerCount: 3,
      status: 'available',
    });
    expect(feedbackCall?.state.markers.map((marker) => marker.kind)).toEqual([
      'accept',
      'route',
      'target',
    ]);
    expect(feedbackCall?.state.markers.find((marker) => marker.kind === 'target')).toMatchObject({
      endpointId: 'delivery.drop',
      fallbackUsed: false,
      target: true,
    });
  });

  it('bridges renderer-neutral social runtime snapshots to the runtime', async () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      runtime: createRuntimeProbe(calls, { recordSocialState: true }),
    });

    await session.loadProject(createProject());
    session.setSocialRuntimeSnapshot(createSocialSnapshot());

    expect(calls).toContainEqual({ type: 'setSocialState', state: undefined });
    const socialCall = calls.find(isSocialStateCall);

    expect(socialCall?.state).toMatchObject({
      activeStamps: [
        {
          id: 'stamp-event.001',
          stampId: 'stamp.wave_ring',
        },
      ],
      invalidMessageCount: 1,
      players: [
        {
          playerId: 'remote.sky.01',
          avatarId: 'avatar.courier_sky',
          status: 'connected',
        },
      ],
      rateLimitedMessageCount: 2,
      room: {
        remotePlayerCount: 1,
        status: 'open',
      },
      sequence: 5,
      stalePlayerCount: 0,
    });
    session.setSocialRuntimeSnapshot(undefined);
    expect(calls).toContainEqual({ type: 'setSocialState', state: undefined });
  });

  it('steps spherical movement through World and refreshes runtime placement diagnostics', async () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      runtime: createRuntimeProbe(calls, { recordSphericalPlacements: true }),
    });

    expect(
      session.stepSphericalMovement('switch_a', {
        deltaSeconds: 1,
        forward: 1,
        turn: 0,
      }),
    ).toEqual({
      ok: false,
      entityId: 'switch_a',
      message: 'No world is loaded.',
      reason: 'world_unloaded',
    });

    await session.loadProject(createSphericalProject());
    calls.splice(0);

    const result = session.stepSphericalMovement(
      'switch_a',
      {
        deltaSeconds: 1,
        forward: 1,
        turn: 0,
      },
      {
        moveSpeed: 1,
      },
    );

    expect(result).toMatchObject({
      ok: true,
      state: {
        headingRadians: 0,
        localPosition: [0, 2, 1],
        regionId: 'city',
      },
    });
    const placementCall = calls.find(isSphericalPlacementCall);

    expect(placementCall?.diagnostics).toMatchObject({
      issueCount: 0,
      placementCount: 1,
      placements: [
        {
          authoredLocalPosition: [0, 2, 1],
          entityId: 'switch_a',
          regionId: 'city',
        },
      ],
    });
  });

  it('falls back to setTransform for movement preview runtimes without placement support', async () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      runtime: createRuntimeProbe(calls),
    });

    await session.loadProject(createSphericalProject());
    calls.splice(0);
    session.stepSphericalMovement(
      'switch_a',
      {
        deltaSeconds: 1,
        forward: 1,
        turn: 0,
      },
      {
        moveSpeed: 1,
      },
    );

    expect(calls).toContainEqual({
      type: 'setTransform',
      entityId: 'switch_a',
      transform: {
        position: [0, 9.899495, 9.899495],
        rotation: [0.382683, 0, 0, 0.92388],
        scale: [2, 2, 2],
      },
    });
  });
});

function createRuntimeProbe(
  calls: unknown[],
  options: {
    recordLodGroups?: boolean;
    recordDeliveryRouteFeedback?: boolean;
    recordScatterGroups?: boolean;
    recordShaderGlobals?: boolean;
    recordSocialState?: boolean;
    recordSphericalPlacements?: boolean;
  } = {},
): WebRuntime {
  const runtime: WebRuntime = {
    init: () => undefined,
    loadModel: (assetId, url) => {
      calls.push({ type: 'loadModel', assetId, url });

      return Promise.resolve({ assetId });
    },
    instantiateModel: (assetId, entityId) => {
      calls.push({ type: 'instantiateModel', assetId, entityId });

      return { entityId, runtimeObjectId: entityId };
    },
    createEmpty: (entityId) => {
      calls.push({ type: 'createEmpty', entityId });

      return { entityId, runtimeObjectId: entityId };
    },
    destroyObject: (entityId) => calls.push({ type: 'destroyObject', entityId }),
    setTransform: (entityId, runtimeTransform) =>
      calls.push({ type: 'setTransform', entityId, transform: runtimeTransform }),
    getTransform: () => null,
    setVisible: () => undefined,
    playAnimation: () => undefined,
    stopAnimation: () => undefined,
    setAnimationTime: () => undefined,
    setCameraPose: () => undefined,
    setDebugAabb: (entityId: string, bounds: RuntimeDebugAabb | undefined) => {
      calls.push({ type: 'setDebugAabb', entityId, bounds });
    },
    setStyleResources: (resources: RuntimeStyleResources) => {
      calls.push({ type: 'styleResources', resources });
    },
    setRenderEnvironment: (environment) => {
      calls.push({ type: 'environment', environment });
    },
    setRenderStyle: (entityId: string, style: RuntimeRenderStyle | undefined) => {
      calls.push({ type: 'setRenderStyle', entityId, style });
    },
    setRenderableMaterials: (
      entityId: string,
      materials: RuntimeRenderableMaterialSlots | undefined,
    ) => {
      calls.push({ type: 'setRenderableMaterials', entityId, materials });
    },
    setMaterialParameter: (update) => {
      calls.push({ type: 'setMaterialParameter', update });
    },
    setStyleQualityProfile: (profile: RuntimeStyleQualityProfile) => {
      calls.push({ type: 'styleQuality', profile });
    },
    setSelectedEntity: (entityId) => {
      calls.push({ type: 'setSelectedEntity', entityId });
    },
    pick: () => null,
    attachTransformGizmo: () => undefined,
    detachTransformGizmo: () => undefined,
    setTransformGizmoMode: () => undefined,
    update: (deltaSeconds: number) => calls.push({ type: 'update', deltaSeconds }),
    render: () => calls.push({ type: 'render' }),
    resize: (size: RuntimeSize) => calls.push({ type: 'resize', size }),
    dispose: () => calls.push({ type: 'dispose' }),
  };

  if (options.recordShaderGlobals) {
    runtime.setShaderGlobals = (globals) => {
      calls.push({ type: 'setShaderGlobals', globals });
    };
  }
  if (options.recordLodGroups) {
    runtime.setEntityLodGroup = (entityId: string, group: RuntimeLodGroup | undefined) => {
      calls.push({ type: 'setEntityLodGroup', entityId, group });
    };
  }
  if (options.recordDeliveryRouteFeedback) {
    runtime.setDeliveryRouteFeedback = (state: RuntimeDeliveryRouteFeedbackState) => {
      calls.push({ type: 'setDeliveryRouteFeedback', state });
    };
  }
  if (options.recordScatterGroups) {
    runtime.setScatterGroups = (groups: readonly RuntimeScatterGroup[]) => {
      calls.push({ type: 'setScatterGroups', groups });
    };
  }
  if (options.recordSphericalPlacements) {
    runtime.setSphericalPlacements = (diagnostics: RuntimeSphericalPlacementDiagnostics) => {
      calls.push({ type: 'setSphericalPlacements', diagnostics });
    };
  }
  if (options.recordSocialState) {
    runtime.setSocialState = (state: RuntimeSocialState | undefined) => {
      calls.push({ type: 'setSocialState', state });
    };
    runtime.getSocialDiagnostics = () => ({
      activeStampCount: 1,
      disconnectedRemoteCount: 0,
      invalidMessageCount: 1,
      lowEndSuppressedStampCount: 0,
      lowEndSuppressedRemoteCount: 0,
      rateLimitedMessageCount: 2,
      remoteCount: 1,
      roomFullCount: 0,
      roomStatus: 'open',
      staleRemoteCount: 0,
      staleSnapshotCount: 0,
      visibleRemoteCount: 1,
      visibleStampCount: 1,
    });
  }

  return runtime;
}

function isDeliveryRouteFeedbackCall(
  call: unknown,
): call is { state: RuntimeDeliveryRouteFeedbackState; type: 'setDeliveryRouteFeedback' } {
  return (
    typeof call === 'object' &&
    call !== null &&
    'type' in call &&
    call.type === 'setDeliveryRouteFeedback' &&
    'state' in call
  );
}

function isSphericalPlacementCall(
  call: unknown,
): call is { diagnostics: RuntimeSphericalPlacementDiagnostics; type: 'setSphericalPlacements' } {
  return (
    typeof call === 'object' &&
    call !== null &&
    'type' in call &&
    call.type === 'setSphericalPlacements' &&
    'diagnostics' in call
  );
}

function isSocialStateCall(
  call: unknown,
): call is { state: RuntimeSocialState; type: 'setSocialState' } {
  return (
    typeof call === 'object' &&
    call !== null &&
    'type' in call &&
    call.type === 'setSocialState' &&
    'state' in call &&
    call.state !== undefined
  );
}

function createProject(): ProjectData {
  return {
    assets: {
      schemaVersion: 1,
      assets: {
        'model.switch_wall': {
          type: 'model',
          url: '/models/props/switch_wall.glb',
        },
      },
    },
    level: {
      schemaVersion: 1,
      id: 'level_01',
      name: 'Gate Demo',
      environment: {
        ambientLight: 0.35,
        background: '#111111',
      },
      entities: [
        {
          id: 'switch_a',
          prefab: 'switch_wall',
          transform,
          components: {
            Collider: {
              center: [0, 0, 0],
              debugColor: '#f4bd4e',
              isTrigger: true,
              shape: 'aabb',
              size: [2, 2, 2],
            },
          },
        },
      ],
      events: [],
      timelines: [],
      cameraShots: [],
    },
    prefabs: {
      switch_wall: {
        schemaVersion: 1,
        id: 'switch_wall',
        name: 'Wall Switch',
        model: 'model.switch_wall',
        defaultTransform: transform,
        components: {
          Renderable: {
            materials: {
              main: {
                materialId: 'debug.uv-gradient',
                parameters: {
                  strength: 0.5,
                },
              },
            },
            model: 'model.switch_wall',
            renderStyle: {
              highlight: 'selected',
              outline: 'interactable',
              palette: 'world_01',
              profile: 'palette-toon',
              tone: 'accent',
            },
          },
        },
      },
    },
    palettes: {
      world_01: {
        schemaVersion: 1,
        id: 'world_01',
        tones: {
          accent: '#5aa7d6',
          base: '#76b28b',
        },
      },
    },
    events: {},
    timelines: {},
    cameraShots: {},
  };
}

function createSocialSnapshot(): SocialRuntimeSnapshot {
  return {
    activeStamps: [
      {
        createdAtMs: 1000,
        expiresAtMs: 3200,
        id: 'stamp-event.001',
        playerId: 'remote.sky.01',
        pose: {
          position: [0, 0.1, 0] as [number, number, number],
          region: 'hill',
          rotation: [0, 0, 0, 1] as [number, number, number, number],
          sequence: 2,
        },
        stampId: 'stamp.wave_ring',
      },
    ],
    diagnostics: [
      {
        code: 'invalid-message' as const,
        dropped: true,
        message: 'Invalid message.',
      },
    ],
    invalidMessageCount: 1,
    players: [
      {
        avatarId: 'avatar.courier_sky',
        connected: true,
        displayName: 'Sky 01',
        lastSeenAtMs: 1000,
        playerId: 'remote.sky.01',
        pose: {
          position: [0, 0.1, 0] as [number, number, number],
          region: 'hill',
          rotation: [0, 0, 0, 1] as [number, number, number, number],
          sequence: 2,
        },
        sequence: 2,
        stale: false,
        status: 'connected' as const,
      },
    ],
    rateLimitedMessageCount: 2,
    room: {
      maxRemotePlayers: 10,
      rateLimitedPlayerIds: ['remote.sky.01'],
      remotePlayerCount: 1,
      status: 'open' as const,
    },
    roomFullCount: 0,
    sequence: 5,
    stalePlayerCount: 0,
    staleSnapshotCount: 0,
  };
}

function createLodProject(): ProjectData {
  const project = createProject();

  return {
    ...project,
    assets: {
      schemaVersion: 1,
      assets: {
        'model.switch_wall': {
          type: 'model',
          url: '/models/props/switch_wall.glb',
          metadata: {
            lodGroup: 'gate-demo-props',
          },
        },
        'model.switch_wall.lod0': {
          type: 'model',
          url: '/models/props/switch_wall_lod0.glb',
        },
        'model.switch_wall.lod1': {
          type: 'model',
          url: '/models/props/switch_wall_lod1.glb',
        },
        'model.switch_wall.lod2': {
          type: 'model',
          url: '/models/props/switch_wall_lod2.glb',
        },
      },
      lodGroups: {
        'gate-demo-props': {
          strategy: 'distance',
          hysteresis: 1,
          lowEndBias: 1,
          fallbackAsset: 'model.switch_wall.lod2',
          levels: [
            { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
            { level: 1, asset: 'model.switch_wall.lod1', minDistance: 8 },
            { level: 2, asset: 'model.switch_wall.lod2', minDistance: 16 },
          ],
        },
      },
    },
  };
}

function createScatterProject(): ProjectData {
  const project = createProject();

  return {
    ...project,
    assets: {
      schemaVersion: 1,
      assets: {
        ...project.assets.assets,
        'model.switch_wall.lod2': {
          type: 'model',
          url: '/models/props/switch_wall_lod2.glb',
        },
      },
    },
    level: {
      ...project.level,
      scatterGroups: [
        {
          id: 'scatter_switch_markers',
          source: {
            type: 'asset',
            asset: 'model.switch_wall.lod2',
          },
          count: 6,
          seed: 'gate-demo-switch-markers',
          placement: {
            shape: 'box',
            center: [1.2, 0.7, 6.2],
            size: [2.4, 0, 1.6],
          },
          alignment: 'y-up',
          transform: {
            uniformScale: {
              min: 0.55,
              max: 0.85,
            },
          },
          quality: {
            lowEndCountScale: 0.5,
          },
          fallback: {
            mode: 'placeholder',
            asset: 'model.switch_wall.lod2',
          },
        },
      ],
    },
  };
}

function createSphericalProject(): ProjectData {
  const project = createProject();

  return {
    ...project,
    level: {
      ...project.level,
      worldProjection: {
        type: 'cube-sphere',
        radius: 12,
        regions: [
          {
            id: 'city',
            name: 'City Region',
            label: 'City',
            face: 'front',
            localBounds: {
              center: [0, 0, 0],
              size: [2, 2, 2],
            },
          },
        ],
      },
      entities: [
        {
          ...project.level.entities[0],
          transform: {
            position: [0, 2, 0],
            rotation: [0, 0, 0, 1],
            scale: [2, 2, 2],
          },
          placement: {
            mode: 'spherical-region',
            region: 'city',
          },
        },
      ],
    },
  };
}

function createDeliveryProject(): ProjectData {
  const project = createSphericalProject();

  return {
    ...project,
    level: {
      ...project.level,
      deliveryJobs: [
        {
          acceptEndpointId: 'delivery.pickup',
          completion: {
            endpointId: 'delivery.drop',
            type: 'deliverToEndpoint',
          },
          defaultStatus: 'available',
          description: 'Carry a packet across the compact world.',
          feedback: {
            accepted: 'Accepted.',
            completed: 'Complete.',
            inProgress: 'In progress.',
            readyToDeliver: 'Ready.',
          },
          id: 'job.mail',
          routeHints: [
            {
              endpointId: 'delivery.pickup',
              type: 'endpoint',
            },
            {
              label: 'Follow city path',
              localPosition: [0, 2, 0],
              region: 'city',
              type: 'spherical-region',
            },
            {
              endpointId: 'delivery.drop',
              type: 'endpoint',
            },
          ],
          targetEndpointId: 'delivery.drop',
          title: 'Mail Run',
        },
      ],
      entities: [
        {
          components: {
            DeliveryEndpoint: {
              endpointId: 'delivery.pickup',
              interactionRadius: 1.2,
              kind: 'npc',
              label: 'Pickup',
            },
          },
          id: 'pickup',
          placement: {
            mode: 'spherical-region',
            region: 'city',
          },
          transform: transform,
        },
        {
          components: {
            DeliveryEndpoint: {
              endpointId: 'delivery.drop',
              interactionRadius: 1.2,
              kind: 'mailbox',
              label: 'Drop',
            },
          },
          id: 'drop',
          placement: {
            localPosition: [0.5, 2, 0],
            mode: 'spherical-region',
            region: 'city',
          },
          transform: {
            position: [2, 2, 3],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
        },
      ],
    },
  };
}
