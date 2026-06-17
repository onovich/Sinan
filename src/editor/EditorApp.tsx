import { useEffect, useReducer, useRef, useState } from 'react';

import { createDemoDataRepository } from '../data/demoDataLoader';
import type { ProjectData } from '../data/DataRepository';
import { saveJson } from '../data/saveJsonClient';
import { DirectorSystem, type DirectorSystemContext } from '../director/DirectorSystem';
import { EventSystem } from '../events/EventSystem';
import { TriggerSystem } from '../events/TriggerSystem';
import { createEventRuntimeState, type DirectorCommand, type FlagValue } from '../events/types';
import type { CameraShotData } from '../schemas/cameraShot.schema';
import type { EventData } from '../schemas/event.schema';
import type { TimelineData, TimelineTrackData } from '../schemas/timeline.schema';
import type { TransformData } from '../schemas/transform.schema';
import type { EditorCommandContext } from './commands/Command';
import { CommandHistory } from './commands/CommandHistory';
import { TransformEntityCommand } from './commands/TransformEntityCommand';
import { AddCameraShotCommand, UpdateCameraShotCommand } from './commands/UpdateCameraShotCommand';
import { UpdateEventCommand } from './commands/UpdateEventCommand';
import {
  AddTimelineItemCommand,
  RemoveTimelineItemCommand,
  UpdateTimelineItemCommand,
  type TimelineItemOperation,
} from './commands/UpdateTimelineItemCommand';
import {
  AddTimelineTrackCommand,
  RemoveTimelineTrackCommand,
  UpdateTimelineTrackCommand,
} from './commands/UpdateTimelineTrackCommand';
import { Viewport } from './Viewport';
import { editorPanelLayout } from './editorLayout';
import { AssetPanel } from './panels/AssetPanel';
import { CameraShotPanel, type CameraShotSaveStatus } from './panels/CameraShotPanel';
import { EventDebugPanel, type EventDebugState } from './panels/EventDebugPanel';
import { EventInspector, type EventSaveStatus } from './panels/EventInspector';
import { HierarchyPanel } from './panels/HierarchyPanel';
import { InspectorPanel } from './panels/InspectorPanel';
import {
  TimelinePanel,
  type TimelineSaveStatus,
  type TimelineTrackKind,
} from './panels/TimelinePanel';
import {
  createInitialEditorState,
  editorReducer,
  type ActiveTool,
  type EditorMode,
} from './store/editorStore';

