import type { TimelineData, TimelineTrackData } from '../../schemas/timeline.schema';

export interface TimelinePanelProps {
  timelines: readonly TimelineData[];
  selectedTimeline: TimelineData | undefined;
  currentTime: number;
  previewStatus: string;
  onSelectTimeline: (timelineId: string) => void;
  onScrubTimeline: (timelineId: string, time: number) => void;
}

export function TimelinePanel({
  timelines,
  selectedTimeline,
  currentTime,
  previewStatus,
  onSelectTimeline,
  onScrubTimeline,
}: TimelinePanelProps) {
  const timelineTime = clampTime(currentTime, selectedTimeline?.duration ?? 0);
  const playheadPercent = selectedTimeline
    ? `${(timelineTime / selectedTimeline.duration) * 100}%`
    : '0%';
  const scrubSelectedTimeline = (time: number) => {
    if (selectedTimeline) {
      onScrubTimeline(selectedTimeline.id, time);
    }
  };

  if (timelines.length === 0) {
    return (
      <section className="timeline-panel" aria-labelledby="timeline-heading">
        <div className="timeline-header">
          <strong id="timeline-heading">Timeline</strong>
          <span>No timelines loaded</span>
        </div>
      </section>
    );
  }

  return (
    <section className="timeline-panel" aria-labelledby="timeline-heading">
      <div className="timeline-header">
        <strong id="timeline-heading">Timeline</strong>
        <span role="status">{previewStatus}</span>
      </div>

      <div className="timeline-controls">
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
        </div>
      </div>

      {selectedTimeline ? (
        <>
          <label className="timeline-scrubber" htmlFor="timeline-scrub">
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

          <div className="timeline-ruler" data-testid="timeline-ruler">
            {buildTicks(selectedTimeline.duration).map((time) => (
              <span key={time}>{time}s</span>
            ))}
            <div className="timeline-playhead" style={{ left: playheadPercent }} />
          </div>

          <ol className="timeline-track-list" aria-label="Timeline tracks">
            {selectedTimeline.tracks.map((track) => (
              <li key={track.id}>
                <strong>{track.type}</strong>
                <span>{track.id}</span>
                <small>{formatTrackTiming(track)}</small>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}

function buildTicks(duration: number): number[] {
  const last = Math.max(1, Math.ceil(duration));

  return Array.from({ length: last + 1 }, (_, index) => index);
}

function formatTrackTiming(track: TimelineTrackData): string {
  switch (track.type) {
    case 'action':
    case 'sound':
    case 'subtitle':
      return `@ ${track.time}s`;
    case 'animation.play':
    case 'camera.shot':
    case 'wait':
      return `${track.start}s`;
    case 'property':
      return `${Math.min(...track.keys.map((key) => key.time))}s`;
  }
}

function clampTime(time: number, duration: number): number {
  return Math.min(Math.max(time, 0), duration);
}
