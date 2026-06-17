import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import openGateTimelineJson from '../../../data/timelines/tl_open_gate.json';
import { TimelineSchema } from '../../schemas/timeline.schema';
import { TimelinePanel } from './TimelinePanel';

const openGateTimeline = TimelineSchema.parse(openGateTimelineJson);

describe('TimelinePanel smoke', () => {
  it('renders timeline controls, moved playhead, and selected action marker editor', () => {
    const markup = renderToStaticMarkup(
      <TimelinePanel
        timelines={[openGateTimeline]}
        selectedTimeline={openGateTimeline}
        selectedTrackId="track_set_flag"
        currentTime={2.25}
        saveStatus="idle"
        playbackStatus="stopped"
        previewStatus="Ready"
        entityIds={['gate_a', 'switch_a']}
        cameraShotIds={['cam_gate_reveal']}
        soundAssetIds={['audio.switch_click']}
        onSelectTimeline={() => undefined}
        onSelectTrack={() => undefined}
        onScrubTimeline={() => undefined}
        onPlayTimeline={() => undefined}
        onPauseTimeline={() => undefined}
        onResumeTimeline={() => undefined}
        onStopTimeline={() => undefined}
        onSeekTimeline={() => undefined}
        onAddTrack={() => undefined}
        onApplyTrack={() => undefined}
        onApplyTrackItem={() => undefined}
        onRemoveTrack={() => undefined}
        onSaveTimeline={() => undefined}
      />,
    );

    expect(markup).toContain('data-testid="timeline-panel"');
    expect(markup).toContain('data-testid="timeline-ruler"');
    expect(markup).toContain('data-testid="timeline-playhead"');
    expect(markup).toContain('left:50%');
    expect(markup).toContain('track_set_flag');
    expect(markup).toContain('Toggle Flag Value');
    expect(markup).toContain('Play');
    expect(markup).toContain('End');
  });
});
