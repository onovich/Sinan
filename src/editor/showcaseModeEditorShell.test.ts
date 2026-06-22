import { describe, expect, it } from 'vitest';

import type { ProjectData } from '../data/DataRepository';
import {
  createEditorShellModeState,
  createShowcaseModeHud,
  editorModeOptions,
} from './editorLayout';

describe('showcase mode editor shell', () => {
  it('routes showcase mode to a focused playable viewport without editor panels', () => {
    expect(editorModeOptions).toEqual(['edit', 'play', 'preview', 'showcase']);
    expect(
      createEditorShellModeState({
        activeTool: 'move',
        mode: 'showcase',
        triggerDebugVisible: true,
      }),
    ).toEqual({
      isShowcase: true,
      mode: 'showcase',
      selectionEnabled: false,
      showEditorPanels: false,
      showEditorToolbarControls: false,
      showTimeline: false,
      showTriggerDebug: false,
      viewportActiveTool: 'select',
      viewportAutoFocus: true,
    });
  });

  it('keeps editor mode compatible with existing panels and selection flow', () => {
    expect(
      createEditorShellModeState({
        activeTool: 'select',
        mode: 'edit',
        triggerDebugVisible: true,
      }),
    ).toMatchObject({
      isShowcase: false,
      selectionEnabled: true,
      showEditorPanels: true,
      showEditorToolbarControls: true,
      showTimeline: true,
      showTriggerDebug: true,
      viewportActiveTool: 'select',
      viewportAutoFocus: false,
    });
  });

  it('summarizes delivery jobs for the showcase HUD from project data', () => {
    expect(createShowcaseModeHud(createProject())).toEqual({
      activeJobId: 'job.hill_mail_run',
      activeJobStatus: 'available',
      blocked: false,
      endpointCount: 2,
      empty: false,
      jobCount: 1,
      prompt: 'Carry mail from the hill courier to the mailbox.',
      promptVisible: true,
      routeMarkerCount: 0,
      stale: false,
      statusLabel: 'Available',
      targetEndpointId: 'delivery.mailbox_hill',
      targetLabel: 'Mailbox',
      targetVisible: false,
      title: 'Hill Mail Run',
      tone: 'neutral',
    });
  });
});

function createProject(): ProjectData {
  return {
    assets: {
      schemaVersion: 1,
      assets: {},
    },
    cameraShots: {},
    events: {},
    level: {
      schemaVersion: 1,
      cameraShots: [],
      deliveryJobs: [
        {
          id: 'job.hill_mail_run',
          title: 'Hill Mail Run',
          description: 'Carry mail from the hill courier to the mailbox.',
          acceptEndpointId: 'delivery.courier_hill',
          targetEndpointId: 'delivery.mailbox_hill',
          defaultStatus: 'available',
          package: {
            kind: 'parcel',
            label: 'Hill Parcel',
          },
          routeHints: [],
          completion: {
            type: 'deliverToEndpoint',
            endpointId: 'delivery.mailbox_hill',
          },
          feedback: {
            accepted: 'Parcel accepted.',
            inProgress: 'Parcel is underway.',
            readyToDeliver: 'Parcel is ready.',
            completed: 'Parcel delivered.',
            blocked: 'Delivery is blocked.',
            failed: 'Delivery failed.',
          },
        },
      ],
      entities: [
        {
          id: 'courier',
          components: {
            DeliveryEndpoint: {
              endpointId: 'delivery.courier_hill',
              kind: 'npc',
              label: 'Courier',
              interactionRadius: 1.6,
              prompt: 'Pick up parcel',
            },
          },
          prefab: 'npc',
          transform: createTransform(),
        },
        {
          id: 'mailbox',
          components: {
            DeliveryEndpoint: {
              endpointId: 'delivery.mailbox_hill',
              kind: 'mailbox',
              label: 'Mailbox',
              interactionRadius: 1.6,
              prompt: 'Deliver parcel',
            },
          },
          prefab: 'mailbox',
          transform: createTransform(),
        },
      ],
      events: [],
      id: 'level_01',
      name: 'Delivery Test',
      timelines: [],
    },
    palettes: {},
    prefabs: {},
    timelines: {},
  };
}

function createTransform() {
  return {
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0, 1] as [number, number, number, number],
    scale: [1, 1, 1] as [number, number, number],
  };
}
