import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent,
} from 'react';

import { getPreviewStatusPill, getSaveStatusPill, type EditorSaveStatus } from '../editorStatus';
import { ActionSchema, type ActionData } from '../../schemas/action.schema';
import {
  TimelineSchema,
  type TimelineData,
  type TimelineTrackData,
} from '../../schemas/timeline.schema';
import { NumericScrubInput } from '../components/NumericScrubInput';

export type TimelineSaveStatus = EditorSaveStatus;
export type TimelineTrackKind = TimelineTrackData['type'];
export type TimelineItemOperation = 'add' | 'update' | 'remove';

type PropertyTimelineTrack = Extract<TimelineTrackData, { type: 'property' }>;
type PropertyTimelineKey = PropertyTimelineTrack['keys'][number];
type TimelineDragMode = 'scrub' | 'move' | 'resize-left' | 'resize-right';

interface TimelinePointerDrag {
  pointerId: number;
  mode: TimelineDragMode;
  startX: number;
  startTime: number;
  startScrollLeft: number;
  timelineId: string;
  duration: number;
  track?: TimelineTrackData;
}

interface TimelineDragPreview {
  timelineId: string;
  trackId: string;
  mode: Exclude<TimelineDragMode, 'scrub'>;
  originalTrack: TimelineTrackData;
  previewTrack: TimelineTrackData;
  startX: number;
}

interface TimelineAutoScrollState {
  shell: HTMLElement;
  content: HTMLElement;
  direction: -1 | 1;
  clientX: number;
  snap: boolean;
  frameId?: number;
}

const timelineLabelColumnWidth = 120;
const timelineDragThresholdPx = 3;
const timelineSnapSeconds = 0.05;
const timelineAutoScrollEdgePx = 48;
const timelineAutoScrollStepPx = 18;

export interface TimelinePanelProps {
  timelines: readonly TimelineData[];
  selectedTimeline: TimelineData | undefined;
  selectedTrackId: string | undefined;
  currentTime: number;
  saveStatus: TimelineSaveStatus;
  isDirty: boolean;
  saveError?: string;
  playbackStatus: 'stopped' | 'playing' | 'paused';
  previewStatus: string;
  entityIds: readonly string[];
  cameraShotIds: readonly string[];
  soundAssetIds: readonly string[];
  onSelectTimeline: (timelineId: string) => void;
  onSelectTrack: (trackId: string | undefined) => void;
  onScrubTimeline: (timelineId: string, time: number) => void;
  onPlayTimeline: (timelineId: string) => void;
  onPauseTimeline: () => void;
  onResumeTimeline: () => void;
  onStopTimeline: () => void;
  onSeekTimeline: (timelineId: string, time: number) => void;
  onAddTrack: (timelineId: string, trackType: TimelineTrackKind) => void;
  onAddSoundTrackFromAsset?: (timelineId: string, soundAssetId: string, time: number) => void;
  onApplyTrack: (timelineId: string, track: TimelineTrackData) => void;
  onApplyTrackItem: (
    timelineId: string,
    track: TimelineTrackData,
    operation: TimelineItemOperation,
    itemLabel: string,
  ) => void;
  onRemoveTrack: (timelineId: string, trackId: string) => void;
  onSaveTimeline: (timeline: TimelineData) => void;
}

const TRACK_TYPES: TimelineTrackKind[] = [
  'action',
  'animation.play',
  'camera.shot',
  'property',
  'subtitle',
  'sound',
];

