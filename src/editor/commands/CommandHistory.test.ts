import { describe, expect, it } from 'vitest';

import type { EventData } from '../../schemas/event.schema';
import type { CameraShotData } from '../../schemas/cameraShot.schema';
import type { ComponentMapData } from '../../schemas/entity.schema';
import type { TimelineData, TimelineTrackData } from '../../schemas/timeline.schema';
import type { TransformData } from '../../schemas/transform.schema';
import { CommandHistory } from './CommandHistory';
import { TransformEntityCommand } from './TransformEntityCommand';
import { AddCameraShotCommand, UpdateCameraShotCommand } from './UpdateCameraShotCommand';
import { UpdateEntityComponentCommand } from './UpdateEntityComponentCommand';
import { UpdateEventCommand } from './UpdateEventCommand';
import {
  AddTimelineItemCommand,
  RemoveTimelineItemCommand,
  UpdateTimelineItemCommand,
} from './UpdateTimelineItemCommand';
import {
  AddTimelineTrackCommand,
  RemoveTimelineTrackCommand,
  UpdateTimelineTrackCommand,
} from './UpdateTimelineTrackCommand';

const before: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

const after: TransformData = {
  position: [2, 1, 4],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('CommandHistory', () => {
  it('executes, undoes, and redoes transform commands', () => {
    const applied: TransformData[] = [];
    const history = new CommandHistory();
    const context = {
      updateEntityTransform: (_entityId: string, transform: TransformData) => {
        applied.push(transform);
      },
      updateEntityComponents: () => undefined,
      updateEvent: () => undefined,
      updateTimeline: () => undefined,
      upsertCameraShot: () => undefined,
      removeCameraShot: () => undefined,
    };

    history.execute(new TransformEntityCommand('switch_a', before, after), context);
    history.undo(context);
    history.redo(context);

    expect(applied).toEqual([after, before, after]);
  });

  it('executes, undoes, and redoes event update commands', () => {
    const applied: EventData[] = [];
    const history = new CommandHistory();
    const eventBefore = createEvent('Switch opens gate');
    const eventAfter = createEvent('Switch opens gate safely');
    const context = {
      updateEntityTransform: () => undefined,
      updateEntityComponents: () => undefined,
      updateEvent: (_eventId: string, event: EventData) => {
        applied.push(event);
      },
      updateTimeline: () => undefined,
      upsertCameraShot: () => undefined,
      removeCameraShot: () => undefined,
    };

    history.execute(
      new UpdateEventCommand('ev_switch_a_open_gate', eventBefore, eventAfter),
      context,
    );
    history.undo(context);
    history.redo(context);

    expect(applied).toEqual([eventAfter, eventBefore, eventAfter]);
  });

  it('executes, undoes, and redoes camera shot update commands', () => {
    const applied: CameraShotData[] = [];
    const removed: string[] = [];
    const history = new CommandHistory();
    const shotBefore = createCameraShot(55);
    const shotAfter = createCameraShot(45);
    const context = {
      updateEntityTransform: () => undefined,
      updateEntityComponents: () => undefined,
      updateEvent: () => undefined,
      updateTimeline: () => undefined,
      upsertCameraShot: (shot: CameraShotData) => {
        applied.push(shot);
      },
      removeCameraShot: (shotId: string) => {
        removed.push(shotId);
      },
    };

    history.execute(new UpdateCameraShotCommand(shotBefore, shotAfter), context);
    history.undo(context);
    history.redo(context);
    history.execute(new AddCameraShotCommand(shotAfter), context);
    history.undo(context);

    expect(applied).toEqual([shotAfter, shotBefore, shotAfter, shotAfter]);
    expect(removed).toEqual(['cam_gate_reveal']);
  });

  it('executes, undoes, and redoes timeline track commands', () => {
    const applied: TimelineData[] = [];
    const history = new CommandHistory();
    const timeline = createTimeline([]);
    const actionTrack = createActionTrack('track_action_a', 0.2);
    const updatedTrack = createActionTrack('track_action_a', 1.4);
    const context = {
      updateEntityTransform: () => undefined,
      updateEntityComponents: () => undefined,
      updateEvent: () => undefined,
      updateTimeline: (_timelineId: string, nextTimeline: TimelineData) => {
        applied.push(nextTimeline);
      },
      upsertCameraShot: () => undefined,
      removeCameraShot: () => undefined,
    };

    history.execute(new AddTimelineTrackCommand(timeline, actionTrack), context);
    history.undo(context);
    history.redo(context);
    history.execute(
      new UpdateTimelineTrackCommand(createTimeline([actionTrack]), updatedTrack),
      context,
    );
    history.undo(context);
    history.execute(
      new RemoveTimelineTrackCommand(createTimeline([actionTrack]), actionTrack.id),
      context,
    );
    history.undo(context);

    expect(applied.map((item) => item.tracks)).toEqual([
      [actionTrack],
      [],
      [actionTrack],
      [updatedTrack],
      [actionTrack],
      [],
      [actionTrack],
    ]);
  });

  it('executes, undoes, and redoes timeline item commands', () => {
    const applied: TimelineData[] = [];
    const history = new CommandHistory();
    const propertyTrack: TimelineTrackData = {
      id: 'track_gate_open_amount',
      type: 'property',
      target: 'gate_a',
      property: 'Door.openAmount',
      keys: [
        { time: 0, value: 0, ease: 'linear' },
        { time: 1, value: 1, ease: 'linear' },
      ],
    };
    const timeline = createTimeline([propertyTrack]);
    const addedKeyTrack: TimelineTrackData = {
      ...propertyTrack,
      keys: [...propertyTrack.keys, { time: 2, value: 0.5, ease: 'easeOutCubic' }],
    };
    const movedKeyTrack: TimelineTrackData = {
      ...addedKeyTrack,
      keys: addedKeyTrack.keys.map((key, index) => (index === 2 ? { ...key, time: 2.5 } : key)),
    };
    const removedKeyTrack: TimelineTrackData = {
      ...movedKeyTrack,
      keys: movedKeyTrack.keys.slice(0, 2),
    };
    const context = {
      updateEntityTransform: () => undefined,
      updateEntityComponents: () => undefined,
      updateEvent: () => undefined,
      updateTimeline: (_timelineId: string, nextTimeline: TimelineData) => {
        applied.push(nextTimeline);
      },
      upsertCameraShot: () => undefined,
      removeCameraShot: () => undefined,
    };

    history.execute(
      new AddTimelineItemCommand(
        timeline,
        createTimeline([addedKeyTrack]),
        'track_gate_open_amount key',
      ),
      context,
    );
    history.undo(context);
    history.redo(context);
    history.execute(
      new UpdateTimelineItemCommand(
        createTimeline([addedKeyTrack]),
        createTimeline([movedKeyTrack]),
        'track_gate_open_amount key',
      ),
      context,
    );
    history.undo(context);
    history.execute(
      new RemoveTimelineItemCommand(
        createTimeline([movedKeyTrack]),
        createTimeline([removedKeyTrack]),
        'track_gate_open_amount key',
      ),
      context,
    );
    history.undo(context);

    expect(
      applied.map((item) => {
        const track = item.tracks[0];
        return track.type === 'property' ? track.keys.map((key) => key.time) : [];
      }),
    ).toEqual([
      [0, 1, 2],
      [0, 1],
      [0, 1, 2],
      [0, 1, 2.5],
      [0, 1, 2],
      [0, 1],
      [0, 1, 2.5],
    ]);
  });

  it('executes, undoes, and redoes entity component update commands', () => {
    const applied: ComponentMapData[] = [];
    const history = new CommandHistory();
    const componentsBefore: ComponentMapData = {
      Interactable: { prompt: 'Press E' },
      Switch: { initialState: false },
    };
    const componentsAfter: ComponentMapData = {
      Interactable: { prompt: 'Open gate' },
      Switch: { initialState: false },
    };
    const context = {
      updateEntityTransform: () => undefined,
      updateEntityComponents: (_entityId: string, components: ComponentMapData) => {
        applied.push(components);
      },
      updateEvent: () => undefined,
      updateTimeline: () => undefined,
      upsertCameraShot: () => undefined,
      removeCameraShot: () => undefined,
    };

    history.execute(
      new UpdateEntityComponentCommand(
        'switch_a',
        componentsBefore,
        componentsAfter,
        'Interactable',
      ),
      context,
    );
    history.undo(context);
    history.redo(context);

    expect(applied).toEqual([componentsAfter, componentsBefore, componentsAfter]);
  });
});

function createEvent(name: string): EventData {
  return {
    schemaVersion: 1,
    id: 'ev_switch_a_open_gate',
    name,
    trigger: {
      type: 'entity.interact',
      entityId: 'switch_a',
    },
    actions: [
      {
        type: 'door.open',
        entityId: 'gate_a',
      },
    ],
  };
}

function createCameraShot(fov: number): CameraShotData {
  return {
    schemaVersion: 1,
    id: 'cam_gate_reveal',
    type: 'static',
    pose: {
      position: [1, 2, 3],
      lookAt: 'gate_a',
      fov,
    },
  };
}

function createTimeline(tracks: TimelineTrackData[]): TimelineData {
  return {
    schemaVersion: 1,
    id: 'tl_open_gate',
    name: 'Open Gate Timeline',
    duration: 4.5,
    tracks,
  };
}

function createActionTrack(id: string, time: number): TimelineTrackData {
  return {
    id,
    type: 'action',
    time,
    action: {
      type: 'flag.set',
      flag: 'gate_a_opened',
      value: true,
    },
  };
}
