import { useEffect, useReducer, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { createDemoDataRepository } from '../data/demoDataLoader';
import type { ProjectData } from '../data/DataRepository';
import { saveJson } from '../data/saveJsonClient';
import { DirectorCameraSystem } from '../director/DirectorCameraSystem';
import { DirectorSystem, type DirectorSystemContext } from '../director/DirectorSystem';
import { ActionSystem } from '../events/ActionSystem';
import { EventSystem } from '../events/EventSystem';
import { TriggerSystem } from '../events/TriggerSystem';
import {
  createEventRuntimeState,
  type DirectorCommand,
  type EventRuntimeState,
  type FlagValue,
} from '../events/types';
import type { RuntimeTransform } from '../runtime/RuntimeTypes';
import type { WebRuntime } from '../runtime/WebRuntime';
import {
  CameraShotSchema,
  type CameraShotData,
  type CameraShotKeyData,
} from '../schemas/cameraShot.schema';
import type { ComponentMapData, ComponentPayloadData } from '../schemas/entity.schema';
import { EventSchema, type EventData } from '../schemas/event.schema';
import { LevelSchema, type LevelData } from '../schemas/level.schema';
import {
  TimelineSchema,
  type TimelineData,
  type TimelineTrackData,
} from '../schemas/timeline.schema';
import type { TransformData } from '../schemas/transform.schema';
import type { EditorCommandContext } from './commands/Command';
import { CommandHistory } from './commands/CommandHistory';
import { ReorderLevelEntityCommand } from './commands/ReorderLevelEntityCommand';
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
import {
  createEditorShellModeState,
  createShowcaseModeHud,
  editorModeOptions,
  editorPanelLayout,
} from './editorLayout';
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

type RightRailTab = 'inspector' | 'event' | 'camera' | 'debug';

const designReviewEntityId = 'switch_a';
const designReviewTimelineId = 'tl_open_gate';
const designReviewTrackId = 'track_camera_gate_reveal';
const designReviewCameraShotId = 'cam_gate_reveal';
const designReviewTimelineTime = 2.25;

export function EditorApp() {
  const designReviewMode = isDesignReviewModeEnabled();
  const [editorState, dispatch] = useReducer(editorReducer, undefined, createInitialEditorState);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [eventSaveStatus, setEventSaveStatus] = useState<EventSaveStatus>('idle');
  const [timelineSaveStatus, setTimelineSaveStatus] = useState<TimelineSaveStatus>('idle');
  const [cameraShotSaveStatus, setCameraShotSaveStatus] = useState<CameraShotSaveStatus>('idle');
  const [saveErrors, setSaveErrors] = useState<SaveErrorState>(() => createCleanSaveErrorState());
  const [savedSnapshots, setSavedSnapshots] = useState<SavedDataSnapshot | null>(null);
  const [cameraPreviewStatus, setCameraPreviewStatus] = useState('No camera preview');
  const [timelinePreviewStatus, setTimelinePreviewStatus] = useState('Ready to scrub');
  const [timelinePlaybackStatus, setTimelinePlaybackStatus] =
    useState<TimelinePlaybackStatus>('stopped');
  const [subtitleHud, setSubtitleHud] = useState<SubtitleHudState | null>(null);
  const [audioHud, setAudioHud] = useState<AudioHudState | null>(null);
  const [showTriggerDebug, setShowTriggerDebug] = useState(true);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [dirtyState, setDirtyState] = useState<DirtyState>(() => createCleanDirtyState());
  const [rightRailTab, setRightRailTab] = useState<RightRailTab>('inspector');
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(undefined);
  const [debugCopyStatus, setDebugCopyStatus] = useState<string | undefined>(undefined);
  const [transformPreview, setTransformPreview] = useState<{
    entityId: string;
    transform: TransformData;
  }>();
  const [eventRuntimePreviewState, setEventRuntimePreviewState] = useState<EventRuntimeState>(() =>
    createEventRuntimeState({
      flags: { power_enabled: true },
      inventory: new Set(['gate_key']),
    }),
  );
  const projectRef = useRef<ProjectData | null>(null);
  const commandHistoryRef = useRef(new CommandHistory());
  const eventRuntimeStateRef = useRef<EventRuntimeState>(eventRuntimePreviewState);
  const directorCommandsRef = useRef<DirectorCommand[]>([]);
  const runtimeRef = useRef<WebRuntime | null>(null);
  const timelinePlaybackRef = useRef<TimelinePlaybackSession | null>(null);
  const subtitleTimerRef = useRef<number | undefined>(undefined);
  const audioTimerRef = useRef<number | undefined>(undefined);
  const transformAnimationFrameRef = useRef<Record<string, number | undefined>>({});
  const [eventDebugState, setEventDebugState] = useState<EventDebugState>(() =>
    createEventDebugState([], eventRuntimePreviewState, []),
  );
  const selectedEntity = project?.level.entities.find(
    (entity) => entity.id === editorState.selectedEntityId,
  );
  const visibleSelectedEntity =
    selectedEntity && transformPreview?.entityId === selectedEntity.id
      ? { ...selectedEntity, transform: transformPreview.transform }
      : selectedEntity;
  const selectedEvent = getSelectedEvent(project, editorState.selectedEventId);
  const events = getSortedEvents(project);
  const selectedTimeline = getSelectedTimeline(project, editorState.selectedTimelineId);
  const timelines = getSortedTimelines(project);
  const selectedCameraShot = getSelectedCameraShot(project, editorState.selectedCameraShotId);
  const cameraShots = getSortedCameraShots(project);
  const computedDirtyState =
    project && savedSnapshots ? computeDirtyState(project, savedSnapshots) : dirtyState;
  const visibleDirtyState =
    designReviewMode && project
      ? createDesignReviewDirtyState(computedDirtyState, project)
      : computedDirtyState;
  const levelStatusPill = getSaveStatusPill({
    saveStatus,
    isDirty: visibleDirtyState.level,
  });
  const selectedEventIsDirty = selectedEvent
    ? visibleDirtyState.eventIds.has(selectedEvent.id)
    : false;
  const selectedEventSaveError = selectedEvent ? saveErrors.events[selectedEvent.id] : undefined;
  const selectedTimelineIsDirty = selectedTimeline
    ? visibleDirtyState.timelineIds.has(selectedTimeline.id)
    : false;
  const selectedTimelineSaveError = selectedTimeline
    ? saveErrors.timelines[selectedTimeline.id]
    : undefined;
  const timelineStatusPill = getSaveStatusPill({
    saveStatus: timelineSaveStatus,
    isDirty: selectedTimelineIsDirty,
  });
  const selectedCameraShotIsDirty = selectedCameraShot
    ? visibleDirtyState.cameraShotIds.has(selectedCameraShot.id)
    : false;
  const selectedCameraShotSaveError = selectedCameraShot
    ? saveErrors.cameraShots[selectedCameraShot.id]
    : undefined;
  const eventStatusPill = getSaveStatusPill({
    saveStatus: eventSaveStatus,
    isDirty: selectedEventIsDirty,
  });
  const cameraStatusPill = getSaveStatusPill({
    saveStatus: cameraShotSaveStatus,
    isDirty: selectedCameraShotIsDirty,
  });
  const shellModeState = createEditorShellModeState({
    activeTool: editorState.activeTool,
    mode: editorState.mode,
    triggerDebugVisible: showTriggerDebug,
  });
  const showcaseHud = createShowcaseModeHud(project);
  const commandContext: EditorCommandContext = {
    updateLevel: (level) => {
      setProject((current) => updateProjectLevel(current, level));
    },
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
    const loadInDesignReviewMode = isDesignReviewModeEnabled();
    const repository = createDemoDataRepository();

    repository
      .loadProjectLevel('level_01')
      .then((loadedProject) => {
        if (!cancelled) {
          projectRef.current = loadedProject;
          setProject(loadedProject);
          setProjectError(null);
          setSavedSnapshots(createSavedDataSnapshot(loadedProject));
          setDirtyState(createCleanDirtyState());
          setSaveErrors(createCleanSaveErrorState());
          setSaveStatus('idle');
          setEventSaveStatus('idle');
          setTimelineSaveStatus('idle');
          setCameraShotSaveStatus('idle');
          const initialTimeline =
            (loadInDesignReviewMode
              ? loadedProject.timelines[designReviewTimelineId]
              : undefined) ?? Object.values(loadedProject.timelines)[0];
          const initialTrack =
            (loadInDesignReviewMode
              ? initialTimeline?.tracks.find((track) => track.id === designReviewTrackId)
              : undefined) ?? initialTimeline?.tracks[0];
          dispatch({
            type: 'setMode',
            mode: 'edit',
          });
          dispatch({
            type: 'setActiveTool',
            activeTool: loadInDesignReviewMode ? 'move' : 'select',
          });
          dispatch({
            type: 'selectEntity',
            entityId:
              (loadInDesignReviewMode
                ? loadedProject.level.entities.find((entity) => entity.id === designReviewEntityId)
                    ?.id
                : undefined) ?? loadedProject.level.entities[0]?.id,
          });
          dispatch({
            type: 'selectEvent',
            eventId: Object.keys(loadedProject.events)[0],
          });
          dispatch({ type: 'selectTimeline', timelineId: initialTimeline?.id });
          dispatch({ type: 'selectTimelineTrack', trackId: initialTrack?.id });
          dispatch({
            type: 'setTimelineTime',
            timelineTime: loadInDesignReviewMode ? designReviewTimelineTime : 0,
          });
          dispatch({
            type: 'selectCameraShot',
            cameraShotId:
              (loadInDesignReviewMode
                ? loadedProject.cameraShots[designReviewCameraShotId]?.id
                : undefined) ?? Object.keys(loadedProject.cameraShots)[0],
          });
          setRightRailTab('inspector');
          setShowTriggerDebug(true);
          setSelectedAssetId(Object.keys(loadedProject.assets.assets).sort()[0]);
          if (loadInDesignReviewMode && initialTimeline) {
            const previewContext: DirectorSystemContext = {
              state: createEventRuntimeState({
                flags: { ...eventRuntimeStateRef.current.flags },
                inventory: eventRuntimeStateRef.current.inventory,
              }),
              runtime: runtimeRef.current ?? undefined,
              directorCommands: [],
              previewMode: true,
            };
            const director = new DirectorSystem(
              loadedProject.timelines,
              new EventSystem(Object.values(loadedProject.events)),
              loadedProject.cameraShots,
            );
            director.scrub(initialTimeline.id, designReviewTimelineTime, previewContext);
            let subtitleCommand: Extract<DirectorCommand, { type: 'subtitle.show' }> | undefined;

            for (const command of previewContext.directorCommands) {
              if (command.type === 'subtitle.show') {
                subtitleCommand = command;
              }
            }

            setSubtitleHud(
              subtitleCommand
                ? {
                    text: subtitleCommand.text,
                    speaker: subtitleCommand.speaker,
                  }
                : null,
            );
            setTimelinePreviewStatus(
              formatTimelinePreviewStatus(initialTimeline.id, designReviewTimelineTime, director),
            );
          }
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

      if (session?.frameId !== undefined) {
        cancelAnimationFrame(session.frameId);
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
    setTransformPreview(undefined);
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
    clearLevelSaveError(setSaveErrors);
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
    clearLevelSaveError(setSaveErrors);
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const reorderEntity = (entityId: string, beforeEntityId: string | undefined) => {
    const current = projectRef.current;

    if (!current) {
      return;
    }

    const nextLevel = reorderLevelEntities(current.level, entityId, beforeEntityId);

    if (serializeEditorData(nextLevel) === serializeEditorData(current.level)) {
      return;
    }

    commandHistoryRef.current.execute(
      new ReorderLevelEntityCommand(entityId, current.level, nextLevel),
      commandContext,
    );
    dispatch({ type: 'selectEntity', entityId });
    setTransformPreview(undefined);
    markLevelDirty(setDirtyState);
    setSaveStatus('idle');
    clearLevelSaveError(setSaveErrors);
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
      clearLevelSaveError(setSaveErrors);
    } else if (target.kind === 'event') {
      setEventSaveStatus('idle');
      clearEventSaveError(setSaveErrors, target.id);
    } else if (target.kind === 'timeline') {
      setTimelineSaveStatus('idle');
      clearTimelineSaveError(setSaveErrors, target.id);
    } else {
      setCameraShotSaveStatus('idle');
      clearCameraShotSaveError(setSaveErrors, target.id);
    }
  }

  const saveLevel = () => {
    if (!project) {
      return;
    }

    const validation = validateEditorSave(LevelSchema, project.level, 'Level');

    if (!validation.success) {
      setSaveStatus('failed');
      setLevelSaveError(setSaveErrors, validation.message);
      return;
    }

    setSaveStatus('saving');
    clearLevelSaveError(setSaveErrors);
    void saveJson(`data/levels/${project.level.id}.json`, validation.data)
      .then(() => {
        setSaveStatus('saved');
        clearLevelSaveError(setSaveErrors);
        setSavedSnapshots((current) => updateSavedLevelSnapshot(current, validation.data));
        clearLevelDirty(setDirtyState);
      })
      .catch((error: unknown) => {
        const message = formatSaveError(error);
        console.error(error);
        setSaveStatus('failed');
        setLevelSaveError(setSaveErrors, message);
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
    clearEventSaveError(setSaveErrors, event.id);
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const saveEvent = (event: EventData) => {
    const validation = validateEditorSave(EventSchema, event, 'Event');

    if (!validation.success) {
      setEventSaveStatus('failed');
      setEventSaveError(setSaveErrors, event.id, validation.message);
      return;
    }

    setEventSaveStatus('saving');
    clearEventSaveError(setSaveErrors, event.id);
    void saveJson(`data/events/${event.id}.json`, validation.data)
      .then(() => {
        setEventSaveStatus('saved');
        clearEventSaveError(setSaveErrors, event.id);
        setSavedSnapshots((current) =>
          updateSavedItemSnapshot(current, 'events', event.id, validation.data),
        );
        clearEventDirty(setDirtyState, event.id);
      })
      .catch((error: unknown) => {
        const message = formatSaveError(error);
        console.error(error);
        setEventSaveStatus('failed');
        setEventSaveError(setSaveErrors, event.id, message);
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
    clearTimelineSaveError(setSaveErrors, timelineId);
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const addSoundTrackFromAsset = (timelineId: string, soundAssetId: string, time: number) => {
    const current = projectRef.current;
    const timeline = current?.timelines[timelineId];
    const asset = current?.assets.assets[soundAssetId];

    if (!timeline || asset?.type !== 'audio') {
      return;
    }

    const track: TimelineTrackData = {
      id: createTimelineTrackId(timeline, 'sound'),
      type: 'sound',
      time: clampNumber(time, 0, timeline.duration),
      soundId: soundAssetId,
    };

    commandHistoryRef.current.execute(new AddTimelineTrackCommand(timeline, track), commandContext);
    dispatch({ type: 'selectTimeline', timelineId });
    dispatch({ type: 'selectTimelineTrack', trackId: track.id });
    markTimelineDirty(setDirtyState, timelineId);
    setTimelineSaveStatus('idle');
    clearTimelineSaveError(setSaveErrors, timelineId);
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
    clearTimelineSaveError(setSaveErrors, timelineId);
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
    clearTimelineSaveError(setSaveErrors, timelineId);
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
    clearTimelineSaveError(setSaveErrors, timelineId);
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const saveTimeline = (timeline: TimelineData) => {
    const validation = validateEditorSave(TimelineSchema, timeline, 'Timeline');

    if (!validation.success) {
      setTimelineSaveStatus('failed');
      setTimelineSaveError(setSaveErrors, timeline.id, validation.message);
      return;
    }

    setTimelineSaveStatus('saving');
    clearTimelineSaveError(setSaveErrors, timeline.id);
    void saveJson(`data/timelines/${timeline.id}.json`, validation.data)
      .then(() => {
        setTimelineSaveStatus('saved');
        clearTimelineSaveError(setSaveErrors, timeline.id);
        setSavedSnapshots((current) =>
          updateSavedItemSnapshot(current, 'timelines', timeline.id, validation.data),
        );
        clearTimelineDirty(setDirtyState, timeline.id);
      })
      .catch((error: unknown) => {
        const message = formatSaveError(error);
        console.error(error);
        setTimelineSaveStatus('failed');
        setTimelineSaveError(setSaveErrors, timeline.id, message);
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
    clearLevelSaveError(setSaveErrors);
    clearCameraShotSaveError(setSaveErrors, shot.id);
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
    clearCameraShotSaveError(setSaveErrors, shot.id);
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const saveCameraShot = (shot: CameraShotData) => {
    const validation = validateEditorSave(CameraShotSchema, shot, 'Camera shot');

    if (!validation.success) {
      setCameraShotSaveStatus('failed');
      setCameraShotSaveError(setSaveErrors, shot.id, validation.message);
      return;
    }

    setCameraShotSaveStatus('saving');
    clearCameraShotSaveError(setSaveErrors, shot.id);
    void saveJson(`data/cameraShots/${shot.id}.json`, validation.data)
      .then(() => {
        setCameraShotSaveStatus('saved');
        clearCameraShotSaveError(setSaveErrors, shot.id);
        setSavedSnapshots((current) =>
          updateSavedItemSnapshot(current, 'cameraShots', shot.id, validation.data),
        );
        clearCameraShotDirty(setDirtyState, shot.id);
      })
      .catch((error: unknown) => {
        const message = formatSaveError(error);
        console.error(error);
        setCameraShotSaveStatus('failed');
        setCameraShotSaveError(setSaveErrors, shot.id, message);
      });
  };

  const setCameraKeyFromView = (shot: CameraShotData, keyIndex: number) => {
    if (shot.type !== 'keyframed') {
      return;
    }

    const key = shot.keys[keyIndex];
    const selectedPosition = selectedEntity?.transform.position;
    const position: CameraShotKeyData['position'] = selectedPosition
      ? [selectedPosition[0], selectedPosition[1] + 1.5, selectedPosition[2] - 4]
      : cloneCameraPoint(key.position);
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
    const runtime = runtimeRef.current;

    if (runtime) {
      new DirectorCameraSystem(runtime).applyShot(shot, time);
    }

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
      frameId: undefined,
      lastFrameTime: undefined,
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

    if (session.frameId !== undefined) {
      cancelAnimationFrame(session.frameId);
      session.frameId = undefined;
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

  const clearDebugState = () => {
    directorCommandsRef.current.length = 0;
    setDebugCopyStatus(undefined);
    setEventDebugState((current) => ({
      ...current,
      firedEventIds: [],
      directorCommands: [],
    }));
  };

  const setRuntimeFlag = (flag: string, value: FlagValue) => {
    const normalizedFlag = flag.trim();

    if (!normalizedFlag) {
      return;
    }

    eventRuntimeStateRef.current.flags = {
      ...eventRuntimeStateRef.current.flags,
      [normalizedFlag]: value,
    };
    setEventRuntimePreviewState(cloneEventRuntimeState(eventRuntimeStateRef.current));
    setDebugCopyStatus(undefined);
    setEventDebugState((current) =>
      createEventDebugState(
        current.firedEventIds,
        eventRuntimeStateRef.current,
        directorCommandsRef.current,
      ),
    );
  };

  const toggleRuntimeFlag = (flag: string) => {
    const currentValue = eventRuntimeStateRef.current.flags[flag];
    setRuntimeFlag(flag, typeof currentValue === 'boolean' ? !currentValue : true);
  };

  const fireSelectedEvent = () => {
    if (!selectedEvent) {
      return;
    }

    const context = {
      state: eventRuntimeStateRef.current,
      runtime: runtimeRef.current ?? undefined,
      directorCommands: directorCommandsRef.current,
    };

    new ActionSystem().dispatchAll(selectedEvent.actions, context);
    const debugCommands = [...directorCommandsRef.current];
    consumeRuntimeEffectCommands(directorCommandsRef.current);
    setEventRuntimePreviewState(cloneEventRuntimeState(eventRuntimeStateRef.current));
    setDebugCopyStatus(undefined);
    setEventDebugState(
      createEventDebugState([selectedEvent.id], eventRuntimeStateRef.current, debugCommands),
    );
  };

  const replaySelectedTimeline = () => {
    if (!selectedTimeline) {
      return;
    }

    playTimeline(selectedTimeline.id);
  };

  const copyDebugSnapshot = () => {
    const snapshot = {
      selectedEventId: selectedEvent?.id,
      selectedTimelineId: selectedTimeline?.id,
      firedEventIds: eventDebugState.firedEventIds,
      flags: eventDebugState.flags,
      doors: eventDebugState.doorStates,
      directorCommands: eventDebugState.directorCommands.map((command) => command.type),
    };
    const text = JSON.stringify(snapshot, null, 2);

    if (!navigator.clipboard) {
      setDebugCopyStatus('Clipboard unavailable');
      return;
    }

    void navigator.clipboard
      .writeText(text)
      .then(() => setDebugCopyStatus('Snapshot copied'))
      .catch(() => setDebugCopyStatus('Clipboard unavailable'));
  };

  function createTimelinePreviewContext(): DirectorSystemContext {
    return {
      state: createEventRuntimeState({
        flags: { ...eventRuntimeStateRef.current.flags },
        inventory: eventRuntimeStateRef.current.inventory,
      }),
      runtime: runtimeRef.current ?? undefined,
      directorCommands: [],
      previewMode: true,
    };
  }

  const cancelTimelinePlaybackFrame = () => {
    const session = timelinePlaybackRef.current;

    if (session?.frameId !== undefined) {
      cancelAnimationFrame(session.frameId);
      session.frameId = undefined;
    }
  };

  const scheduleTimelinePlaybackFrame = (session: TimelinePlaybackSession) => {
    if (session.frameId !== undefined) {
      cancelAnimationFrame(session.frameId);
    }

    session.lastFrameTime = undefined;
    const frame = (now: number) => {
      if (timelinePlaybackRef.current !== session) {
        return;
      }

      const previousTime = session.lastFrameTime ?? now;
      const deltaSeconds = clampNumber((now - previousTime) / 1000, 0, 0.05);
      session.lastFrameTime = now;

      session.director.update(deltaSeconds, session.context);
      consumeRuntimeEffectCommands(session.context.directorCommands);
      const state = session.director.getTimelineState(session.timelineId);

      if (!state) {
        session.frameId = undefined;
        timelinePlaybackRef.current = null;
        setTimelinePlaybackStatus('stopped');
        return;
      }

      dispatch({ type: 'setTimelineTime', timelineTime: state.time });
      setTimelinePlaybackStatus(state.status);
      setTimelinePreviewStatus(`${session.timelineId} @ ${state.time.toFixed(2)}s`);

      if (state.status !== 'playing') {
        session.frameId = undefined;
        timelinePlaybackRef.current = null;
        return;
      }

      session.frameId = requestAnimationFrame(frame);
    };

    session.frameId = requestAnimationFrame(frame);
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
    setEventRuntimePreviewState(cloneEventRuntimeState(eventRuntimeStateRef.current));

    setEventDebugState(
      createEventDebugState(firedEventIds, eventRuntimeStateRef.current, debugCommands),
    );
  };

  function consumeRuntimeEffectCommands(commands: DirectorCommand[]): {
    subtitles: number;
    sounds: number;
  } {
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
  }

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

  function clearSubtitle() {
    if (subtitleTimerRef.current !== undefined) {
      clearTimeout(subtitleTimerRef.current);
      subtitleTimerRef.current = undefined;
    }

    setSubtitleHud(null);
  }

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

    let startedAt: number | undefined;
    const durationMs = Math.max(1, command.duration * 1000);

    const sample = (now: number) => {
      startedAt ??= now;
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
          <h1>Sinan Director</h1>
          <span>Scene editing workspace</span>
        </div>
        <div className="topbar-controls">
          <div className="toolbar-cluster toolbar-cluster-mode">
            <span className="toolbar-label">Mode</span>
            <nav className="segmented-control" aria-label="Editor modes">
              {editorModeOptions.map((mode) => (
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
          {shellModeState.showEditorToolbarControls ? (
            <>
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
                  <span
                    className={`domain-status ${timelineStatusPill.className}`}
                    role="status"
                    aria-label={`Timeline save state: ${timelineStatusPill.text}`}
                    title={`Timeline: ${timelineStatusPill.text}`}
                  >
                    TL
                  </span>
                  <span
                    className={`domain-status ${eventStatusPill.className}`}
                    role="status"
                    aria-label={`Event save state: ${eventStatusPill.text}`}
                    title={`Event: ${eventStatusPill.text}`}
                  >
                    EV
                  </span>
                  <span
                    className={`domain-status ${cameraStatusPill.className}`}
                    role="status"
                    aria-label={`Camera save state: ${cameraStatusPill.text}`}
                    title={`Camera: ${cameraStatusPill.text}`}
                  >
                    CAM
                  </span>
                  {saveErrors.level ? (
                    <span className="save-error" role="alert" title={saveErrors.level}>
                      {saveErrors.level}
                    </span>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div
              className="toolbar-cluster toolbar-cluster-showcase"
              data-testid="showcase-topbar-status"
            >
              <span className="toolbar-label">Status</span>
              <span className="showcase-topbar-pill">{showcaseHud.jobCount} jobs</span>
              <span className="showcase-topbar-pill">{showcaseHud.endpointCount} endpoints</span>
            </div>
          )}
        </div>
      </header>

      <main className="editor-workbench">
        {shellModeState.showEditorPanels ? (
          <aside className="editor-panel editor-panel-left" aria-labelledby="hierarchy-heading">
            <HierarchyPanel
              level={project?.level ?? null}
              selectedEntityId={editorState.selectedEntityId}
              onSelectEntity={(entityId) => {
                dispatch({ type: 'selectEntity', entityId });
                setTransformPreview(undefined);
                setRightRailTab('inspector');
              }}
              onReorderEntity={reorderEntity}
            />
            <AssetPanel
              assets={project?.assets ?? null}
              selectedAssetId={selectedAssetId}
              onSelectAsset={setSelectedAssetId}
            />
            {projectError ? <p className="panel-error">{projectError}</p> : null}
          </aside>
        ) : null}

        <section className="viewport-region" aria-label={editorPanelLayout[1].title}>
          <Viewport
            autoFocus={shellModeState.viewportAutoFocus}
            mode={shellModeState.mode}
            project={project}
            selectionEnabled={shellModeState.selectionEnabled}
            showTriggerDebug={shellModeState.showTriggerDebug}
            selectedEntityId={editorState.selectedEntityId}
            activeTool={shellModeState.viewportActiveTool}
            onSelectEntity={(entityId) => {
              dispatch({ type: 'selectEntity', entityId });
              setTransformPreview(undefined);
              setRightRailTab('inspector');
            }}
            onTransformPreview={(entityId, transform) => {
              setTransformPreview({ entityId, transform });
            }}
            onTransformCommit={commitTransform}
            onRuntimeReady={(runtime) => {
              runtimeRef.current = runtime;
            }}
          />
          {shellModeState.isShowcase ? (
            <div className="showcase-hud" data-testid="showcase-hud" role="status">
              <div className="showcase-hud-title">
                <span>Showcase Mode</span>
                <strong>{showcaseHud.title}</strong>
              </div>
              <dl className="showcase-hud-stats">
                <div>
                  <dt>Job</dt>
                  <dd>{showcaseHud.activeJobId ?? 'none'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{formatDeliveryStatus(showcaseHud.activeJobStatus)}</dd>
                </div>
                <div>
                  <dt>Endpoints</dt>
                  <dd>{showcaseHud.endpointCount}</dd>
                </div>
              </dl>
              <p>{showcaseHud.prompt}</p>
            </div>
          ) : (
            <div className="viewport-overlay" aria-label="Viewport selection summary">
              <div className="selection-tag">
                {visibleSelectedEntity
                  ? `Selected: ${visibleSelectedEntity.id} [${formatOverlayPosition(
                      visibleSelectedEntity.transform.position,
                    )}]`
                  : 'No entity selected'}
              </div>
              <div className="telemetry-line">
                {`Mode: ${formatMode(editorState.mode).toUpperCase()} / ${formatTool(
                  editorState.activeTool,
                ).toUpperCase()} | timeline: ${
                  selectedTimeline ? selectedTimeline.id : 'none'
                } @ ${editorState.timelineTime.toFixed(2)}s`}
              </div>
            </div>
          )}
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

        {shellModeState.showEditorPanels ? (
          <aside className="editor-panel editor-panel-right" aria-label="Editor details">
            <div className="right-rail-tabs" role="tablist" aria-label="Editor detail panels">
              <RightRailTabButton
                tab="inspector"
                label="Inspector"
                activeTab={rightRailTab}
                tone={visibleDirtyState.level ? 'warning' : undefined}
                onSelect={setRightRailTab}
              />
              <RightRailTabButton
                tab="event"
                label="Event"
                activeTab={rightRailTab}
                tone={
                  selectedEventSaveError ? 'error' : selectedEventIsDirty ? 'warning' : undefined
                }
                onSelect={setRightRailTab}
              />
              <RightRailTabButton
                tab="camera"
                label="Camera"
                activeTab={rightRailTab}
                tone={
                  selectedCameraShotSaveError
                    ? 'error'
                    : selectedCameraShotIsDirty
                      ? 'warning'
                      : undefined
                }
                onSelect={setRightRailTab}
              />
              <RightRailTabButton
                tab="debug"
                label="Debug"
                activeTab={rightRailTab}
                onSelect={setRightRailTab}
              />
            </div>

            <div className="right-rail-panel" role="tabpanel">
              {rightRailTab === 'inspector' ? (
                <InspectorPanel
                  entity={visibleSelectedEntity}
                  onApplyTransform={commitTransform}
                  onApplyComponent={commitEntityComponent}
                  onTranslateSelected={translateSelectedEntity}
                  onInteractSelected={selectedEntity ? interactSelectedEntity : undefined}
                />
              ) : null}
              {rightRailTab === 'event' ? (
                <EventInspector
                  events={events}
                  selectedEvent={selectedEvent}
                  saveStatus={eventSaveStatus}
                  isDirty={selectedEventIsDirty}
                  saveError={selectedEventSaveError}
                  entityIds={getEntityIds(project)}
                  timelineIds={timelines.map((timeline) => timeline.id)}
                  cameraShotIds={cameraShots.map((shot) => shot.id)}
                  soundAssetIds={getSoundAssetIds(project)}
                  runtimeState={eventRuntimePreviewState}
                  onSelectEvent={(eventId) => dispatch({ type: 'selectEvent', eventId })}
                  onApplyEvent={applyEvent}
                  onSaveEvent={saveEvent}
                />
              ) : null}
              {rightRailTab === 'camera' ? (
                <CameraShotPanel
                  shots={cameraShots}
                  selectedShot={selectedCameraShot}
                  selectedEntityId={selectedEntity?.id}
                  saveStatus={cameraShotSaveStatus}
                  isDirty={selectedCameraShotIsDirty}
                  saveError={selectedCameraShotSaveError}
                  previewStatus={cameraPreviewStatus}
                  onSelectShot={(cameraShotId) =>
                    dispatch({ type: 'selectCameraShot', cameraShotId })
                  }
                  onCreateShot={createCameraShot}
                  onApplyShot={applyCameraShot}
                  onSaveShot={saveCameraShot}
                  onSetKeyFromView={setCameraKeyFromView}
                  onPreviewShot={previewCameraShot}
                />
              ) : null}
              {rightRailTab === 'debug' ? (
                <EventDebugPanel
                  debugState={eventDebugState}
                  selectedEventId={selectedEvent?.id}
                  selectedTimelineId={selectedTimeline?.id}
                  copyStatus={debugCopyStatus}
                  onClearDebug={clearDebugState}
                  onSetFlag={setRuntimeFlag}
                  onToggleFlag={toggleRuntimeFlag}
                  onFireSelectedEvent={fireSelectedEvent}
                  onReplayTimeline={replaySelectedTimeline}
                  onCopySnapshot={copyDebugSnapshot}
                />
              ) : null}
            </div>
          </aside>
        ) : null}
      </main>

      {shellModeState.showTimeline ? (
        <footer className="sequencer" aria-label={editorPanelLayout[3].title}>
          <TimelinePanel
            timelines={timelines}
            selectedTimeline={selectedTimeline}
            selectedTrackId={editorState.selectedTimelineTrackId}
            currentTime={editorState.timelineTime}
            saveStatus={timelineSaveStatus}
            isDirty={selectedTimelineIsDirty}
            saveError={selectedTimelineSaveError}
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
            onAddSoundTrackFromAsset={addSoundTrackFromAsset}
            onApplyTrack={applyTimelineTrack}
            onApplyTrackItem={applyTimelineTrackItem}
            onRemoveTrack={removeTimelineTrack}
            onSaveTimeline={saveTimeline}
          />
        </footer>
      ) : null}
    </div>
  );
}

interface RightRailTabButtonProps {
  tab: RightRailTab;
  label: string;
  activeTab: RightRailTab;
  tone?: 'warning' | 'error';
  onSelect: (tab: RightRailTab) => void;
}

function RightRailTabButton({ tab, label, activeTab, tone, onSelect }: RightRailTabButtonProps) {
  const isActive = tab === activeTab;
  const toneClassName = tone ? ` has-${tone}` : '';

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={`right-rail-tab${isActive ? ' is-active' : ''}${toneClassName}`}
      onClick={() => onSelect(tab)}
    >
      {label}
    </button>
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

interface SaveErrorState {
  level?: string;
  events: Record<string, string | undefined>;
  timelines: Record<string, string | undefined>;
  cameraShots: Record<string, string | undefined>;
}

interface SavedDataSnapshot {
  level: string;
  events: Record<string, string>;
  timelines: Record<string, string>;
  cameraShots: Record<string, string>;
}

interface EditorSaveIssue {
  path: readonly unknown[];
  message: string;
}

interface EditorSaveSchema<T> {
  safeParse(
    value: unknown,
  ): { success: true; data: T } | { success: false; error: { issues: readonly EditorSaveIssue[] } };
}

type EditorSaveValidation<T> = { success: true; data: T } | { success: false; message: string };

type DirtyStateSetter = Dispatch<SetStateAction<DirtyState>>;
type SaveErrorStateSetter = Dispatch<SetStateAction<SaveErrorState>>;

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
  frameId: number | undefined;
  lastFrameTime: number | undefined;
}

function formatMode(mode: EditorMode): string {
  return mode[0].toUpperCase() + mode.slice(1);
}

function formatTool(tool: ActiveTool): string {
  return tool[0].toUpperCase() + tool.slice(1);
}

function formatDeliveryStatus(status: string): string {
  if (status === 'readyToDeliver') {
    return 'Ready';
  }

  if (status === 'inProgress') {
    return 'In progress';
  }

  return status[0].toUpperCase() + status.slice(1);
}

function formatOverlayPosition(position: readonly number[]): string {
  return position.map((value) => Number(value.toFixed(2))).join(', ');
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

function createDesignReviewDirtyState(dirtyState: DirtyState, project: ProjectData): DirtyState {
  if (!project.timelines[designReviewTimelineId]) {
    return dirtyState;
  }

  return {
    ...dirtyState,
    timelineIds: addDirtyId(dirtyState.timelineIds, designReviewTimelineId),
  };
}

function createCleanSaveErrorState(): SaveErrorState {
  return {
    events: {},
    timelines: {},
    cameraShots: {},
  };
}

function isDesignReviewModeEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('designReview') === '1';
}

function createSavedDataSnapshot(project: ProjectData): SavedDataSnapshot {
  return {
    level: serializeEditorData(project.level),
    events: serializeEditorDataMap(project.events),
    timelines: serializeEditorDataMap(project.timelines),
    cameraShots: serializeEditorDataMap(project.cameraShots),
  };
}

function computeDirtyState(project: ProjectData, saved: SavedDataSnapshot): DirtyState {
  return {
    level: serializeEditorData(project.level) !== saved.level,
    eventIds: collectDirtySnapshotIds(project.events, saved.events),
    timelineIds: collectDirtySnapshotIds(project.timelines, saved.timelines),
    cameraShotIds: collectDirtySnapshotIds(project.cameraShots, saved.cameraShots),
  };
}

function updateSavedLevelSnapshot(
  current: SavedDataSnapshot | null,
  level: LevelData,
): SavedDataSnapshot | null {
  if (!current) {
    return current;
  }

  return {
    ...current,
    level: serializeEditorData(level),
  };
}

function updateSavedItemSnapshot<T>(
  current: SavedDataSnapshot | null,
  collection: 'cameraShots' | 'events' | 'timelines',
  id: string,
  data: T,
): SavedDataSnapshot | null {
  if (!current) {
    return current;
  }

  return {
    ...current,
    [collection]: {
      ...current[collection],
      [id]: serializeEditorData(data),
    },
  };
}

function clearLevelSaveError(setSaveErrors: SaveErrorStateSetter): void {
  setSaveErrors((current) => ({ ...current, level: undefined }));
}

function setLevelSaveError(setSaveErrors: SaveErrorStateSetter, message: string): void {
  setSaveErrors((current) => ({ ...current, level: message }));
}

function clearEventSaveError(setSaveErrors: SaveErrorStateSetter, eventId: string): void {
  setSaveErrors((current) => ({
    ...current,
    events: { ...current.events, [eventId]: undefined },
  }));
}

function setEventSaveError(
  setSaveErrors: SaveErrorStateSetter,
  eventId: string,
  message: string,
): void {
  setSaveErrors((current) => ({
    ...current,
    events: { ...current.events, [eventId]: message },
  }));
}

function clearTimelineSaveError(setSaveErrors: SaveErrorStateSetter, timelineId: string): void {
  setSaveErrors((current) => ({
    ...current,
    timelines: { ...current.timelines, [timelineId]: undefined },
  }));
}

function setTimelineSaveError(
  setSaveErrors: SaveErrorStateSetter,
  timelineId: string,
  message: string,
): void {
  setSaveErrors((current) => ({
    ...current,
    timelines: { ...current.timelines, [timelineId]: message },
  }));
}

function clearCameraShotSaveError(setSaveErrors: SaveErrorStateSetter, cameraShotId: string): void {
  setSaveErrors((current) => ({
    ...current,
    cameraShots: { ...current.cameraShots, [cameraShotId]: undefined },
  }));
}

function setCameraShotSaveError(
  setSaveErrors: SaveErrorStateSetter,
  cameraShotId: string,
  message: string,
): void {
  setSaveErrors((current) => ({
    ...current,
    cameraShots: { ...current.cameraShots, [cameraShotId]: message },
  }));
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

  if (parts[0] === 'level') {
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

function serializeEditorDataMap<T>(items: Readonly<Record<string, T>>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(items).map(([id, item]) => [id, serializeEditorData(item)]),
  );
}

function collectDirtySnapshotIds<T>(
  currentItems: Readonly<Record<string, T>>,
  savedItems: Readonly<Record<string, string>>,
): ReadonlySet<string> {
  const ids = new Set([...Object.keys(currentItems), ...Object.keys(savedItems)]);
  const dirtyIds = new Set<string>();

  for (const id of ids) {
    const currentItem = currentItems[id];

    if (currentItem === undefined || serializeEditorData(currentItem) !== savedItems[id]) {
      dirtyIds.add(id);
    }
  }

  return dirtyIds;
}

function serializeEditorData(data: unknown): string {
  return JSON.stringify(data);
}

function validateEditorSave<T>(
  schema: EditorSaveSchema<T>,
  data: unknown,
  label: string,
): EditorSaveValidation<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      message: `${label} save blocked: ${formatEditorSaveIssues(result.error.issues)}`,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

function formatEditorSaveIssues(issues: readonly EditorSaveIssue[]): string {
  return issues
    .slice(0, 5)
    .map((issue) => {
      const issuePath = issue.path.map((segment) => String(segment)).join('.') || 'data';
      return `${issuePath}: ${issue.message}`;
    })
    .join('; ');
}

function formatSaveError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Save failed.';
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

function reorderLevelEntities(
  level: LevelData,
  entityId: string,
  beforeEntityId: string | undefined,
): LevelData {
  if (entityId === beforeEntityId) {
    return level;
  }

  const sourceIndex = level.entities.findIndex((entity) => entity.id === entityId);

  if (sourceIndex < 0) {
    return level;
  }

  const entities = [...level.entities];
  const [entity] = entities.splice(sourceIndex, 1);
  const insertIndex =
    beforeEntityId === undefined
      ? entities.length
      : entities.findIndex((item) => item.id === beforeEntityId);

  if (insertIndex < 0 || !entity) {
    return level;
  }

  entities.splice(insertIndex, 0, entity);

  return {
    ...level,
    entities,
  };
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

function updateProjectLevel(project: ProjectData | null, level: LevelData): ProjectData | null {
  if (!project) {
    return project;
  }

  return {
    ...project,
    level,
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
    case 'material.parameter':
      return {
        id,
        type: 'material.parameter',
        target: entityId,
        slot: 'main',
        parameter: 'progress',
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

function cloneCameraPoint(point: CameraShotKeyData['position']): CameraShotKeyData['position'] {
  return Array.isArray(point)
    ? [point[0], point[1], point[2]]
    : {
        ...point,
        localPosition: [point.localPosition[0], point.localPosition[1], point.localPosition[2]],
      };
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

function cloneEventRuntimeState(state: EventRuntimeState): EventRuntimeState {
  return {
    flags: { ...state.flags },
    inventory: new Set(state.inventory),
    questStates: { ...state.questStates },
    entityStates: { ...state.entityStates },
    entityEnabled: { ...state.entityEnabled },
    entityTransforms: { ...state.entityTransforms },
    entityVisibility: { ...state.entityVisibility },
    doorStates: { ...state.doorStates },
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