export function TimelinePanel({
  timelines,
  selectedTimeline,
  selectedTrackId,
  currentTime,
  saveStatus,
  isDirty,
  saveError,
  playbackStatus,
  previewStatus,
  entityIds,
  cameraShotIds,
  soundAssetIds,
  onSelectTimeline,
  onSelectTrack,
  onScrubTimeline,
  onPlayTimeline,
  onPauseTimeline,
  onResumeTimeline,
  onStopTimeline,
  onSeekTimeline,
  onAddTrack,
  onAddSoundTrackFromAsset,
  onApplyTrack,
  onApplyTrackItem,
  onRemoveTrack,
  onSaveTimeline,
}: TimelinePanelProps) {
  const [trackType, setTrackType] = useState<TimelineTrackKind>('action');
  const [draftTrackState, setDraftTrackState] = useState<{
    timelineId: string;
    trackId: string;
    sourceSignature: string;
    track: TimelineTrackData;
  }>();
  const [keyIndexState, setKeyIndexState] = useState({ timelineId: '', trackId: '', index: 0 });
  const [draftKeyState, setDraftKeyState] = useState<{
    timelineId: string;
    trackId: string;
    index: number;
    sourceSignature: string;
    key: PropertyTimelineKey;
  }>();
  const [snapTooltipState, setSnapTooltipState] = useState<{
    time: number;
    x: number;
    mode: 'free' | 'snap';
  }>();
  const [actionPayloadState, setActionPayloadState] = useState({
    timelineId: '',
    trackId: '',
    sourceSignature: '',
    json: '',
  });
  const [dragPreviewState, setDragPreviewState] = useState<TimelineDragPreview | undefined>();
  const [timelineScale, setTimelineScale] = useState(1);
  const [assetDropActive, setAssetDropActive] = useState(false);
  const timelineDragRef = useRef<TimelinePointerDrag | undefined>(undefined);
  const timelineShellRef = useRef<HTMLDivElement | null>(null);
  const timelineAutoScrollRef = useRef<TimelineAutoScrollState | undefined>(undefined);
  const pendingDragPreviewRef = useRef<TimelineDragPreview | undefined>(undefined);
  const dragPreviewFrameRef = useRef<number | undefined>(undefined);
  const renderedTracks =
    selectedTimeline && dragPreviewState?.timelineId === selectedTimeline.id
      ? selectedTimeline.tracks.map((track) =>
          track.id === dragPreviewState.trackId ? dragPreviewState.previewTrack : track,
        )
      : (selectedTimeline?.tracks ?? []);
  const selectedTrack =
    renderedTracks.find((track) => track.id === selectedTrackId) ?? renderedTracks[0];
  const selectedTrackSignature = selectedTrack ? JSON.stringify(selectedTrack) : '';
  const draftTrack =
    selectedTimeline &&
    selectedTrack &&
    draftTrackState?.timelineId === selectedTimeline.id &&
    draftTrackState.trackId === selectedTrack.id &&
    draftTrackState.sourceSignature === selectedTrackSignature
      ? draftTrackState.track
      : selectedTrack;
  const timelineTime = clampTime(currentTime, selectedTimeline?.duration ?? 0);
  const playheadPercent =
    selectedTimeline && selectedTimeline.duration > 0
      ? `${(timelineTime / selectedTimeline.duration) * 100}%`
      : '0%';
  const selectedTrackBinding = draftTrack ? formatTrackBinding(draftTrack) : 'No track selected';
  const selectedTrackImplementation = draftTrack
    ? formatTrackImplementation(draftTrack)
    : 'TimelinePanel';
  const scrubSelectedTimeline = (time: number) => {
    if (selectedTimeline) {
      onScrubTimeline(selectedTimeline.id, time);
    }
  };
  const getPointerTimelineTime = (clientX: number, element: HTMLElement): number => {
    if (!selectedTimeline) {
      return 0;
    }

    const rect = element.getBoundingClientRect();
    const usableWidth = Math.max(1, rect.width - timelineLabelColumnWidth);
    const x = clientX - rect.left - timelineLabelColumnWidth;

    return clampTime((x / usableWidth) * selectedTimeline.duration, selectedTimeline.duration);
  };
  const handleTimelineAssetDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!selectedTimeline || !onAddSoundTrackFromAsset || !hasDraggedAsset(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setAssetDropActive(true);
  };
  const handleTimelineAssetDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!selectedTimeline || !onAddSoundTrackFromAsset) {
      return;
    }

    const assetId = getDraggedAssetId(event);

    if (!assetId) {
      return;
    }

    const timelineContent = event.currentTarget.querySelector('.timeline-content');
    const time =
      timelineContent instanceof HTMLElement
        ? getPointerTimelineTime(event.clientX, timelineContent)
        : timelineTime;

    event.preventDefault();
    setAssetDropActive(false);
    onAddSoundTrackFromAsset(selectedTimeline.id, assetId, snapTimelineTime(time));
  };
  const handleTimelineWheel = (event: WheelEvent) => {
    if (!event.ctrlKey) {
      return;
    }

    event.preventDefault();
    const shell = event.currentTarget;

    if (!(shell instanceof HTMLElement)) {
      return;
    }

    const rect = shell.getBoundingClientRect();
    const cursorOffset = event.clientX - rect.left;

    setTimelineScale((current) => {
      const nextScale = clampNumber(current + (event.deltaY < 0 ? 0.12 : -0.12), 0.72, 2.4);
      const oldWidth = 900 * current;
      const nextWidth = 900 * nextScale;
      const timeUnderCursor = (shell.scrollLeft + cursorOffset) / Math.max(1, oldWidth);

      window.requestAnimationFrame(() => {
        shell.scrollLeft = Math.max(0, timeUnderCursor * nextWidth - cursorOffset);
      });

      return nextScale;
    });
  };
  const startTimelineScrub = (event: PointerEvent<HTMLDivElement>) => {
    if (!selectedTimeline || event.button !== 0 || isTimelineClipTarget(event.target)) {
      return;
    }

    const time = getPointerTimelineTime(event.clientX, event.currentTarget);
    timelineDragRef.current = {
      pointerId: event.pointerId,
      mode: 'scrub',
      startX: event.clientX,
      startTime: time,
      startScrollLeft: getTimelineShellScrollLeft(event.currentTarget),
      timelineId: selectedTimeline.id,
      duration: selectedTimeline.duration,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubSelectedTimeline(time);
  };
  const startPlayheadDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!selectedTimeline || event.button !== 0) {
      return;
    }

    const timelineContent = event.currentTarget.closest('.timeline-content');

    if (!(timelineContent instanceof HTMLElement)) {
      return;
    }

    const time = getPointerTimelineTime(event.clientX, timelineContent);
    timelineDragRef.current = {
      pointerId: event.pointerId,
      mode: 'scrub',
      startX: event.clientX,
      startTime: time,
      startScrollLeft: getTimelineShellScrollLeft(timelineContent),
      timelineId: selectedTimeline.id,
      duration: selectedTimeline.duration,
    };
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubSelectedTimeline(time);
  };
  const startClipDrag = (
    event: PointerEvent<HTMLElement>,
    track: TimelineTrackData,
    mode: Exclude<TimelineDragMode, 'scrub'>,
  ) => {
    if (!selectedTimeline || event.button !== 0) {
      return;
    }

    if ((mode === 'resize-left' || mode === 'resize-right') && !isTrackResizable(track)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    timelineDragRef.current = {
      pointerId: event.pointerId,
      mode,
      startX: event.clientX,
      startTime: getTrackStartTime(track),
      startScrollLeft: getTimelineShellScrollLeft(event.currentTarget),
      timelineId: selectedTimeline.id,
      duration: selectedTimeline.duration,
      track,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    queueTimelineDragPreview({
      timelineId: selectedTimeline.id,
      trackId: track.id,
      mode,
      originalTrack: track,
      previewTrack: track,
      startX: event.clientX,
    });
    onSelectTrack(track.id);
  };
  const updateTimelinePointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = timelineDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId || !selectedTimeline) {
      return;
    }

    if (drag.mode === 'scrub') {
      scrubSelectedTimeline(getPointerTimelineTime(event.clientX, event.currentTarget));
      return;
    }

    if (drag.track) {
      const snap = !event.altKey;

      updateTimelineDragPreview(event.currentTarget, event.clientX, snap);
      updateTimelineAutoScroll(event.currentTarget, event.clientX, snap);
    }
  };
  const finishTimelinePointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = timelineDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId || !selectedTimeline) {
      return;
    }

    if (drag.mode === 'scrub') {
      timelineDragRef.current = undefined;
      scrubSelectedTimeline(getPointerTimelineTime(event.clientX, event.currentTarget));
      return;
    }

    timelineDragRef.current = undefined;
    setSnapTooltipState(undefined);
    stopTimelineAutoScroll();
    clearTimelineDragPreview();

    if (!drag.track || Math.abs(event.clientX - drag.startX) < timelineDragThresholdPx) {
      return;
    }

    const nextTrack = getPreviewTrackForDrag(drag, event.clientX, event.currentTarget, {
      snap: !event.altKey,
    });

    if (JSON.stringify(nextTrack) !== JSON.stringify(drag.track)) {
      onApplyTrack(selectedTimeline.id, nextTrack);
    }
  };
  function queueTimelineDragPreview(preview: TimelineDragPreview): void {
    pendingDragPreviewRef.current = preview;

    if (dragPreviewFrameRef.current !== undefined) {
      return;
    }

    dragPreviewFrameRef.current = window.requestAnimationFrame(() => {
      dragPreviewFrameRef.current = undefined;
      setDragPreviewState(pendingDragPreviewRef.current);
    });
  }

  function clearTimelineDragPreview(): void {
    pendingDragPreviewRef.current = undefined;
    setSnapTooltipState(undefined);

    if (dragPreviewFrameRef.current !== undefined) {
      window.cancelAnimationFrame(dragPreviewFrameRef.current);
      dragPreviewFrameRef.current = undefined;
    }

    setDragPreviewState(undefined);
  }

  function cancelTimelineDrag(): void {
    timelineDragRef.current = undefined;
    setSnapTooltipState(undefined);
    stopTimelineAutoScroll();
    clearTimelineDragPreview();
  }

  function updateTimelineDragPreview(element: HTMLElement, clientX: number, snap: boolean): void {
    const drag = timelineDragRef.current;

    if (!drag?.track || drag.mode === 'scrub' || !selectedTimeline) {
      return;
    }

    const previewTrack = getPreviewTrackForDrag(drag, clientX, element, { snap });

    queueTimelineDragPreview({
      timelineId: drag.timelineId,
      trackId: drag.track.id,
      mode: drag.mode,
      originalTrack: drag.track,
      previewTrack,
      startX: drag.startX,
    });
    setSnapTooltipState({
      time: getTrackStartTime(previewTrack),
      x: clientX - element.getBoundingClientRect().left,
      mode: snap ? 'snap' : 'free',
    });
  }

  function getPreviewTrackForDrag(
    drag: TimelinePointerDrag,
    clientX: number,
    element: HTMLElement,
    options: { snap: boolean },
  ): TimelineTrackData {
    const track = drag.track;

    if (!track) {
      throw new Error('Expected a Timeline track while previewing drag.');
    }

    const scrollDeltaX = getTimelineShellScrollLeft(element) - drag.startScrollLeft;
    const deltaSeconds = getTimelineDeltaSeconds(
      clientX - drag.startX + scrollDeltaX,
      element,
      drag.duration,
    );

    const nextTrack =
      drag.mode === 'move'
        ? moveTrackByDelta(track, deltaSeconds, drag.duration)
        : resizeTrackByDelta(
            track,
            deltaSeconds,
            drag.duration,
            drag.mode === 'resize-left' ? 'left' : 'right',
          );

    return options.snap ? snapTimelineTrack(nextTrack) : nextTrack;
  }

  function updateTimelineAutoScroll(element: HTMLElement, clientX: number, snap: boolean): void {
    const shell = getTimelineShell(element);

    if (!shell) {
      stopTimelineAutoScroll();
      return;
    }

    const rect = shell.getBoundingClientRect();
    let direction: -1 | 1 | undefined;

    if (clientX < rect.left + timelineAutoScrollEdgePx) {
      direction = -1;
    } else if (clientX > rect.right - timelineAutoScrollEdgePx) {
      direction = 1;
    }

    if (direction === undefined) {
      stopTimelineAutoScroll();
      return;
    }

    const active = timelineAutoScrollRef.current;

    timelineAutoScrollRef.current = {
      shell,
      content: element,
      direction,
      clientX,
      snap,
      frameId: active?.frameId,
    };

    if (active?.frameId === undefined) {
      scheduleTimelineAutoScroll();
    }
  }

  function scheduleTimelineAutoScroll(): void {
    const state = timelineAutoScrollRef.current;

    if (!state) {
      return;
    }

    state.frameId = window.requestAnimationFrame(() => {
      const active = timelineAutoScrollRef.current;

      if (!active) {
        return;
      }

      active.frameId = undefined;

      if (!timelineDragRef.current || timelineDragRef.current.mode === 'scrub') {
        stopTimelineAutoScroll();
        return;
      }

      const previousScrollLeft = active.shell.scrollLeft;
      active.shell.scrollLeft += active.direction * timelineAutoScrollStepPx;

      if (active.shell.scrollLeft !== previousScrollLeft) {
        updateTimelineDragPreview(active.content, active.clientX, active.snap);
      }

      scheduleTimelineAutoScroll();
    });
  }

  function stopTimelineAutoScroll(): void {
    const active = timelineAutoScrollRef.current;

    if (!active) {
      return;
    }

    if (active.frameId !== undefined) {
      window.cancelAnimationFrame(active.frameId);
    }

    timelineAutoScrollRef.current = undefined;
  }

  useEffect(() => {
    const shell = timelineShellRef.current;

    shell?.addEventListener('wheel', handleTimelineWheel, { passive: false });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && timelineDragRef.current?.mode !== 'scrub') {
        timelineDragRef.current = undefined;
        pendingDragPreviewRef.current = undefined;
        stopTimelineAutoScroll();
        setSnapTooltipState(undefined);

        if (dragPreviewFrameRef.current !== undefined) {
          window.cancelAnimationFrame(dragPreviewFrameRef.current);
          dragPreviewFrameRef.current = undefined;
        }

        setDragPreviewState(undefined);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      shell?.removeEventListener('wheel', handleTimelineWheel);
      window.removeEventListener('keydown', handleKeyDown);

      if (dragPreviewFrameRef.current !== undefined) {
        window.cancelAnimationFrame(dragPreviewFrameRef.current);
      }

      stopTimelineAutoScroll();
    };
  }, [selectedTimeline?.id]);

  const draftTimeline =
    selectedTimeline && draftTrack ? replaceTrack(selectedTimeline, draftTrack) : undefined;
  const validationResult = draftTimeline ? TimelineSchema.safeParse(draftTimeline) : undefined;
  const validationMessages =
    validationResult && !validationResult.success
      ? validationResult.error.issues.map((issue) => {
          const path = issue.path.join('.') || 'timeline';
          return `${path}: ${issue.message}`;
        })
      : [];
  const canApply =
    Boolean(draftTrack) &&
    validationResult?.success === true &&
    JSON.stringify(draftTrack) !== JSON.stringify(selectedTrack);
  const propertyTrack = draftTrack?.type === 'property' ? draftTrack : undefined;
  const keyIndex =
    selectedTimeline &&
    propertyTrack &&
    keyIndexState.timelineId === selectedTimeline.id &&
    keyIndexState.trackId === propertyTrack.id
      ? Math.min(keyIndexState.index, propertyTrack.keys.length - 1)
      : 0;
  const selectedKey = propertyTrack?.keys[keyIndex];
  const selectedKeySignature = selectedKey ? JSON.stringify(selectedKey) : '';
  const draftKey =
    selectedTimeline &&
    propertyTrack &&
    selectedKey &&
    draftKeyState?.timelineId === selectedTimeline.id &&
    draftKeyState.trackId === propertyTrack.id &&
    draftKeyState.index === keyIndex &&
    draftKeyState.sourceSignature === selectedKeySignature
      ? draftKeyState.key
      : selectedKey;
  const draftKeyTrack =
    propertyTrack && draftKey ? replacePropertyKey(propertyTrack, keyIndex, draftKey) : undefined;
  const keyValidationResult =
    selectedTimeline && draftKeyTrack
      ? TimelineSchema.safeParse(replaceTrack(selectedTimeline, draftKeyTrack))
      : undefined;
  const keyValidationMessages =
    keyValidationResult && !keyValidationResult.success
      ? keyValidationResult.error.issues.map((issue) => {
          const path = issue.path.join('.') || 'timeline';
          return `${path}: ${issue.message}`;
        })
      : [];
  const canApplyKey =
    Boolean(draftKeyTrack) &&
    keyValidationResult?.success === true &&
    JSON.stringify(draftKey) !== JSON.stringify(selectedKey);
  const actionPayloadJson =
    selectedTimeline &&
    draftTrack?.type === 'action' &&
    actionPayloadState.timelineId === selectedTimeline.id &&
    actionPayloadState.trackId === draftTrack.id &&
    actionPayloadState.sourceSignature === selectedTrackSignature
      ? actionPayloadState.json
      : draftTrack?.type === 'action'
        ? JSON.stringify(draftTrack.action, null, 2)
        : '';
  const actionPayloadParseResult =
    draftTrack?.type === 'action' ? parseActionPayload(actionPayloadJson) : undefined;
  const actionValidationMessages =
    actionPayloadParseResult && !actionPayloadParseResult.success
      ? actionPayloadParseResult.messages
      : [];
  const canApplyAction =
    draftTrack?.type === 'action' &&
    actionPayloadParseResult?.success === true &&
    JSON.stringify(actionPayloadParseResult.action) !== JSON.stringify(draftTrack.action);
  const parsedFlagSetAction =
    actionPayloadParseResult?.success === true &&
    actionPayloadParseResult.action.type === 'flag.set'
      ? actionPayloadParseResult.action
      : undefined;
  const issueCount =
    validationMessages.length + keyValidationMessages.length + actionValidationMessages.length;
  const saveStatusPill = getSaveStatusPill({ saveStatus, isDirty, issueCount });
  const previewStatusPill = getPreviewStatusPill(previewStatus);

  const updateDraftTrack = (track: TimelineTrackData) => {
    if (!selectedTimeline) {
      return;
    }

    setDraftTrackState({
      timelineId: selectedTimeline.id,
      trackId: track.id,
      sourceSignature: selectedTrackSignature,
      track,
    });
  };

  const applyDraftTrack = () => {
    if (!selectedTimeline || !draftTrack || !validationResult?.success) {
      return;
    }

    const parsedTrack = validationResult.data.tracks.find((track) => track.id === draftTrack.id);

    if (parsedTrack) {
      onApplyTrack(selectedTimeline.id, parsedTrack);
      setDraftTrackState(undefined);
    }
  };

  const updateDraftKey = (key: PropertyTimelineKey) => {
    if (!selectedTimeline || !propertyTrack) {
      return;
    }

    setDraftKeyState({
      timelineId: selectedTimeline.id,
      trackId: propertyTrack.id,
      index: keyIndex,
      sourceSignature: selectedKeySignature,
      key,
    });
  };

  const addPropertyKey = () => {
    if (!selectedTimeline || !propertyTrack) {
      return;
    }

    const lastKey = propertyTrack.keys[propertyTrack.keys.length - 1];
    const nextKey: PropertyTimelineKey = {
      time: clampTime(lastKey.time + 0.5, selectedTimeline.duration),
      value: lastKey.value,
      ease: lastKey.ease ?? 'linear',
    };
    const nextTrack: PropertyTimelineTrack = {
      ...propertyTrack,
      keys: sortPropertyKeys([...propertyTrack.keys, nextKey]),
    };

    onApplyTrackItem(selectedTimeline.id, nextTrack, 'add', `${propertyTrack.id} key`);
    setDraftKeyState(undefined);
    setKeyIndexState({
      timelineId: selectedTimeline.id,
      trackId: propertyTrack.id,
      index: nextTrack.keys.length - 1,
    });
  };

  const applyPropertyKey = () => {
    if (!selectedTimeline || !draftKeyTrack || !keyValidationResult?.success) {
      return;
    }

    const parsedTrack = keyValidationResult.data.tracks.find(
      (track) => track.id === draftKeyTrack.id,
    );

    if (parsedTrack) {
      onApplyTrackItem(selectedTimeline.id, parsedTrack, 'update', `${draftKeyTrack.id} key`);
      setDraftKeyState(undefined);
    }
  };

  const movePropertyKey = (direction: -1 | 1) => {
    if (!selectedTimeline || !propertyTrack) {
      return;
    }

    const nextIndex = keyIndex + direction;

    if (nextIndex < 0 || nextIndex >= propertyTrack.keys.length) {
      return;
    }

    const nextTrack: PropertyTimelineTrack = {
      ...propertyTrack,
      keys: swapPropertyKeyTimes(propertyTrack.keys, keyIndex, nextIndex),
    };

    onApplyTrackItem(selectedTimeline.id, nextTrack, 'update', `${propertyTrack.id} key order`);
    setDraftKeyState(undefined);
    setKeyIndexState({
      timelineId: selectedTimeline.id,
      trackId: propertyTrack.id,
      index: nextIndex,
    });
  };

  const removePropertyKey = () => {
    if (!selectedTimeline || !propertyTrack || propertyTrack.keys.length <= 1) {
      return;
    }

    const nextTrack: PropertyTimelineTrack = {
      ...propertyTrack,
      keys: propertyTrack.keys.filter((_, index) => index !== keyIndex),
    };

    onApplyTrackItem(selectedTimeline.id, nextTrack, 'remove', `${propertyTrack.id} key`);
    setDraftKeyState(undefined);
    setKeyIndexState({
      timelineId: selectedTimeline.id,
      trackId: propertyTrack.id,
      index: Math.max(0, keyIndex - 1),
    });
  };

  const applyActionPayload = () => {
    if (
      !selectedTimeline ||
      draftTrack?.type !== 'action' ||
      actionPayloadParseResult?.success !== true
    ) {
      return;
    }

    onApplyTrackItem(
      selectedTimeline.id,
      { ...draftTrack, action: actionPayloadParseResult.action },
      'update',
      `${draftTrack.id} action`,
    );
    setActionPayloadState({
      timelineId: '',
      trackId: '',
      sourceSignature: '',
      json: '',
    });
  };

  if (timelines.length === 0) {
    return (
      <section
        className="timeline-panel"
        data-testid="timeline-panel"
        aria-labelledby="timeline-heading"
      >
        <div className="timeline-header">
          <strong id="timeline-heading">Timeline</strong>
          <span>No timelines loaded</span>
        </div>
      </section>
    );
  }

  return (
    <section
      className="timeline-panel"
      data-testid="timeline-panel"
      aria-labelledby="timeline-heading"
    >
      <div className="sequencer-controls">
        <strong id="timeline-heading" className="timeline-title">
          Timeline
        </strong>
        <div className="timecode" data-testid="timeline-timecode">
          {formatTimelineTimecode(timelineTime)}
        </div>
        {selectedTimeline ? (
          <div className="timeline-playback-row segmented" aria-label="Timeline playback controls">
            <button type="button" onClick={() => onSeekTimeline(selectedTimeline.id, 0)}>
              Start
            </button>
            {playbackStatus === 'playing' ? (
              <button type="button" className="is-active" onClick={onPauseTimeline}>
                Pause
              </button>
            ) : playbackStatus === 'paused' ? (
              <button type="button" className="is-active" onClick={onResumeTimeline}>
                Resume
              </button>
            ) : (
              <button type="button" onClick={() => onPlayTimeline(selectedTimeline.id)}>
                Play
              </button>
            )}
            <button type="button" onClick={onStopTimeline} disabled={playbackStatus === 'stopped'}>
              Stop
            </button>
            <button
              type="button"
              onClick={() => onSeekTimeline(selectedTimeline.id, selectedTimeline.duration)}
            >
              End
            </button>
          </div>
        ) : null}
        <span className={previewStatusPill.className} role="status">
          {previewStatusPill.text}
        </span>

        <label className="field-inline" htmlFor="timeline-select">
          <span>Timeline</span>
          <select
            id="timeline-select"
            value={selectedTimeline?.id ?? ''}
            onChange={(event) => onSelectTimeline(event.target.value)}
          >
            {timelines.map((timeline) => (
              <option key={timeline.id} value={timeline.id}>
                {timeline.name ? `${timeline.name} (${timeline.id})` : timeline.id}
              </option>
            ))}
          </select>
        </label>

        <div className="timeline-meta" aria-label="Timeline summary">
          <span>{selectedTimeline ? `${selectedTimeline.duration.toFixed(2)}s` : '0.00s'}</span>
          <span>{selectedTimeline ? `${selectedTimeline.tracks.length} tracks` : '0 tracks'}</span>
          <span className={saveStatusPill.className}>{saveStatusPill.text}</span>
        </div>

        <label className="field-inline" htmlFor="timeline-track-type">
          <span>Add</span>
          <select
            id="timeline-track-type"
            value={trackType}
            onChange={(event) => setTrackType(event.target.value as TimelineTrackKind)}
          >
            {TRACK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <div className="timeline-command-row">
          <button
            type="button"
            onClick={() => selectedTimeline && onAddTrack(selectedTimeline.id, trackType)}
            disabled={!selectedTimeline}
          >
            Add Track
          </button>
          <button
            type="button"
            onClick={() => selectedTimeline && onSaveTimeline(selectedTimeline)}
            disabled={!selectedTimeline || saveStatus === 'saving'}
          >
            Save Timeline
          </button>
        </div>
      </div>

      {saveError ? (
        <p className="panel-error" role="alert">
          {saveError}
        </p>
      ) : null}

      {selectedTimeline ? (
        <>
          <label className="timeline-scrubber timeline-scrubber-hidden" htmlFor="timeline-scrub">
            <span>{timelineTime.toFixed(2)}s</span>
            <input
              id="timeline-scrub"
              type="range"
              min="0"
              max={selectedTimeline.duration}
              step="0.05"
              value={timelineTime}
              onInput={(event) => scrubSelectedTimeline(Number(event.currentTarget.value))}
              onChange={(event) => scrubSelectedTimeline(Number(event.currentTarget.value))}
            />
          </label>

          <div
            ref={timelineShellRef}
            className={`timeline-shell${assetDropActive ? ' is-asset-drop-target' : ''}`}
            data-testid="timeline-lanes"
            onDragOver={handleTimelineAssetDragOver}
            onDragLeave={() => setAssetDropActive(false)}
            onDrop={handleTimelineAssetDrop}
          >
            <div
              className="timeline-content"
              style={{ minWidth: `${900 * timelineScale}px` }}
              onPointerDown={startTimelineScrub}
              onPointerMove={updateTimelinePointerDrag}
              onPointerUp={finishTimelinePointerDrag}
              onPointerCancel={() => {
                cancelTimelineDrag();
              }}
            >
              <div className="timeline-playfield">
                <div
                  className="timeline-playhead"
                  data-testid="timeline-playhead"
                  style={{ left: playheadPercent }}
                  aria-hidden="true"
                />
                <div
                  className="timeline-playhead-handle"
                  data-testid="timeline-playhead-handle"
                  role="slider"
                  aria-label="Timeline playhead"
                  aria-valuemin={0}
                  aria-valuemax={selectedTimeline.duration}
                  aria-valuenow={timelineTime}
                  tabIndex={0}
                  style={{ left: playheadPercent }}
                  onPointerDown={startPlayheadDrag}
                />
              </div>

              <div className="timeline-ruler" data-testid="timeline-ruler">
                {buildTicks(selectedTimeline.duration).map((time) => (
                  <span
                    key={time}
                    className="ruler-label"
                    style={getRulerLabelStyle(time, selectedTimeline.duration)}
                  >
                    {time}s
                  </span>
                ))}
              </div>

              <ol className="timeline-track-list" aria-label="Timeline tracks">
                {renderedTracks.map((track) => (
                  <li
                    key={track.id}
                    data-track-kind={track.type}
                    className={track.id === selectedTrack?.id ? 'is-selected' : undefined}
                  >
                    <span className="timeline-track-label">{track.type}</span>
                    <div className="timeline-track-content">
                      <button
                        type="button"
                        className={`timeline-clip${isTrackResizable(track) ? ' is-resizable' : ''}`}
                        style={getTrackClipStyle(track, selectedTimeline.duration)}
                        aria-label={`${track.id} ${track.type} ${formatTrackTiming(track)}`}
                        onClick={() => onSelectTrack(track.id)}
                        onPointerDown={(event) => startClipDrag(event, track, 'move')}
                      >
                        {isTrackResizable(track) ? (
                          <span
                            className="clip-resize-handle is-left"
                            aria-hidden="true"
                            onPointerDown={(event) => startClipDrag(event, track, 'resize-left')}
                          />
                        ) : null}
                        <span className="clip-title">{formatTrackClipTitle(track)}</span>
                        {isTrackResizable(track) ? (
                          <span
                            className="clip-resize-handle is-right"
                            aria-hidden="true"
                            onPointerDown={(event) => startClipDrag(event, track, 'resize-right')}
                          />
                        ) : null}
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              {snapTooltipState ? (
                <div
                  className="timeline-snap-tooltip"
                  data-testid="timeline-snap-tooltip"
                  style={{ left: snapTooltipState.x }}
                >
                  {snapTooltipState.mode === 'snap' ? 'Snap' : 'Free'}{' '}
                  {snapTooltipState.time.toFixed(2)}s
                </div>
              ) : null}
            </div>
          </div>

          <div className="track-details" data-testid="timeline-selected-track">
            <div className="track-detail-cell">
              <div className="detail-kicker">
                {draftTrack?.type === 'action' ? 'Action Marker' : 'Selected Track'}
              </div>
              <div className="detail-title">{draftTrack?.type ?? 'track'}</div>
            </div>
            <div className="track-detail-cell">
              <div className="detail-kicker">Binding</div>
              <div className="detail-title">{selectedTrackBinding}</div>
            </div>
            <div className="track-detail-cell">
              <div className="detail-kicker">Implementation</div>
              <div className="detail-title">{selectedTrackImplementation}</div>
            </div>
          </div>

          {draftTrack ? (
            <details className="timeline-edit-drawer" open={draftTrack.type === 'property'}>
              <summary>
                <span>Track Editor</span>
                <strong>{draftTrack.id}</strong>
              </summary>
              <section className="timeline-track-editor" aria-labelledby="timeline-track-heading">
                <div className="panel-title-row">
                  <h3 id="timeline-track-heading">Track</h3>
                  <span>{draftTrack.id}</span>
                </div>

                {renderTrackFields({
                  track: draftTrack,
                  entityIds,
                  cameraShotIds,
                  soundAssetIds,
                  onUpdate: updateDraftTrack,
                  onCommit: (track) => {
                    onApplyTrack(selectedTimeline.id, track);
                    setDraftTrackState(undefined);
                  },
                })}

                {validationMessages.length > 0 ? (
                  <ul className="validation-list" role="alert">
                    {validationMessages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="timeline-command-row">
                  <button type="button" onClick={applyDraftTrack} disabled={!canApply}>
                    Apply Track
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveTrack(selectedTimeline.id, draftTrack.id)}
                  >
                    Remove Track
                  </button>
                </div>

                {draftTrack.type === 'action' ? (
                  <section
                    className="timeline-item-editor"
                    aria-labelledby="timeline-action-heading"
                  >
                    <div className="panel-title-row">
                      <h3 id="timeline-action-heading">Action Marker</h3>
                      <span>{draftTrack.action.type}</span>
                    </div>
                    <label className="field-stack" htmlFor="timeline-action-json">
                      <span>Payload JSON</span>
                      <textarea
                        id="timeline-action-json"
                        value={actionPayloadJson}
                        rows={5}
                        spellCheck={false}
                        onChange={(event) =>
                          setActionPayloadState({
                            timelineId: selectedTimeline.id,
                            trackId: draftTrack.id,
                            sourceSignature: selectedTrackSignature,
                            json: event.target.value,
                          })
                        }
                      />
                    </label>

                    {actionValidationMessages.length > 0 ? (
                      <ul className="validation-list" role="alert">
                        {actionValidationMessages.map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="timeline-command-row">
                      {parsedFlagSetAction && typeof parsedFlagSetAction.value === 'boolean' ? (
                        <button
                          type="button"
                          onClick={() =>
                            setActionPayloadState({
                              timelineId: selectedTimeline.id,
                              trackId: draftTrack.id,
                              sourceSignature: selectedTrackSignature,
                              json: JSON.stringify(
                                {
                                  ...parsedFlagSetAction,
                                  value: !parsedFlagSetAction.value,
                                },
                                null,
                                2,
                              ),
                            })
                          }
                        >
                          Toggle Flag Value
                        </button>
                      ) : null}
                      <button type="button" onClick={applyActionPayload} disabled={!canApplyAction}>
                        Apply Action
                      </button>
                    </div>
                  </section>
                ) : null}

                {propertyTrack && draftKey ? (
                  <section className="timeline-item-editor" aria-labelledby="timeline-key-heading">
                    <div className="panel-title-row">
                      <h3 id="timeline-key-heading">Keyframe</h3>
                      <span>{keyIndex + 1}</span>
                    </div>

                    <label className="field-stack" htmlFor="timeline-key-select">
                      <span>Key</span>
                      <select
                        id="timeline-key-select"
                        value={keyIndex}
                        onChange={(event) =>
                          setKeyIndexState({
                            timelineId: selectedTimeline.id,
                            trackId: propertyTrack.id,
                            index: Number(event.target.value),
                          })
                        }
                      >
                        {propertyTrack.keys.map((key, index) => (
                          <option key={`${propertyTrack.id}-${index}`} value={index}>
                            {index + 1} @ {key.time}s
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="timeline-track-fields">
                      <NumericScrubInput
                        id="timeline-key-time"
                        label="Time"
                        value={draftKey.time}
                        min={0}
                        step={0.05}
                        onChange={(value) => updateDraftKey({ ...draftKey, time: value })}
                        onCommit={(value) => {
                          const nextTrack = replacePropertyKey(propertyTrack, keyIndex, {
                            ...draftKey,
                            time: value,
                          });

                          onApplyTrackItem(
                            selectedTimeline.id,
                            nextTrack,
                            'update',
                            `${propertyTrack.id} key`,
                          );
                          setDraftKeyState(undefined);
                        }}
                        onCancel={(value) => updateDraftKey({ ...draftKey, time: value })}
                      />
                      <label className="field-stack" htmlFor="timeline-key-value">
                        <span>Value</span>
                        <input
                          id="timeline-key-value"
                          type="text"
                          value={formatPropertyValue(draftKey.value)}
                          onChange={(event) =>
                            updateDraftKey({
                              ...draftKey,
                              value: parsePropertyValue(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="field-stack" htmlFor="timeline-key-ease">
                        <span>Ease</span>
                        <input
                          id="timeline-key-ease"
                          type="text"
                          value={draftKey.ease ?? ''}
                          onChange={(event) =>
                            updateDraftKey({
                              ...draftKey,
                              ease: event.target.value || undefined,
                            })
                          }
                        />
                      </label>
                    </div>

                    {keyValidationMessages.length > 0 ? (
                      <ul className="validation-list" role="alert">
                        {keyValidationMessages.map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="key-command-row">
                      <button type="button" onClick={addPropertyKey}>
                        Add Key
                      </button>
                      <button
                        type="button"
                        onClick={() => movePropertyKey(-1)}
                        disabled={keyIndex === 0}
                      >
                        Move Up
                      </button>
                      <button
                        type="button"
                        onClick={() => movePropertyKey(1)}
                        disabled={keyIndex >= propertyTrack.keys.length - 1}
                      >
                        Move Down
                      </button>
                      <button type="button" onClick={applyPropertyKey} disabled={!canApplyKey}>
                        Apply Keyframe
                      </button>
                      <button
                        type="button"
                        onClick={removePropertyKey}
                        disabled={propertyTrack.keys.length <= 1}
                      >
                        Remove Key
                      </button>
                    </div>
                  </section>
                ) : null}
              </section>
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

interface TrackFieldProps {
  track: TimelineTrackData;
  entityIds: readonly string[];
  cameraShotIds: readonly string[];
  soundAssetIds: readonly string[];
  onUpdate: (track: TimelineTrackData) => void;
  onCommit: (track: TimelineTrackData) => void;
}

function renderTrackFields({
  track,
  entityIds,
  cameraShotIds,
  soundAssetIds,
  onUpdate,
  onCommit,
}: TrackFieldProps) {
  return (
    <div className="timeline-track-fields">
      <NumericScrubInput
        id="timeline-track-time"
        label={getTimeLabel(track)}
        value={getTrackTime(track)}
        min={0}
        step={0.05}
        onChange={(value) => onUpdate(updateTrackTime(track, value))}
        onCommit={(value) => onCommit(updateTrackTime(track, value))}
        onCancel={(value) => onUpdate(updateTrackTime(track, value))}
      />

      {hasDuration(track) ? (
        <NumericScrubInput
          id="timeline-track-duration"
          label="Duration"
          value={track.duration}
          min={0.05}
          step={0.05}
          onChange={(value) => onUpdate({ ...track, duration: value })}
          onCommit={(value) => onCommit({ ...track, duration: value })}
          onCancel={(value) => onUpdate({ ...track, duration: value })}
        />
      ) : null}

      {track.type === 'animation.play' ? (
        <>
          <SelectField
            id="timeline-track-entity"
            label="Entity"
            value={track.entityId}
            options={entityIds}
            onChange={(entityId) => onUpdate({ ...track, entityId })}
          />
          <label className="field-stack" htmlFor="timeline-track-clip">
            <span>Clip</span>
            <input
              id="timeline-track-clip"
              type="text"
              value={track.clip}
              onChange={(event) => onUpdate({ ...track, clip: event.target.value })}
            />
          </label>
        </>
      ) : null}

      {track.type === 'camera.shot' ? (
        <SelectField
          id="timeline-track-shot"
          label="Shot"
          value={track.shotId}
          options={cameraShotIds}
          onChange={(shotId) => onUpdate({ ...track, shotId })}
        />
      ) : null}

      {track.type === 'property' ? (
        <>
          <SelectField
            id="timeline-track-target"
            label="Target"
            value={track.target}
            options={entityIds}
            onChange={(target) => onUpdate({ ...track, target })}
          />
          <label className="field-stack" htmlFor="timeline-track-property">
            <span>Property</span>
            <input
              id="timeline-track-property"
              type="text"
              value={track.property}
              onChange={(event) => onUpdate({ ...track, property: event.target.value })}
            />
          </label>
        </>
      ) : null}

      {track.type === 'subtitle' ? (
        <label className="field-stack" htmlFor="timeline-track-text">
          <span>Text</span>
          <input
            id="timeline-track-text"
            type="text"
            value={track.text}
            onChange={(event) => onUpdate({ ...track, text: event.target.value })}
          />
        </label>
      ) : null}

      {track.type === 'sound' ? (
        <SelectField
          id="timeline-track-sound"
          label="Sound"
          value={track.soundId}
          options={soundAssetIds}
          onChange={(soundId) => onUpdate({ ...track, soundId })}
        />
      ) : null}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}

function SelectField({ id, label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="field-stack" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.length === 0 ? <option value={value}>{value}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function replaceTrack(timeline: TimelineData, track: TimelineTrackData): TimelineData {
  return {
    ...timeline,
    tracks: timeline.tracks.map((item) => (item.id === track.id ? track : item)),
  };
}

function replacePropertyKey(
  track: PropertyTimelineTrack,
  keyIndex: number,
  key: PropertyTimelineKey,
): PropertyTimelineTrack {
  return {
    ...track,
    keys: track.keys.map((item, index) => (index === keyIndex ? key : item)),
  };
}

function sortPropertyKeys(keys: readonly PropertyTimelineKey[]): PropertyTimelineKey[] {
  return [...keys].sort((left, right) => left.time - right.time);
}

function swapPropertyKeyTimes(
  keys: readonly PropertyTimelineKey[],
  leftIndex: number,
  rightIndex: number,
): PropertyTimelineKey[] {
  return keys.map((key, index) => {
    if (index === leftIndex) {
      return { ...key, time: keys[rightIndex].time };
    }

    if (index === rightIndex) {
      return { ...key, time: keys[leftIndex].time };
    }

    return key;
  });
}

function parseActionPayload(
  json: string,
): { success: true; action: ActionData } | { success: false; messages: string[] } {
  try {
    const parsed = ActionSchema.safeParse(JSON.parse(json) as unknown);

    if (parsed.success) {
      return { success: true, action: parsed.data };
    }

    return {
      success: false,
      messages: parsed.error.issues.map((issue) => {
        const path = issue.path.join('.') || 'action';
        return `${path}: ${issue.message}`;
      }),
    };
  } catch (error) {
    return {
      success: false,
      messages: [error instanceof Error ? error.message : String(error)],
    };
  }
}

function formatPropertyValue(value: PropertyTimelineKey['value']): string {
  return JSON.stringify(value);
}

function parsePropertyValue(value: string): PropertyTimelineKey['value'] {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (typeof parsed === 'boolean' || typeof parsed === 'number' || typeof parsed === 'string') {
      return parsed;
    }

    if (
      Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed.every((item) => typeof item === 'number')
    ) {
      return [parsed[0], parsed[1], parsed[2]];
    }
  } catch {
    const numeric = Number(value);

    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return value;
}

function isTimelineClipTarget(target: EventTarget): boolean {
  return target instanceof Element && Boolean(target.closest('.timeline-clip'));
}

function getTimelineShell(element: Element): HTMLElement | undefined {
  const shell = element.closest('.timeline-shell');

  return shell instanceof HTMLElement ? shell : undefined;
}

function getTimelineShellScrollLeft(element: Element): number {
  return getTimelineShell(element)?.scrollLeft ?? 0;
}

function getTimelineDeltaSeconds(deltaX: number, element: HTMLElement, duration: number): number {
  const rect = element.getBoundingClientRect();
  const usableWidth = Math.max(1, rect.width - timelineLabelColumnWidth);

  return (deltaX / usableWidth) * duration;
}

function moveTrackByDelta(
  track: TimelineTrackData,
  deltaSeconds: number,
  timelineDuration: number,
): TimelineTrackData {
  switch (track.type) {
    case 'action':
    case 'sound':
    case 'subtitle':
      return { ...track, time: clampTime(track.time + deltaSeconds, timelineDuration) };
    case 'animation.play':
    case 'camera.shot':
    case 'wait': {
      const duration = getTrackDuration(track);
      const start = clampNumber(
        track.start + deltaSeconds,
        0,
        Math.max(0, timelineDuration - duration),
      );

      return { ...track, start: roundTimelineTime(start) };
    }
    case 'property': {
      const times = track.keys.map((key) => key.time);
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const safeDelta = clampNumber(deltaSeconds, -minTime, timelineDuration - maxTime);

      return {
        ...track,
        keys: track.keys.map((key) => ({
          ...key,
          time: roundTimelineTime(key.time + safeDelta),
        })),
      };
    }
  }
}

function resizeTrackByDelta(
  track: TimelineTrackData,
  deltaSeconds: number,
  timelineDuration: number,
  edge: 'left' | 'right',
): TimelineTrackData {
  if (track.type === 'property') {
    return resizePropertyTrackByDelta(track, deltaSeconds, timelineDuration, edge);
  }

  if (!hasDuration(track)) {
    return track;
  }

  if (track.type === 'subtitle') {
    if (edge === 'left') {
      const end = track.time + track.duration;
      const time = clampNumber(track.time + deltaSeconds, 0, end - 0.05);

      return {
        ...track,
        time: roundTimelineTime(time),
        duration: roundTimelineTime(Math.max(0.05, end - time)),
      };
    }

    const duration = clampNumber(
      track.duration + deltaSeconds,
      0.05,
      timelineDuration - track.time,
    );

    return {
      ...track,
      duration: roundTimelineTime(duration),
    };
  }

  if (edge === 'left') {
    const end = track.start + track.duration;
    const start = clampNumber(track.start + deltaSeconds, 0, end - 0.05);

    return {
      ...track,
      start: roundTimelineTime(start),
      duration: roundTimelineTime(Math.max(0.05, end - start)),
    };
  }

  const duration = clampNumber(track.duration + deltaSeconds, 0.05, timelineDuration - track.start);

  return {
    ...track,
    duration: roundTimelineTime(duration),
  };
}

function resizePropertyTrackByDelta(
  track: PropertyTimelineTrack,
  deltaSeconds: number,
  timelineDuration: number,
  edge: 'left' | 'right',
): PropertyTimelineTrack {
  const sortedKeys = sortPropertyKeys(track.keys);
  const first = sortedKeys[0];
  const last = sortedKeys[sortedKeys.length - 1];

  if (!first || !last || first === last) {
    return track;
  }

  const targetTime =
    edge === 'left'
      ? clampNumber(first.time + deltaSeconds, 0, last.time - 0.05)
      : clampNumber(last.time + deltaSeconds, first.time + 0.05, timelineDuration);
  const keyToUpdate = edge === 'left' ? first : last;

  return {
    ...track,
    keys: track.keys.map((key) =>
      key === keyToUpdate ? { ...key, time: roundTimelineTime(targetTime) } : key,
    ),
  };
}

function snapTimelineTrack(track: TimelineTrackData): TimelineTrackData {
  switch (track.type) {
    case 'action':
    case 'sound':
      return { ...track, time: snapTimelineTime(track.time) };
    case 'subtitle':
      return {
        ...track,
        time: snapTimelineTime(track.time),
        duration: Math.max(timelineSnapSeconds, snapTimelineTime(track.duration)),
      };
    case 'animation.play':
      return { ...track, start: snapTimelineTime(track.start) };
    case 'camera.shot':
    case 'wait':
      return {
        ...track,
        start: snapTimelineTime(track.start),
        duration: Math.max(timelineSnapSeconds, snapTimelineTime(track.duration)),
      };
    case 'property':
      return {
        ...track,
        keys: track.keys.map((key) => ({ ...key, time: snapTimelineTime(key.time) })),
      };
  }
}

function snapTimelineTime(time: number): number {
  return Number((Math.round(time / timelineSnapSeconds) * timelineSnapSeconds).toFixed(2));
}

function hasDraggedAsset(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes('application/x-sinan-asset-id');
}

function getDraggedAssetId(event: DragEvent<HTMLElement>): string | undefined {
  const assetId = event.dataTransfer.getData('application/x-sinan-asset-id');
  const assetType = event.dataTransfer.getData('application/x-sinan-asset-type');

  return assetId && assetType === 'audio' ? assetId : undefined;
}

function isTrackResizable(track: TimelineTrackData): boolean {
  return hasDuration(track) || track.type === 'property';
}

function roundTimelineTime(time: number): number {
  return Number(time.toFixed(2));
}

function buildTicks(duration: number): number[] {
  const last = Math.max(1, Math.ceil(duration));

  return Array.from({ length: last + 1 }, (_, index) => index);
}

function getRulerLabelStyle(time: number, duration: number): CSSProperties {
  const left = duration > 0 ? (clampTime(time, duration) / duration) * 100 : 0;

  return {
    left: `${left}%`,
  };
}

function formatTimelineTimecode(time: number): string {
  const centiseconds = Math.max(0, Math.round(time * 100));
  const minutes = Math.floor(centiseconds / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  const hundredths = centiseconds % 100;

  return `${formatPaddedTime(minutes)}:${formatPaddedTime(seconds)}.${formatPaddedTime(
    hundredths,
  )}`;
}

function formatPaddedTime(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatTrackTiming(track: TimelineTrackData): string {
  switch (track.type) {
    case 'action':
    case 'subtitle':
    case 'sound':
      return `@ ${track.time}s`;
    case 'animation.play':
    case 'camera.shot':
    case 'wait':
      return `${track.start}s`;
    case 'property':
      return `${Math.min(...track.keys.map((key) => key.time))}s`;
  }
}

function formatTrackBinding(track: TimelineTrackData): string {
  switch (track.type) {
    case 'action':
      return `${track.action.type} @ ${track.time}s`;
    case 'animation.play':
      return `${track.entityId} / ${track.clip} / fade ${track.fadeIn ?? 0}s`;
    case 'camera.shot':
      return `${track.shotId} / blend ${track.blendIn ?? 0}s - ${track.blendOut ?? 0}s`;
    case 'property':
      return `${track.target} / ${track.property} / ${formatPropertyKeyRange(track)}`;
    case 'sound':
      return `${track.soundId} @ ${track.time}s`;
    case 'subtitle':
      return `${track.text} / ${track.time}s`;
    case 'wait':
      return `${track.start}s / ${track.duration}s`;
  }
}

function formatTrackImplementation(track: TimelineTrackData): string {
  switch (track.type) {
    case 'action':
      return 'TimelinePanel -> ActionTrackPlayer -> ActionSystem';
    case 'animation.play':
      return 'TimelinePanel -> AnimationTrackPlayer';
    case 'camera.shot':
      return 'TimelinePanel -> DirectorCameraSystem';
    case 'property':
      return 'TimelinePanel -> PropertyTrackPlayer';
    case 'sound':
      return 'TimelinePanel -> AudioTrackPlayer';
    case 'subtitle':
      return 'TimelinePanel -> SubtitleTrackPlayer';
    case 'wait':
      return 'TimelinePanel -> TimelineScheduler';
  }
}

function formatPropertyKeyRange(track: PropertyTimelineTrack): string {
  const sortedKeys = sortPropertyKeys(track.keys);
  const first = sortedKeys[0];
  const last = sortedKeys[sortedKeys.length - 1];

  if (!first || !last) {
    return 'no keys';
  }

  return `${formatPropertyValue(first.value)} -> ${formatPropertyValue(last.value)}`;
}

function formatTrackClipTitle(track: TimelineTrackData): string {
  switch (track.type) {
    case 'action':
      return track.action.type;
    case 'animation.play':
      return `${track.entityId} / ${track.clip}`;
    case 'camera.shot':
      return track.id;
    case 'property':
      return track.property;
    case 'sound':
      return track.soundId;
    case 'subtitle':
      return track.text;
    case 'wait':
      return track.id;
  }
}

function getTrackClipStyle(track: TimelineTrackData, timelineDuration: number): CSSProperties {
  const start = clampTime(getTrackStartTime(track), timelineDuration);
  const duration = Math.max(0.08, getTrackDuration(track));
  const left = timelineDuration > 0 ? (start / timelineDuration) * 100 : 0;
  const width = timelineDuration > 0 ? (duration / timelineDuration) * 100 : 6;

  return {
    '--clip-left': `${Math.min(96, Math.max(0, left))}%`,
    '--clip-width': `${Math.min(100, Math.max(6, width))}%`,
  } as CSSProperties;
}

function getTrackStartTime(track: TimelineTrackData): number {
  switch (track.type) {
    case 'action':
    case 'sound':
    case 'subtitle':
      return track.time;
    case 'animation.play':
    case 'camera.shot':
    case 'wait':
      return track.start;
    case 'property':
      return Math.min(...track.keys.map((key) => key.time));
  }
}

function getTrackDuration(track: TimelineTrackData): number {
  if (hasDuration(track)) {
    return track.duration;
  }

  if (track.type === 'property') {
    const times = track.keys.map((key) => key.time);

    return Math.max(0.18, Math.max(...times) - Math.min(...times));
  }

  return 0.22;
}

function getTimeLabel(track: TimelineTrackData): string {
  return track.type === 'action' || track.type === 'subtitle' || track.type === 'sound'
    ? 'Time'
    : 'Start';
}

function getTrackTime(track: TimelineTrackData): number {
  switch (track.type) {
    case 'action':
    case 'sound':
    case 'subtitle':
      return track.time;
    case 'animation.play':
    case 'camera.shot':
    case 'wait':
      return track.start;
    case 'property':
      return Math.min(...track.keys.map((key) => key.time));
  }
}

function updateTrackTime(track: TimelineTrackData, time: number): TimelineTrackData {
  switch (track.type) {
    case 'action':
    case 'sound':
    case 'subtitle':
      return { ...track, time };
    case 'animation.play':
    case 'camera.shot':
    case 'wait':
      return { ...track, start: time };
    case 'property': {
      const firstKeyTime = Math.min(...track.keys.map((key) => key.time));
      const delta = time - firstKeyTime;

      return {
        ...track,
        keys: track.keys.map((key) => ({
          ...key,
          time: Math.max(0, Math.round((key.time + delta) * 100) / 100),
        })),
      };
    }
  }
}

function hasDuration(
  track: TimelineTrackData,
): track is Extract<TimelineTrackData, { duration: number }> {
  return 'duration' in track;
}

function clampTime(time: number, duration: number): number {
  return Math.min(Math.max(time, 0), duration);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
