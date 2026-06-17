import { useEffect, useReducer, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { createDemoDataRepository } from '../data/demoDataLoader';
import type { ProjectData } from '../data/DataRepository';
import { saveJson } from '../data/saveJsonClient';
import { DirectorCameraSystem } from '../director/DirectorCameraSystem';
import { DirectorSystem, type DirectorSystemContext } from '../director/DirectorSystem';
import { EventSystem } from '../events/EventSystem';
import { TriggerSystem } from '../events/TriggerSystem';
import { createEventRuntimeState, type DirectorCommand, type FlagValue } from '../events/types';
import type { RuntimeTransform } from '../runtime/RuntimeTypes';
import type { WebRuntime } from '../runtime/WebRuntime';
import type { CameraShotData } from '../schemas/cameraShot.schema';
import type { ComponentMapData, ComponentPayloadData } from '../schemas/entity.schema';
import type { EventData } from '../schemas/event.schema';
import type { TimelineData, TimelineTrackData } from '../schemas/timeline.schema';
import type { TransformData } from '../schemas/transform.schema';
import type { EditorCommandContext } from './commands/Command';
import { CommandHistory } from './commands/CommandHistory';
import { TransformEntityCommand } from './commands/TransformEntityCommand';
import { AddCameraShotCommand, UpdateCameraShotCommand } from './commands/UpdateCameraShotCommand';
import { UpdateEntityComponentCommand } from './commands/UpdateEntityComponentCommand';
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
import { getSaveStatusPill, type EditorSaveStatus } from './editorStatus';
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
  const [subtitleHud, setSubtitleHud] = useState<SubtitleHudState | null>(null);
  const [audioHud, setAudioHud] = useState<AudioHudState | null>(null);
  const [showTriggerDebug, setShowTriggerDebug] = useState(true);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [dirtyState, setDirtyState] = useState<DirtyState>(() => createCleanDirtyState());
  const projectRef = useRef<ProjectData | null>(null);
  const commandHistoryRef = useRef(new CommandHistory());
  const eventRuntimeStateRef = useRef(
    createEventRuntimeState({
      flags: { power_enabled: true },
      inventory: new Set(['gate_key']),
    }),
  );
  const directorCommandsRef = useRef<DirectorCommand[]>([]);
  const runtimeRef = useRef<WebRuntime | null>(null);
  const timelinePlaybackRef = useRef<TimelinePlaybackSession | null>(null);
  const subtitleTimerRef = useRef<number | undefined>(undefined);
  const audioTimerRef = useRef<number | undefined>(undefined);
  const transformAnimationFrameRef = useRef<Record<string, number | undefined>>({});
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
  const levelStatusPill = getSaveStatusPill({
    saveStatus,
    isDirty: dirtyState.level,
  });
  const selectedEventIsDirty = selectedEvent ? dirtyState.eventIds.has(selectedEvent.id) : false;
  const selectedTimelineIsDirty = selectedTimeline
    ? dirtyState.timelineIds.has(selectedTimeline.id)
    : false;
  const selectedCameraShotIsDirty = selectedCameraShot
    ? dirtyState.cameraShotIds.has(selectedCameraShot.id)
    : false;
  const commandContext: EditorCommandContext = {
    updateEntityTransform: (entityId, transform) => {
      setProject((current) => updateProjectEntityTransform(current, entityId, transform));
    },
    updateEntityComponents: (entityId, components) => {
      setProject((current) => updateProjectEntityComponents(current, entityId, components));
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
          setDirtyState(createCleanDirtyState());
          setSaveStatus('idle');
          setEventSaveStatus('idle');
          setTimelineSaveStatus('idle');
          setCameraShotSaveStatus('idle');
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
    const transformAnimationFrames = transformAnimationFrameRef.current;

    return () => {
      const session = timelinePlaybackRef.current;

      if (session?.timerId !== undefined) {
        clearInterval(session.timerId);
      }
      if (subtitleTimerRef.current !== undefined) {
        clearTimeout(subtitleTimerRef.current);
      }
      if (audioTimerRef.current !== undefined) {
        clearTimeout(audioTimerRef.current);
      }
      for (const frameId of Object.values(transformAnimationFrames)) {
        if (frameId !== undefined) {
          cancelAnimationFrame(frameId);
        }
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
    markLevelDirty(setDirtyState);
    setSaveStatus('idle');
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const commitEntityComponent = (
    entityId: string,
    componentType: string,
    payload: ComponentPayloadData,
  ) => {
    const current = projectRef.current;
    const entity = current?.level.entities.find((item) => item.id === entityId);

    if (!entity) {
      return;
    }

    const nextComponents = {
      ...entity.components,
      [componentType]: payload,
    };

    if (componentMapsEqual(entity.components, nextComponents)) {
      return;
    }

    commandHistoryRef.current.execute(
      new UpdateEntityComponentCommand(entityId, entity.components, nextComponents, componentType),
      commandContext,
    );
    markLevelDirty(setDirtyState);
    setSaveStatus('idle');
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const undo = () => {
    const command = commandHistoryRef.current.undo(commandContext);
    markDirtyForCommand(command?.id, setDirtyState);
    resetSaveStatusForCommand(command?.id);
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const redo = () => {
    const command = commandHistoryRef.current.redo(commandContext);
    markDirtyForCommand(command?.id, setDirtyState);
    resetSaveStatusForCommand(command?.id);
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  function resetSaveStatusForCommand(commandId: string | undefined): void {
    const target = getCommandDirtyTarget(commandId);

    if (!target) {
      return;
    }

    if (target.kind === 'level') {
      setSaveStatus('idle');
    } else if (target.kind === 'event') {
      setEventSaveStatus('idle');
    } else if (target.kind === 'timeline') {
      setTimelineSaveStatus('idle');
    } else {
      setCameraShotSaveStatus('idle');
    }
  }

  const saveLevel = () => {
    if (!project) {
      return;
    }

    setSaveStatus('saving');
    void saveJson(`data/levels/${project.level.id}.json`, project.level)
      .then(() => {
        setSaveStatus('saved');
        clearLevelDirty(setDirtyState);
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
    markEventDirty(setDirtyState, event.id);
    setEventSaveStatus('idle');
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const saveEvent = (event: EventData) => {
    setEventSaveStatus('saving');
    void saveJson(`data/events/${event.id}.json`, event)
      .then(() => {
        setEventSaveStatus('saved');
        clearEventDirty(setDirtyState, event.id);
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
    markTimelineDirty(setDirtyState, timelineId);
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
    markTimelineDirty(setDirtyState, timelineId);
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
    markTimelineDirty(setDirtyState, timelineId);
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
    markTimelineDirty(setDirtyState, timelineId);
    setTimelineSaveStatus('idle');
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const saveTimeline = (timeline: TimelineData) => {
    setTimelineSaveStatus('saving');
    void saveJson(`data/timelines/${timeline.id}.json`, timeline)
      .then(() => {
        setTimelineSaveStatus('saved');
        clearTimelineDirty(setDirtyState, timeline.id);
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
    markCameraShotDirty(setDirtyState, shot.id);
    markLevelDirty(setDirtyState);
    setSaveStatus('idle');
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
    markCameraShotDirty(setDirtyState, shot.id);
    setCameraShotSaveStatus('idle');
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const saveCameraShot = (shot: CameraShotData) => {
    setCameraShotSaveStatus('saving');
    void saveJson(`data/cameraShots/${shot.id}.json`, shot)
      .then(() => {
        setCameraShotSaveStatus('saved');
        clearCameraShotDirty(setDirtyState, shot.id);
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
    if (consumeRuntimeEffectCommands(previewContext.directorCommands).subtitles === 0) {
      clearSubtitle();
    }
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
    clearSubtitle();
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
    runtime: runtimeRef.current ?? undefined,
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
      consumeRuntimeEffectCommands(session.context.directorCommands);
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
    markLevelDirty(setDirtyState);
    setSaveStatus('idle');
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
    const debugCommands = [...directorCommandsRef.current];
    consumeRuntimeEffectCommands(directorCommandsRef.current);

    setEventDebugState(
      createEventDebugState(firedEventIds, eventRuntimeStateRef.current, debugCommands),
    );
  };

  const consumeRuntimeEffectCommands = (
    commands: DirectorCommand[],
  ): { subtitles: number; sounds: number } => {
    let subtitles = 0;
    let sounds = 0;

    for (let index = commands.length - 1; index >= 0; index -= 1) {
      const command = commands[index];

      if (command.type === 'subtitle.show') {
        commands.splice(index, 1);
        showSubtitle(command);
        subtitles += 1;
        continue;
      }

      if (command.type === 'sound.play') {
        commands.splice(index, 1);
        playSound(command.soundId);
        sounds += 1;
        continue;
      }

      if (command.type === 'camera.shot.play') {
        commands.splice(index, 1);
        playCameraShot(command.shotId);
        continue;
      }

      if (command.type === 'entity.animateTransform') {
        commands.splice(index, 1);
        playTransformAnimation(command);
        continue;
      }

      if (command.type === 'timeline.play') {
        commands.splice(index, 1);
        playTimeline(command.timelineId);
        continue;
      }

      if (command.type === 'timeline.stop') {
        commands.splice(index, 1);
        stopTimeline();
      }
    }

    return { subtitles, sounds };
  };

  const showSubtitle = (command: Extract<DirectorCommand, { type: 'subtitle.show' }>) => {
    if (subtitleTimerRef.current !== undefined) {
      clearTimeout(subtitleTimerRef.current);
    }

    setSubtitleHud({
      text: command.text,
      speaker: command.speaker,
    });
    subtitleTimerRef.current = window.setTimeout(() => {
      setSubtitleHud(null);
      subtitleTimerRef.current = undefined;
    }, command.duration * 1000);
  };

  const clearSubtitle = () => {
    if (subtitleTimerRef.current !== undefined) {
      clearTimeout(subtitleTimerRef.current);
      subtitleTimerRef.current = undefined;
    }

    setSubtitleHud(null);
  };

  const playSound = (soundId: string) => {
    const asset = projectRef.current?.assets.assets[soundId];

    if (!asset || asset.type !== 'audio') {
      showAudioStatus({ soundId, status: 'missing' });
      return;
    }

    showAudioStatus({ soundId, status: 'queued' });
    const audio = new Audio(asset.url);
    audio.volume = 0.45;
    void audio
      .play()
      .then(() => {
        showAudioStatus({ soundId, status: 'played' });
      })
      .catch(() => {
        showAudioStatus({ soundId, status: 'blocked' });
      });
  };

  const showAudioStatus = (state: AudioHudState) => {
    if (audioTimerRef.current !== undefined) {
      clearTimeout(audioTimerRef.current);
    }

    setAudioHud(state);
    audioTimerRef.current = window.setTimeout(() => {
      setAudioHud(null);
      audioTimerRef.current = undefined;
    }, 1600);
  };

  const playCameraShot = (shotId: string) => {
    const runtime = runtimeRef.current;
    const shot = projectRef.current?.cameraShots[shotId];

    if (!runtime || !shot) {
      return;
    }

    new DirectorCameraSystem(runtime).applyShot(shot, 0);
    setCameraPreviewStatus(`${shotId} runtime`);
  };

  const playTransformAnimation = (
    command: Extract<DirectorCommand, { type: 'entity.animateTransform' }>,
  ) => {
    const runtime = runtimeRef.current;
    const runtimeTransform = runtime?.getTransform(command.entityId);

    if (!runtime || !runtimeTransform) {
      return;
    }

    const from = toMutableTransform(runtimeTransform);
    const currentFrameId = transformAnimationFrameRef.current[command.entityId];
    if (currentFrameId !== undefined) {
      cancelAnimationFrame(currentFrameId);
    }

    const startedAt = performance.now();
    const durationMs = Math.max(1, command.duration * 1000);

    const sample = (now: number) => {
      const alpha = clampNumber((now - startedAt) / durationMs, 0, 1);
      const easedAlpha = sampleEase(alpha, command.ease);
      runtime.setTransform(command.entityId, interpolateTransform(from, command.to, easedAlpha));

      if (alpha < 1) {
        transformAnimationFrameRef.current[command.entityId] = requestAnimationFrame(sample);
      } else {
        transformAnimationFrameRef.current[command.entityId] = undefined;
      }
    };

    transformAnimationFrameRef.current[command.entityId] = requestAnimationFrame(sample);
  };

  return (
    <div className="editor-shell" data-mode={editorState.mode} data-testid="editor-shell">
      <header className="editor-topbar">
        <div className="topbar-brand">
          <h1>Sinan Scene Director</h1>
          <span>Scene editing workspace</span>
        </div>
        <div className="topbar-controls">
          <div className="toolbar-cluster toolbar-cluster-mode">
            <span className="toolbar-label">Mode</span>
            <nav className="segmented-control" aria-label="Editor modes">
              {(['edit', 'play', 'preview'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`mode-button mode-${mode}`}
                  aria-pressed={editorState.mode === mode}
                  onClick={() => dispatch({ type: 'setMode', mode })}
                >
                  {formatMode(mode)}
                </button>
              ))}
            </nav>
          </div>
          <div className="toolbar-cluster">
            <span className="toolbar-label">Tool</span>
            <div className="segmented-control" role="group" aria-label="Transform tools">
              {(['select', 'move', 'rotate', 'scale'] as const).map((activeTool) => (
                <button
                  key={activeTool}
                  type="button"
                  aria-pressed={editorState.activeTool === activeTool}
                  disabled={editorState.mode !== 'edit'}
                  onClick={() => dispatch({ type: 'setActiveTool', activeTool })}
                >
                  {formatTool(activeTool)}
                </button>
              ))}
            </div>
          </div>
          <div className="toolbar-cluster">
            <span className="toolbar-label">History</span>
            <div className="toolbar-group" role="group" aria-label="Command history">
              <button type="button" onClick={undo} disabled={!historyState.canUndo}>
                Undo
              </button>
              <button type="button" onClick={redo} disabled={!historyState.canRedo}>
                Redo
              </button>
            </div>
          </div>
          <div className="toolbar-cluster toolbar-cluster-project">
            <span className="toolbar-label">Project</span>
            <div className="toolbar-group" role="group" aria-label="Project commands">
              <button
                type="button"
                className={showTriggerDebug ? 'is-active' : undefined}
                aria-pressed={showTriggerDebug}
                onClick={() => setShowTriggerDebug((current) => !current)}
              >
                Trigger Bounds
              </button>
              <button
                type="button"
                onClick={saveLevel}
                disabled={!project || saveStatus === 'saving'}
              >
                Save
              </button>
              <span
                className={`save-status ${levelStatusPill.className}`}
                role="status"
                aria-label={`Level save state: ${levelStatusPill.text}`}
              >
                {levelStatusPill.text}
              </span>
            </div>
          </div>
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
            showTriggerDebug={editorState.mode === 'edit' && showTriggerDebug}
            selectedEntityId={editorState.selectedEntityId}
            activeTool={editorState.activeTool}
            onSelectEntity={(entityId) => dispatch({ type: 'selectEntity', entityId })}
            onTransformCommit={commitTransform}
            onRuntimeReady={(runtime) => {
              runtimeRef.current = runtime;
            }}
          />
          {subtitleHud ? (
            <div className="runtime-subtitle" role="status" data-testid="runtime-subtitle">
              {subtitleHud.speaker ? <span>{subtitleHud.speaker}</span> : null}
              <strong>{subtitleHud.text}</strong>
            </div>
          ) : null}
          {audioHud ? (
            <div
              className={`runtime-audio-status is-${audioHud.status}`}
              role="status"
              data-testid="runtime-audio-status"
            >
              <span>{formatAudioStatus(audioHud.status)}</span>
              <strong>{audioHud.soundId}</strong>
            </div>
          ) : null}
        </section>

        <aside className="editor-panel editor-panel-right" aria-labelledby="inspector-heading">
          <InspectorPanel
            entity={selectedEntity}
            onApplyTransform={commitTransform}
            onApplyComponent={commitEntityComponent}
            onTranslateSelected={translateSelectedEntity}
            onInteractSelected={selectedEntity ? interactSelectedEntity : undefined}
          />
          <EventInspector
            events={events}
            selectedEvent={selectedEvent}
            saveStatus={eventSaveStatus}
            isDirty={selectedEventIsDirty}
            onSelectEvent={(eventId) => dispatch({ type: 'selectEvent', eventId })}
            onApplyEvent={applyEvent}
            onSaveEvent={saveEvent}
          />
          <CameraShotPanel
            shots={cameraShots}
            selectedShot={selectedCameraShot}
            selectedEntityId={selectedEntity?.id}
            saveStatus={cameraShotSaveStatus}
            isDirty={selectedCameraShotIsDirty}
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
          isDirty={selectedTimelineIsDirty}
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

type SaveStatus = EditorSaveStatus;
type TimelinePlaybackStatus = 'stopped' | 'playing' | 'paused';

interface DirtyState {
  level: boolean;
  eventIds: ReadonlySet<string>;
  timelineIds: ReadonlySet<string>;
  cameraShotIds: ReadonlySet<string>;
}

type DirtyStateSetter = Dispatch<SetStateAction<DirtyState>>;

type DirtyTarget =
  | { kind: 'cameraShot'; id: string; touchesLevel?: boolean }
  | { kind: 'event'; id: string }
  | { kind: 'level' }
  | { kind: 'timeline'; id: string };

interface SubtitleHudState {
  text: string;
  speaker?: string;
}

type AudioHudStatus = 'queued' | 'played' | 'blocked' | 'missing';

interface AudioHudState {
  soundId: string;
  status: AudioHudStatus;
}

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

function formatAudioStatus(status: AudioHudStatus): string {
  if (status === 'played') {
    return 'Played';
  }

  if (status === 'blocked') {
    return 'Blocked';
  }

  if (status === 'missing') {
    return 'Missing';
  }

  return 'Queued';
}

function createCleanDirtyState(): DirtyState {
  return {
    level: false,
    eventIds: new Set(),
    timelineIds: new Set(),
    cameraShotIds: new Set(),
  };
}

function markLevelDirty(setDirtyState: DirtyStateSetter): void {
  setDirtyState((current) => ({ ...current, level: true }));
}

function clearLevelDirty(setDirtyState: DirtyStateSetter): void {
  setDirtyState((current) => ({ ...current, level: false }));
}

function markEventDirty(setDirtyState: DirtyStateSetter, eventId: string): void {
  setDirtyState((current) => ({ ...current, eventIds: addDirtyId(current.eventIds, eventId) }));
}

function clearEventDirty(setDirtyState: DirtyStateSetter, eventId: string): void {
  setDirtyState((current) => ({
    ...current,
    eventIds: removeDirtyId(current.eventIds, eventId),
  }));
}

function markTimelineDirty(setDirtyState: DirtyStateSetter, timelineId: string): void {
  setDirtyState((current) => ({
    ...current,
    timelineIds: addDirtyId(current.timelineIds, timelineId),
  }));
}

function clearTimelineDirty(setDirtyState: DirtyStateSetter, timelineId: string): void {
  setDirtyState((current) => ({
    ...current,
    timelineIds: removeDirtyId(current.timelineIds, timelineId),
  }));
}

function markCameraShotDirty(setDirtyState: DirtyStateSetter, cameraShotId: string): void {
  setDirtyState((current) => ({
    ...current,
    cameraShotIds: addDirtyId(current.cameraShotIds, cameraShotId),
  }));
}

function clearCameraShotDirty(setDirtyState: DirtyStateSetter, cameraShotId: string): void {
  setDirtyState((current) => ({
    ...current,
    cameraShotIds: removeDirtyId(current.cameraShotIds, cameraShotId),
  }));
}

function markDirtyForCommand(commandId: string | undefined, setDirtyState: DirtyStateSetter): void {
  const target = getCommandDirtyTarget(commandId);

  if (!target) {
    return;
  }

  if (target.kind === 'level') {
    markLevelDirty(setDirtyState);
  } else if (target.kind === 'event') {
    markEventDirty(setDirtyState, target.id);
  } else if (target.kind === 'timeline') {
    markTimelineDirty(setDirtyState, target.id);
  } else {
    markCameraShotDirty(setDirtyState, target.id);

    if (target.touchesLevel) {
      markLevelDirty(setDirtyState);
    }
  }
}

function getCommandDirtyTarget(commandId: string | undefined): DirtyTarget | undefined {
  if (!commandId) {
    return undefined;
  }

  const parts = commandId.split(':');

  if (parts[0] === 'transform') {
    return { kind: 'level' };
  }

  if (parts[0] === 'component') {
    return { kind: 'level' };
  }

  if (parts[0] === 'event' && parts[1]) {
    return { kind: 'event', id: parts[1] };
  }

  if ((parts[0] === 'timeline-track' || parts[0] === 'timeline-item') && parts[2]) {
    return { kind: 'timeline', id: parts[2] };
  }

  if (parts[0] === 'camera-shot' && parts[1] === 'add' && parts[2]) {
    return { kind: 'cameraShot', id: parts[2], touchesLevel: true };
  }

  if (parts[0] === 'camera-shot' && parts[1]) {
    return { kind: 'cameraShot', id: parts[1] };
  }

  return undefined;
}

function addDirtyId(ids: ReadonlySet<string>, id: string): ReadonlySet<string> {
  return new Set(ids).add(id);
}

function removeDirtyId(ids: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const nextIds = new Set(ids);
  nextIds.delete(id);

  return nextIds;
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

function updateProjectEntityComponents(
  project: ProjectData | null,
  entityId: string,
  components: ComponentMapData,
): ProjectData | null {
  if (!project) {
    return project;
  }

  return {
    ...project,
    level: {
      ...project.level,
      entities: project.level.entities.map((entity) =>
        entity.id === entityId ? { ...entity, components } : entity,
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

function componentMapsEqual(left: ComponentMapData, right: ComponentMapData): boolean {
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

function interpolateTransform(
  from: TransformData,
  to: TransformData,
  alpha: number,
): TransformData {
  return {
    position: [
      lerp(from.position[0], to.position[0], alpha),
      lerp(from.position[1], to.position[1], alpha),
      lerp(from.position[2], to.position[2], alpha),
    ],
    rotation: normalizeQuat([
      lerp(from.rotation[0], to.rotation[0], alpha),
      lerp(from.rotation[1], to.rotation[1], alpha),
      lerp(from.rotation[2], to.rotation[2], alpha),
      lerp(from.rotation[3], to.rotation[3], alpha),
    ]),
    scale: [
      lerp(from.scale[0], to.scale[0], alpha),
      lerp(from.scale[1], to.scale[1], alpha),
      lerp(from.scale[2], to.scale[2], alpha),
    ],
  };
}

function toMutableTransform(transform: RuntimeTransform): TransformData {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    scale: [...transform.scale],
  };
}

function sampleEase(alpha: number, ease: string | undefined): number {
  if (ease === 'easeOutCubic') {
    return 1 - (1 - alpha) ** 3;
  }

  if (ease === 'easeInOutCubic') {
    return alpha < 0.5 ? 4 * alpha ** 3 : 1 - (-2 * alpha + 2) ** 3 / 2;
  }

  return alpha;
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

function normalizeQuat(quat: [number, number, number, number]): [number, number, number, number] {
  const length = Math.hypot(...quat);

  if (length <= 0) {
    return [0, 0, 0, 1];
  }

  return [quat[0] / length, quat[1] / length, quat[2] / length, quat[3] / length];
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