export function EditorApp() {
  const [editorState, dispatch] = useReducer(editorReducer, undefined, createInitialEditorState);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [eventSaveStatus, setEventSaveStatus] = useState<EventSaveStatus>('idle');
  const [timelineSaveStatus, setTimelineSaveStatus] = useState<TimelineSaveStatus>('idle');
  const [cameraShotSaveStatus, setCameraShotSaveStatus] = useState<CameraShotSaveStatus>('idle');
  const [cameraPreviewStatus, setCameraPreviewStatus] = useState('No camera preview');
  const [timelinePreviewStatus, setTimelinePreviewStatus] = useState('Ready to scrub');
  const [timelinePlaybackStatus, setTimelinePlaybackStatus] =
    useState<TimelinePlaybackStatus>('stopped');
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const projectRef = useRef<ProjectData | null>(null);
  const commandHistoryRef = useRef(new CommandHistory());
  const eventRuntimeStateRef = useRef(
    createEventRuntimeState({
      flags: { power_enabled: true },
      inventory: new Set(['gate_key']),
    }),
  );
  const directorCommandsRef = useRef<DirectorCommand[]>([]);
  const timelinePlaybackRef = useRef<TimelinePlaybackSession | null>(null);
  const [eventDebugState, setEventDebugState] = useState<EventDebugState>({
    firedEventIds: [],
    flags: { power_enabled: true },
    doorStates: {},
    directorCommands: [],
  });
  const selectedEntity = project?.level.entities.find(
    (entity) => entity.id === editorState.selectedEntityId,
  );
  const selectedEvent = getSelectedEvent(project, editorState.selectedEventId);
  const events = getSortedEvents(project);
  const selectedTimeline = getSelectedTimeline(project, editorState.selectedTimelineId);
  const timelines = getSortedTimelines(project);
  const selectedCameraShot = getSelectedCameraShot(project, editorState.selectedCameraShotId);
  const cameraShots = getSortedCameraShots(project);
  const commandContext: EditorCommandContext = {
    updateEntityTransform: (entityId, transform) => {
      setProject((current) => updateProjectEntityTransform(current, entityId, transform));
    },
    updateEvent: (eventId, event) => {
      setProject((current) => updateProjectEvent(current, eventId, event));
    },
    updateTimeline: (timelineId, timeline) => {
      setProject((current) => updateProjectTimeline(current, timelineId, timeline));
    },
    upsertCameraShot: (shot) => {
      setProject((current) => upsertProjectCameraShot(current, shot));
    },
    removeCameraShot: (shotId) => {
      setProject((current) => removeProjectCameraShot(current, shotId));
    },
  };

  useEffect(() => {
    let cancelled = false;
    const repository = createDemoDataRepository();

    repository
      .loadProjectLevel('level_01')
      .then((loadedProject) => {
        if (!cancelled) {
          setProject(loadedProject);
          setProjectError(null);
        }
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) {
          setProjectError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    return () => {
      const session = timelinePlaybackRef.current;

      if (session?.timerId !== undefined) {
        clearInterval(session.timerId);
      }
    };
  }, []);

  const commitTransform = (entityId: string, transform: TransformData) => {
    const current = projectRef.current;
    const entity = current?.level.entities.find((item) => item.id === entityId);

    if (!entity || transformsEqual(entity.transform, transform)) {
      return;
    }

    commandHistoryRef.current.execute(
      new TransformEntityCommand(entityId, entity.transform, transform),
      commandContext,
    );
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const undo = () => {
    commandHistoryRef.current.undo(commandContext);
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const redo = () => {
    commandHistoryRef.current.redo(commandContext);
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const saveLevel = () => {
    if (!project) {
      return;
    }

    setSaveStatus('saving');
    void saveJson(`data/levels/${project.level.id}.json`, project.level)
      .then(() => {
        setSaveStatus('saved');
      })
      .catch((error: unknown) => {
        console.error(error);
        setSaveStatus('failed');
      });
  };

  const applyEvent = (event: EventData) => {
    const currentEvent = projectRef.current?.events[event.id];

    if (!currentEvent || eventDataEqual(currentEvent, event)) {
      return;
    }

    commandHistoryRef.current.execute(
      new UpdateEventCommand(event.id, currentEvent, event),
      commandContext,
    );
    setEventSaveStatus('idle');
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const saveEvent = (event: EventData) => {
    setEventSaveStatus('saving');
    void saveJson(`data/events/${event.id}.json`, event)
      .then(() => {
        setEventSaveStatus('saved');
      })
      .catch((error: unknown) => {
        console.error(error);
        setEventSaveStatus('failed');
      });
  };

  const addTimelineTrack = (timelineId: string, trackType: TimelineTrackKind) => {
    const current = projectRef.current;
    const timeline = current?.timelines[timelineId];

    if (!current || !timeline) {
      return;
    }

    const track = createDefaultTimelineTrack(
      current,
      timeline,
      trackType,
      selectedEntity?.id,
      selectedCameraShot?.id,
    );

    commandHistoryRef.current.execute(new AddTimelineTrackCommand(timeline, track), commandContext);
    dispatch({ type: 'selectTimeline', timelineId });
    dispatch({ type: 'selectTimelineTrack', trackId: track.id });
    setTimelineSaveStatus('idle');
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const applyTimelineTrack = (timelineId: string, track: TimelineTrackData) => {
    const timeline = projectRef.current?.timelines[timelineId];
    const currentTrack = timeline?.tracks.find((item) => item.id === track.id);

    if (!timeline || !currentTrack || timelineTrackDataEqual(currentTrack, track)) {
      return;
    }

    commandHistoryRef.current.execute(
      new UpdateTimelineTrackCommand(timeline, track),
      commandContext,
    );
    dispatch({ type: 'selectTimelineTrack', trackId: track.id });
    setTimelineSaveStatus('idle');
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const removeTimelineTrack = (timelineId: string, trackId: string) => {
    const timeline = projectRef.current?.timelines[timelineId];

    if (!timeline?.tracks.some((track) => track.id === trackId)) {
      return;
    }

    commandHistoryRef.current.execute(
      new RemoveTimelineTrackCommand(timeline, trackId),
      commandContext,
    );
    dispatch({ type: 'selectTimelineTrack', trackId: undefined });
    setTimelineSaveStatus('idle');
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const applyTimelineTrackItem = (
    timelineId: string,
    track: TimelineTrackData,
    operation: TimelineItemOperation,
    itemLabel: string,
  ) => {
    const timeline = projectRef.current?.timelines[timelineId];

    if (!timeline) {
      return;
    }

    const nextTimeline = replaceTimelineTrack(timeline, track);
    const command =
      operation === 'add'
        ? new AddTimelineItemCommand(timeline, nextTimeline, itemLabel)
        : operation === 'remove'
          ? new RemoveTimelineItemCommand(timeline, nextTimeline, itemLabel)
          : new UpdateTimelineItemCommand(timeline, nextTimeline, itemLabel);

    commandHistoryRef.current.execute(command, commandContext);
    dispatch({ type: 'selectTimelineTrack', trackId: track.id });
    setTimelineSaveStatus('idle');
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const saveTimeline = (timeline: TimelineData) => {
    setTimelineSaveStatus('saving');
    void saveJson(`data/timelines/${timeline.id}.json`, timeline)
      .then(() => {
        setTimelineSaveStatus('saved');
      })
      .catch((error: unknown) => {
        console.error(error);
        setTimelineSaveStatus('failed');
      });
  };

  const createCameraShot = () => {
    if (!project) {
      return;
    }

    const shot = createDefaultCameraShot(project, selectedEntity?.id);
    commandHistoryRef.current.execute(new AddCameraShotCommand(shot), commandContext);
    dispatch({ type: 'selectCameraShot', cameraShotId: shot.id });
    setCameraShotSaveStatus('idle');
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const applyCameraShot = (shot: CameraShotData) => {
    const currentShot = projectRef.current?.cameraShots[shot.id];

    if (!currentShot || cameraShotDataEqual(currentShot, shot)) {
      return;
    }

    commandHistoryRef.current.execute(
      new UpdateCameraShotCommand(currentShot, shot),
      commandContext,
    );
    setCameraShotSaveStatus('idle');
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const saveCameraShot = (shot: CameraShotData) => {
    setCameraShotSaveStatus('saving');
    void saveJson(`data/cameraShots/${shot.id}.json`, shot)
      .then(() => {
        setCameraShotSaveStatus('saved');
      })
      .catch((error: unknown) => {
        console.error(error);
        setCameraShotSaveStatus('failed');
      });
  };

  const setCameraKeyFromView = (shot: CameraShotData, keyIndex: number) => {
    if (shot.type !== 'keyframed') {
      return;
    }

    const key = shot.keys[keyIndex];
    const selectedPosition = selectedEntity?.transform.position;
    const position: [number, number, number] = selectedPosition
      ? [selectedPosition[0], selectedPosition[1] + 1.5, selectedPosition[2] - 4]
      : [...key.position];
    const nextShot: CameraShotData = {
      ...shot,
      keys: shot.keys.map((item, index) =>
        index === keyIndex
          ? {
              ...item,
              position,
              lookAt: selectedEntity?.id ?? item.lookAt,
            }
          : item,
      ),
    };

    applyCameraShot(nextShot);
  };

  const previewCameraShot = (shot: CameraShotData, time: number) => {
    setCameraPreviewStatus(`${shot.id} @ ${Number(time.toFixed(2))}s`);
  };

  const selectTimeline = (timelineId: string) => {
    dispatch({ type: 'selectTimeline', timelineId });
    dispatch({ type: 'selectTimelineTrack', trackId: undefined });
    dispatch({ type: 'setTimelineTime', timelineTime: 0 });
    setTimelinePreviewStatus(`${timelineId} selected`);
  };

  const scrubTimeline = (timelineId: string, time: number) => {
    if (!project) {
      return;
    }

    const safeTime = roundTimelineTime(time);
    const previewContext = createTimelinePreviewContext();
    const director = new DirectorSystem(
      project.timelines,
      new EventSystem(Object.values(project.events)),
      project.cameraShots,
    );

    director.scrub(timelineId, safeTime, previewContext);
    dispatch({ type: 'selectTimeline', timelineId });
    dispatch({ type: 'setTimelineTime', timelineTime: safeTime });
    setTimelinePreviewStatus(formatTimelinePreviewStatus(timelineId, safeTime, director));
  };

  const playTimeline = (timelineId: string) => {
    const current = projectRef.current;
    const timeline = current?.timelines[timelineId];

    if (!current || !timeline) {
      return;
    }

    cancelTimelinePlaybackFrame();
    const director = new DirectorSystem(
      current.timelines,
      new EventSystem(Object.values(current.events)),
      current.cameraShots,
    );
    const startTime = clampNumber(editorState.timelineTime, 0, timeline.duration);
    const session: TimelinePlaybackSession = {
      director,
      context: createTimelinePreviewContext(),
      timelineId,
      timerId: undefined,
    };

    director.playTimeline(timelineId, { startTime });
    timelinePlaybackRef.current = session;
    dispatch({ type: 'setMode', mode: 'preview' });
    dispatch({ type: 'selectTimeline', timelineId });
    dispatch({ type: 'setTimelineTime', timelineTime: startTime });
    setTimelinePlaybackStatus('playing');
    setTimelinePreviewStatus(`${timelineId} preview playing`);
    scheduleTimelinePlaybackFrame(session);
  };

  const pauseTimeline = () => {
    const session = timelinePlaybackRef.current;

    if (!session) {
      return;
    }

    if (session.timerId !== undefined) {
      clearInterval(session.timerId);
      session.timerId = undefined;
    }

    session.director.pauseTimeline(session.timelineId);
    setTimelinePlaybackStatus('paused');
    setTimelinePreviewStatus(`${session.timelineId} paused`);
  };

  const resumeTimeline = () => {
    const session = timelinePlaybackRef.current;

    if (!session) {
      return;
    }

    session.director.resumeTimeline(session.timelineId);
    setTimelinePlaybackStatus('playing');
    setTimelinePreviewStatus(`${session.timelineId} preview playing`);
    scheduleTimelinePlaybackFrame(session);
  };

  const stopTimeline = () => {
    const session = timelinePlaybackRef.current;
    const timelineId = session?.timelineId ?? selectedTimeline?.id;

    cancelTimelinePlaybackFrame();

    if (session) {
      session.director.stopTimeline(session.timelineId);
    }

    timelinePlaybackRef.current = null;
    setTimelinePlaybackStatus('stopped');
    dispatch({ type: 'setTimelineTime', timelineTime: 0 });
    setTimelinePreviewStatus(timelineId ? `${timelineId} stopped` : 'Timeline stopped');
  };

  const seekTimeline = (timelineId: string, time: number) => {
    const timeline = projectRef.current?.timelines[timelineId];

    if (!timeline) {
      return;
    }

    const safeTime = roundTimelineTime(clampNumber(time, 0, timeline.duration));
    const session = timelinePlaybackRef.current;

    if (session?.timelineId === timelineId) {
      session.director.seekTimeline(timelineId, safeTime);
      dispatch({ type: 'setTimelineTime', timelineTime: safeTime });
      setTimelinePreviewStatus(`${timelineId} seek ${safeTime.toFixed(2)}s`);
      return;
    }

    scrubTimeline(timelineId, safeTime);
  };

  const createTimelinePreviewContext = (): DirectorSystemContext => ({
    state: createEventRuntimeState({
      flags: { ...eventRuntimeStateRef.current.flags },
      inventory: eventRuntimeStateRef.current.inventory,
    }),
    directorCommands: [],
    previewMode: true,
  });

  const cancelTimelinePlaybackFrame = () => {
    const session = timelinePlaybackRef.current;

    if (session?.timerId !== undefined) {
      clearInterval(session.timerId);
      session.timerId = undefined;
    }
  };

  const scheduleTimelinePlaybackFrame = (session: TimelinePlaybackSession) => {
    session.timerId = window.setInterval(() => {
      if (timelinePlaybackRef.current !== session) {
        return;
      }

      session.director.update(0.1, session.context);
      const state = session.director.getTimelineState(session.timelineId);

      if (!state) {
        if (session.timerId !== undefined) {
          clearInterval(session.timerId);
          session.timerId = undefined;
        }
        timelinePlaybackRef.current = null;
        setTimelinePlaybackStatus('stopped');
        return;
      }

      dispatch({ type: 'setTimelineTime', timelineTime: roundTimelineTime(state.time) });
      setTimelinePlaybackStatus(state.status);
      setTimelinePreviewStatus(`${session.timelineId} @ ${state.time.toFixed(2)}s`);

      if (state.status !== 'playing') {
        if (session.timerId !== undefined) {
          clearInterval(session.timerId);
          session.timerId = undefined;
        }
        timelinePlaybackRef.current = null;
      }
    }, 100);
  };

  const translateSelectedEntity = (delta: readonly [number, number, number]) => {
    if (!selectedEntity) {
      return;
    }

    const nextTransform: TransformData = {
      ...selectedEntity.transform,
      position: [
        selectedEntity.transform.position[0] + delta[0],
        selectedEntity.transform.position[1] + delta[1],
        selectedEntity.transform.position[2] + delta[2],
      ],
    };

    commandHistoryRef.current.execute(
      new TransformEntityCommand(selectedEntity.id, selectedEntity.transform, nextTransform),
      commandContext,
    );
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const interactSelectedEntity = () => {
    if (!selectedEntity || !project) {
      return;
    }

    const context = {
      state: eventRuntimeStateRef.current,
      directorCommands: directorCommandsRef.current,
    };
    const firedEventIds = new TriggerSystem(
      new EventSystem(Object.values(project.events)),
    ).interact(selectedEntity.id, context);

    setEventDebugState(
      createEventDebugState(
        firedEventIds,
        eventRuntimeStateRef.current,
        directorCommandsRef.current,
      ),
    );
  };

  return (
    <div className="editor-shell" data-testid="editor-shell">
      <header className="editor-topbar">
        <div>
          <h1>Sinan Scene Director</h1>
          <span>Scene editing workspace</span>
        </div>
        <nav aria-label="Editor modes">
          {(['edit', 'play', 'preview'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={editorState.mode === mode ? 'is-active' : undefined}
              onClick={() => dispatch({ type: 'setMode', mode })}
            >
              {formatMode(mode)}
            </button>
          ))}
        </nav>
        <div className="toolbar-group" aria-label="Transform tools">
          {(['select', 'move', 'rotate', 'scale'] as const).map((activeTool) => (
            <button
              key={activeTool}
              type="button"
              className={editorState.activeTool === activeTool ? 'is-active' : undefined}
              onClick={() => dispatch({ type: 'setActiveTool', activeTool })}
            >
              {formatTool(activeTool)}
            </button>
          ))}
        </div>
        <div className="toolbar-group" aria-label="Command history">
          <button type="button" onClick={undo} disabled={!historyState.canUndo}>
            Undo
          </button>
          <button type="button" onClick={redo} disabled={!historyState.canRedo}>
            Redo
          </button>
        </div>
        <div className="toolbar-group" aria-label="Project commands">
          <button type="button" onClick={saveLevel} disabled={!project || saveStatus === 'saving'}>
            Save
          </button>
          <span className="save-status" role="status">
            {formatSaveStatus(saveStatus)}
          </span>
        </div>
      </header>

      <main className="editor-workbench">
        <aside className="editor-panel editor-panel-left" aria-labelledby="hierarchy-heading">
          <HierarchyPanel
            level={project?.level ?? null}
            selectedEntityId={editorState.selectedEntityId}
            onSelectEntity={(entityId) => dispatch({ type: 'selectEntity', entityId })}
          />
          <AssetPanel assets={project?.assets ?? null} />
          {projectError ? <p className="panel-error">{projectError}</p> : null}
        </aside>

        <section className="viewport-region" aria-label={editorPanelLayout[1].title}>
          <Viewport
            project={project}
            selectionEnabled={editorState.mode === 'edit' && editorState.activeTool === 'select'}
            selectedEntityId={editorState.selectedEntityId}
            activeTool={editorState.activeTool}
            onSelectEntity={(entityId) => dispatch({ type: 'selectEntity', entityId })}
            onTransformCommit={commitTransform}
          />
        </section>

        <aside className="editor-panel editor-panel-right" aria-labelledby="inspector-heading">
          <InspectorPanel
            entity={selectedEntity}
            onTranslateSelected={translateSelectedEntity}
            onInteractSelected={selectedEntity ? interactSelectedEntity : undefined}
          />
          <EventInspector
            events={events}
            selectedEvent={selectedEvent}
            saveStatus={eventSaveStatus}
            onSelectEvent={(eventId) => dispatch({ type: 'selectEvent', eventId })}
            onApplyEvent={applyEvent}
            onSaveEvent={saveEvent}
          />
          <CameraShotPanel
            shots={cameraShots}
            selectedShot={selectedCameraShot}
            selectedEntityId={selectedEntity?.id}
            saveStatus={cameraShotSaveStatus}
            previewStatus={cameraPreviewStatus}
            onSelectShot={(cameraShotId) => dispatch({ type: 'selectCameraShot', cameraShotId })}
            onCreateShot={createCameraShot}
            onApplyShot={applyCameraShot}
            onSaveShot={saveCameraShot}
            onSetKeyFromView={setCameraKeyFromView}
            onPreviewShot={previewCameraShot}
          />
          <EventDebugPanel debugState={eventDebugState} />
        </aside>
      </main>

      <footer className="timeline-shell" aria-label={editorPanelLayout[3].title}>
        <TimelinePanel
          timelines={timelines}
          selectedTimeline={selectedTimeline}
          selectedTrackId={editorState.selectedTimelineTrackId}
          currentTime={editorState.timelineTime}
          saveStatus={timelineSaveStatus}
          playbackStatus={timelinePlaybackStatus}
          previewStatus={timelinePreviewStatus}
          entityIds={getEntityIds(project)}
          cameraShotIds={cameraShots.map((shot) => shot.id)}
          soundAssetIds={getSoundAssetIds(project)}
          onSelectTimeline={selectTimeline}
          onSelectTrack={(trackId) => dispatch({ type: 'selectTimelineTrack', trackId })}
          onScrubTimeline={scrubTimeline}
          onPlayTimeline={playTimeline}
          onPauseTimeline={pauseTimeline}
          onResumeTimeline={resumeTimeline}
          onStopTimeline={stopTimeline}
          onSeekTimeline={seekTimeline}
          onAddTrack={addTimelineTrack}
          onApplyTrack={applyTimelineTrack}
          onApplyTrackItem={applyTimelineTrackItem}
          onRemoveTrack={removeTimelineTrack}
          onSaveTimeline={saveTimeline}
        />
      </footer>
    </div>
  );
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';
type TimelinePlaybackStatus = 'stopped' | 'playing' | 'paused';

interface TimelinePlaybackSession {
  director: DirectorSystem;
  context: DirectorSystemContext;
  timelineId: string;
  timerId: number | undefined;
}

function formatMode(mode: EditorMode): string {
  return mode[0].toUpperCase() + mode.slice(1);
}

function formatTool(tool: ActiveTool): string {
  return tool[0].toUpperCase() + tool.slice(1);
}

function formatSaveStatus(status: SaveStatus): string {
  if (status === 'idle') {
    return 'Not saved';
  }

  if (status === 'saving') {
    return 'Saving';
  }

  if (status === 'saved') {
    return 'Saved';
  }

  return 'Save failed';
}

function getSelectedEvent(
  project: ProjectData | null,
  selectedEventId: string | undefined,
): EventData | undefined {
  if (!project) {
    return undefined;
  }

  if (selectedEventId && project.events[selectedEventId]) {
    return project.events[selectedEventId];
  }

  return getSortedEvents(project)[0];
}

function getSortedEvents(project: ProjectData | null): EventData[] {
  if (!project) {
    return [];
  }

  return Object.values(project.events).sort((left, right) => left.id.localeCompare(right.id));
}

function getSelectedTimeline(
  project: ProjectData | null,
  selectedTimelineId: string | undefined,
): TimelineData | undefined {
  if (!project) {
    return undefined;
  }

  if (selectedTimelineId && project.timelines[selectedTimelineId]) {
    return project.timelines[selectedTimelineId];
  }

  return getSortedTimelines(project)[0];
}

function getSortedTimelines(project: ProjectData | null): TimelineData[] {
  if (!project) {
    return [];
  }

  return Object.values(project.timelines).sort((left, right) => left.id.localeCompare(right.id));
}

function getEntityIds(project: ProjectData | null): string[] {
  if (!project) {
    return [];
  }

  return project.level.entities.map((entity) => entity.id);
}

function getSelectedCameraShot(
  project: ProjectData | null,
  selectedCameraShotId: string | undefined,
): CameraShotData | undefined {
  if (!project) {
    return undefined;
  }

  if (selectedCameraShotId && project.cameraShots[selectedCameraShotId]) {
    return project.cameraShots[selectedCameraShotId];
  }

  return getSortedCameraShots(project)[0];
}

function getSortedCameraShots(project: ProjectData | null): CameraShotData[] {
  if (!project) {
    return [];
  }

  return Object.values(project.cameraShots).sort((left, right) => left.id.localeCompare(right.id));
}

function getSoundAssetIds(project: ProjectData | null): string[] {
  if (!project) {
    return [];
  }

  return Object.entries(project.assets.assets)
    .filter(([, asset]) => asset.type === 'audio')
    .map(([assetId]) => assetId)
    .sort((left, right) => left.localeCompare(right));
}

function updateProjectEntityTransform(
  project: ProjectData | null,
  entityId: string,
  transform: TransformData,
): ProjectData | null {
  if (!project) {
    return project;
  }

  return {
    ...project,
    level: {
      ...project.level,
      entities: project.level.entities.map((entity) =>
        entity.id === entityId ? { ...entity, transform } : entity,
      ),
    },
  };
}

function updateProjectEvent(
  project: ProjectData | null,
  eventId: string,
  event: EventData,
): ProjectData | null {
  if (!project) {
    return project;
  }

  return {
    ...project,
    events: {
      ...project.events,
      [eventId]: event,
    },
  };
}

function updateProjectTimeline(
  project: ProjectData | null,
  timelineId: string,
  timeline: TimelineData,
): ProjectData | null {
  if (!project) {
    return project;
  }

  return {
    ...project,
    timelines: {
      ...project.timelines,
      [timelineId]: timeline,
    },
  };
}

function upsertProjectCameraShot(
  project: ProjectData | null,
  shot: CameraShotData,
): ProjectData | null {
  if (!project) {
    return project;
  }

  return {
    ...project,
    level: {
      ...project.level,
      cameraShots: project.level.cameraShots.includes(shot.id)
        ? project.level.cameraShots
        : [...project.level.cameraShots, shot.id],
    },
    cameraShots: {
      ...project.cameraShots,
      [shot.id]: shot,
    },
  };
}

function removeProjectCameraShot(project: ProjectData | null, shotId: string): ProjectData | null {
  if (!project) {
    return project;
  }

  return {
    ...project,
    level: {
      ...project.level,
      cameraShots: project.level.cameraShots.filter((id) => id !== shotId),
    },
    cameraShots: Object.fromEntries(
      Object.entries(project.cameraShots).filter(([id]) => id !== shotId),
    ),
  };
}

function createDefaultTimelineTrack(
  project: ProjectData,
  timeline: TimelineData,
  trackType: TimelineTrackKind,
  selectedEntityId: string | undefined,
  selectedCameraShotId: string | undefined,
): TimelineTrackData {
  const entityId = selectedEntityId ?? project.level.entities[0]?.id ?? 'entity_missing';
  const shotId = selectedCameraShotId ?? Object.keys(project.cameraShots)[0] ?? 'cam_missing';
  const soundId =
    getSoundAssetIds(project)[0] ?? Object.keys(project.assets.assets)[0] ?? 'asset_missing';
  const id = createTimelineTrackId(timeline, trackType);

  switch (trackType) {
    case 'action':
      return {
        id,
        type: 'action',
        time: 0,
        action: {
          type: 'flag.set',
          flag: 'timeline_marker',
          value: true,
        },
      };
    case 'animation.play':
      return {
        id,
        type: 'animation.play',
        start: 0,
        entityId,
        clip: 'Open',
        loop: false,
      };
    case 'camera.shot':
      return {
        id,
        type: 'camera.shot',
        start: 0,
        duration: Math.min(2, timeline.duration),
        shotId,
      };
    case 'property':
      return {
        id,
        type: 'property',
        target: entityId,
        property: 'Door.openAmount',
        keys: [
          { time: 0, value: 0, ease: 'linear' },
          { time: Math.min(1, timeline.duration), value: 1, ease: 'linear' },
        ],
      };
    case 'subtitle':
      return {
        id,
        type: 'subtitle',
        time: 0,
        text: 'Subtitle',
        duration: Math.min(1, timeline.duration),
      };
    case 'sound':
      return {
        id,
        type: 'sound',
        time: 0,
        soundId,
      };
    case 'wait':
      return {
        id,
        type: 'wait',
        start: 0,
        duration: Math.min(1, timeline.duration),
      };
  }
}

function createTimelineTrackId(timeline: TimelineData, trackType: TimelineTrackKind): string {
  const prefix = `track_${trackType.replace('.', '_')}`;
  let index = timeline.tracks.length + 1;
  let id = `${prefix}_${String(index).padStart(2, '0')}`;
  const existingIds = new Set(timeline.tracks.map((track) => track.id));

  while (existingIds.has(id)) {
    index += 1;
    id = `${prefix}_${String(index).padStart(2, '0')}`;
  }

  return id;
}

function replaceTimelineTrack(timeline: TimelineData, track: TimelineTrackData): TimelineData {
  return {
    ...timeline,
    tracks: timeline.tracks.map((item) => (item.id === track.id ? track : item)),
  };
}

function createDefaultCameraShot(
  project: ProjectData,
  selectedEntityId: string | undefined,
): CameraShotData {
  const nextIndex = Object.keys(project.cameraShots).length + 1;
  let id = `cam_shot_${String(nextIndex).padStart(2, '0')}`;
  let suffix = nextIndex;

  while (project.cameraShots[id]) {
    suffix += 1;
    id = `cam_shot_${String(suffix).padStart(2, '0')}`;
  }

  return {
    schemaVersion: 1,
    id,
    name: `Camera Shot ${suffix}`,
    type: 'keyframed',
    duration: 2,
    keys: [
      {
        time: 0,
        position: [0, 2, 6],
        lookAt: selectedEntityId ?? [0, 1, 0],
        fov: 50,
        ease: 'linear',
      },
    ],
  };
}

function eventDataEqual(left: EventData, right: EventData): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cameraShotDataEqual(left: CameraShotData, right: CameraShotData): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function timelineTrackDataEqual(left: TimelineTrackData, right: TimelineTrackData): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function transformsEqual(left: TransformData, right: TransformData): boolean {
  return (
    tupleEqual(left.position, right.position) &&
    tupleEqual(left.rotation, right.rotation) &&
    tupleEqual(left.scale, right.scale)
  );
}

function roundTimelineTime(time: number): number {
  return Math.round(time * 100) / 100;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatTimelinePreviewStatus(
  timelineId: string,
  time: number,
  director: DirectorSystem,
): string {
  const propertySamples = director.getLastPropertySamples().length;

  if (propertySamples > 0) {
    return `${timelineId} @ ${time.toFixed(2)}s, ${propertySamples} sampled`;
  }

  return `${timelineId} @ ${time.toFixed(2)}s`;
}

function tupleEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function createEventDebugState(
  firedEventIds: readonly string[],
  state: {
    flags: Record<string, FlagValue | undefined>;
    doorStates: Record<string, { isOpen?: boolean } | undefined>;
  },
  directorCommands: readonly DirectorCommand[],
): EventDebugState {
  return {
    firedEventIds,
    flags: { ...state.flags },
    doorStates: Object.fromEntries(
      Object.entries(state.doorStates).map(([entityId, doorState]) => [
        entityId,
        doorState?.isOpen,
      ]),
    ),
    directorCommands: [...directorCommands],
  };
}

function refreshHistoryState(
  history: CommandHistory,
  setHistoryState: (state: { canUndo: boolean; canRedo: boolean }) => void,
): void {
  setHistoryState({
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
  });
}
