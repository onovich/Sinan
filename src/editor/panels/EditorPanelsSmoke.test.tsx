import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { AssetManifestData } from '../../schemas/asset.schema';
import type { LevelData } from '../../schemas/level.schema';
import type { TransformData } from '../../schemas/transform.schema';
import { AssetPanel } from './AssetPanel';
import { DeliveryJobPanel } from './DeliveryJobPanel';
import { EventDebugPanel } from './EventDebugPanel';
import { HierarchyPanel } from './HierarchyPanel';
import { InspectorPanel } from './InspectorPanel';

const transform: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

const level: LevelData = {
  schemaVersion: 1,
  id: 'level_test',
  name: 'Panel Test',
  entities: [
    {
      id: 'switch_a',
      name: 'Switch A',
      prefab: 'switch_wall',
      transform,
      components: {
        Switch: { isOn: false },
      },
    },
    {
      id: 'gate_a',
      prefab: 'door_wood',
      transform,
      components: {},
    },
  ],
  events: [],
  timelines: [],
  cameraShots: [],
  deliveryJobs: [
    {
      acceptEndpointId: 'delivery.pickup',
      completion: {
        endpointId: 'delivery.drop',
        type: 'deliverToEndpoint',
      },
      defaultStatus: 'available',
      description: 'Carry a packet.',
      feedback: {
        accepted: 'Accepted.',
        completed: 'Complete.',
        inProgress: 'In progress.',
        readyToDeliver: 'Ready.',
      },
      id: 'job.mail',
      routeHints: [],
      targetEndpointId: 'delivery.drop',
      title: 'Mail Run',
    },
  ],
};

const assets: AssetManifestData = {
  schemaVersion: 1,
  assets: {
    'audio.switch_click': {
      type: 'audio',
      url: '/audio/switch_click.wav',
    },
    'model.switch_wall': {
      type: 'model',
      url: '/models/switch_wall.glb',
    },
  },
};

describe('editor panel smoke', () => {
  it('renders panel summaries, selected entity state, and debug counts', () => {
    const markup = renderToStaticMarkup(
      <>
        <HierarchyPanel
          level={level}
          selectedEntityId="switch_a"
          onSelectEntity={() => undefined}
        />
        <AssetPanel
          assets={assets}
          selectedAssetId="model.switch_wall"
          onSelectAsset={() => undefined}
        />
        <DeliveryJobPanel level={level} onApplyJob={() => undefined} />
        <InspectorPanel entity={level.entities[0]} />
        <EventDebugPanel
          debugState={{
            firedEventIds: ['ev_switch_a_open_gate'],
            flags: { power_enabled: true },
            doorStates: { gate_a: true },
            directorCommands: [{ type: 'sound.play', soundId: 'audio.switch_click' }],
          }}
        />
      </>,
    );

    expect(markup).toContain('2 entities');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('Switch A');
    expect(markup).toContain('2 assets');
    expect(markup).toContain('/models/switch_wall.glb');
    expect(markup).toContain('Delivery Jobs');
    expect(markup).toContain('Mail Run');
    expect(markup).toContain('1 component');
    expect(markup).toContain('1 fired');
    expect(markup).toContain('1 command');
  });
});
