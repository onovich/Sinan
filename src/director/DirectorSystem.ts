import { EventSystem } from '../events/EventSystem';
import type { ActionExecutionContext, DirectorCommand } from '../events/types';
import type { WebRuntime } from '../runtime/WebRuntime';
import type { CameraShotData } from '../schemas/cameraShot.schema';
import type { TimelineData, TimelineTrackData } from '../schemas/timeline.schema';
import { ActionTrackPlayer } from './ActionTrackPlayer';
import { AnimationTrackPlayer } from './AnimationTrackPlayer';
import { AudioTrackPlayer } from './AudioTrackPlayer';
import { CameraShotTrackPlayer } from './CameraShotTrackPlayer';
import { DirectorCameraSystem } from './DirectorCameraSystem';
import {
  MaterialParameterTrackPlayer,
  type MaterialParameterTrackSample,
} from './MaterialParameterTrackPlayer';
import { PropertyTrackPlayer, type PropertyTrackSample } from './PropertyTrackPlayer';
import { SubtitleTrackPlayer } from './SubtitleTrackPlayer';
import {
  TimelinePlayer,
  type TimelinePlaybackStatus,
  type TimelinePlayOptions,
  type TimelinePlayerState,
} from './TimelinePlayer';

export interface DirectorSystemContext extends Omit<ActionExecutionContext, 'runtime'> {
  runtime?: WebRuntime;
  previewMode?: boolean;
}

export class DirectorSystem {
  private readonly timelinePlayer: TimelinePlayer;
  private readonly actionTrackPlayer = new ActionTrackPlayer();
  private readonly animationTrackPlayer = new AnimationTrackPlayer();
  private readonly audioTrackPlayer = new AudioTrackPlayer();
  private readonly cameraShotTrackPlayer = new CameraShotTrackPlayer();
  private readonly materialParameterTrackPlayer = new MaterialParameterTrackPlayer();
  private readonly propertyTrackPlayer = new PropertyTrackPlayer();
  private readonly subtitleTrackPlayer = new SubtitleTrackPlayer();
  private activeContext: DirectorSystemContext | undefined;
  private lastMaterialParameterSamples: MaterialParameterTrackSample[] = [];
  private lastPropertySamples: PropertyTrackSample[] = [];
  private lastFinishedEventIds: string[] = [];

  constructor(
    private readonly timelines: Readonly<Record<string, TimelineData>>,
    private readonly eventSystem = new EventSystem([]),
    private readonly cameraShots: Readonly<Record<string, CameraShotData>> = {},
  ) {
    this.timelinePlayer = new TimelinePlayer(timelines, {
      onTrackReached: ({ timeline, track }) => {
        this.handleTrackReached(timeline, track);
      },
      onTimelineFinished: ({ timeline }) => {
        this.handleTimelineFinished(timeline);
      },
    });
  }

  update(dt: number, context: DirectorSystemContext): void {
    this.activeContext = context;
    this.processTimelineCommands(context.directorCommands);
    this.timelinePlayer.update(dt);
    this.lastPropertySamples = this.samplePlayingProperties();
    this.lastMaterialParameterSamples = this.samplePlayingMaterialParameters(context);
    this.activeContext = undefined;
  }

  scrub(timelineId: string, time: number, context: DirectorSystemContext): void {
    const timeline = this.getTimeline(timelineId);
    this.timelinePlayer.scrub(timelineId, time);
    this.lastMaterialParameterSamples = [];
    this.lastPropertySamples = [];

    for (const track of timeline.tracks) {
      this.scrubTrack(track, context, time);
    }
  }

  playTimeline(timelineId: string, options: TimelinePlayOptions = {}): void {
    this.timelinePlayer.play(timelineId, options);
  }

  pauseTimeline(timelineId: string): void {
    this.timelinePlayer.pause(timelineId);
  }

  resumeTimeline(timelineId: string): void {
    this.timelinePlayer.resume(timelineId);
  }

  stopTimeline(timelineId: string): void {
    this.timelinePlayer.stop(timelineId);
  }

  seekTimeline(timelineId: string, time: number): void {
    this.timelinePlayer.seek(timelineId, time);
  }

  getTimelineState(timelineId: string): TimelinePlayerState | undefined {
    return this.timelinePlayer.getState(timelineId);
  }

  getTimelineStatus(timelineId: string): TimelinePlaybackStatus {
    return this.timelinePlayer.getState(timelineId)?.status ?? 'stopped';
  }

  getLastPropertySamples(): readonly PropertyTrackSample[] {
    return this.lastPropertySamples;
  }

  getLastMaterialParameterSamples(): readonly MaterialParameterTrackSample[] {
    return this.lastMaterialParameterSamples;
  }

  getLastFinishedEventIds(): readonly string[] {
    return this.lastFinishedEventIds;
  }

  isPlaying(timelineId: string): boolean {
    return this.timelinePlayer.isPlaying(timelineId);
  }

  private processTimelineCommands(commands: DirectorCommand[]): void {
    for (let index = commands.length - 1; index >= 0; index -= 1) {
      const command = commands[index];

      if (command.type === 'timeline.play') {
        this.timelinePlayer.play(command.timelineId);
        commands.splice(index, 1);
      } else if (command.type === 'timeline.stop') {
        this.timelinePlayer.stop(command.timelineId);
        commands.splice(index, 1);
      }
    }
  }

  private handleTrackReached(timeline: TimelineData, track: TimelineTrackData): void {
    const context = this.activeContext;

    if (!context) {
      return;
    }

    switch (track.type) {
      case 'action':
        if (context.previewMode) {
          this.actionTrackPlayer.scrub(track, context);
        } else {
          this.actionTrackPlayer.play(track, context);
        }
        break;
      case 'animation.play':
        if (context.runtime) {
          this.animationTrackPlayer.play(track, context.runtime);
        }
        break;
      case 'camera.shot':
        this.cameraShotTrackPlayer.play(track, context);
        this.applyCameraShotTrack(track.shotId, 0, context);
        break;
      case 'sound':
        this.audioTrackPlayer.play(track, context);
        break;
      case 'subtitle':
        this.subtitleTrackPlayer.play(track, context);
        break;
      case 'property':
      case 'material.parameter':
      case 'wait':
        break;
    }

    void timeline;
  }

  private handleTimelineFinished(timeline: TimelineData): void {
    const context = this.activeContext;

    if (!context) {
      return;
    }

    this.lastFinishedEventIds = this.eventSystem.handleTrigger(
      { type: 'timeline.finished', timelineId: timeline.id },
      context,
    );
  }

  private scrubTrack(
    track: TimelineTrackData,
    context: DirectorSystemContext,
    timelineTime: number,
  ): void {
    switch (track.type) {
      case 'action':
        this.actionTrackPlayer.scrub(track, context);
        break;
      case 'animation.play':
        if (context.runtime) {
          this.animationTrackPlayer.scrub(track, context.runtime, timelineTime);
        }
        break;
      case 'camera.shot':
        this.cameraShotTrackPlayer.scrub(track, context, timelineTime);
        this.applyCameraShotTrack(
          track.shotId,
          clampTrackTime(timelineTime - track.start, track.duration),
          context,
        );
        break;
      case 'property':
        this.lastPropertySamples = [
          ...this.lastPropertySamples,
          this.propertyTrackPlayer.sample(track, timelineTime),
        ];
        break;
      case 'material.parameter': {
        const sample = this.materialParameterTrackPlayer.sample(track, timelineTime);

        this.lastMaterialParameterSamples = [...this.lastMaterialParameterSamples, sample];
        applyMaterialParameterSample(sample, context);
        break;
      }
      case 'subtitle':
        this.subtitleTrackPlayer.scrub(track, context, timelineTime);
        break;
      case 'sound':
        this.audioTrackPlayer.scrub();
        break;
      case 'wait':
        break;
    }
  }

  private samplePlayingProperties(): PropertyTrackSample[] {
    const samples: PropertyTrackSample[] = [];

    for (const state of this.timelinePlayer.getStates()) {
      if (state.status !== 'playing') {
        continue;
      }

      const timeline = this.getTimeline(state.timelineId);

      for (const track of timeline.tracks) {
        if (track.type === 'property') {
          samples.push(this.propertyTrackPlayer.sample(track, state.time));
        } else if (
          track.type === 'camera.shot' &&
          state.time >= track.start &&
          state.time <= track.start + track.duration
        ) {
          this.applyCameraShotTrack(
            track.shotId,
            clampTrackTime(state.time - track.start, track.duration),
            this.activeContext,
          );
        }
      }
    }

    return samples;
  }

  private samplePlayingMaterialParameters(
    context: DirectorSystemContext,
  ): MaterialParameterTrackSample[] {
    const samples: MaterialParameterTrackSample[] = [];

    for (const state of this.timelinePlayer.getStates()) {
      if (state.status !== 'playing') {
        continue;
      }

      const timeline = this.getTimeline(state.timelineId);

      for (const track of timeline.tracks) {
        if (track.type !== 'material.parameter') {
          continue;
        }

        const sample = this.materialParameterTrackPlayer.sample(track, state.time);

        samples.push(sample);
        applyMaterialParameterSample(sample, context);
      }
    }

    return samples;
  }

  private getTimeline(timelineId: string): TimelineData {
    const timeline = this.timelines[timelineId];

    if (!timeline) {
      throw new Error(`Unknown timeline "${timelineId}".`);
    }

    return timeline;
  }

  private applyCameraShotTrack(
    shotId: string,
    shotTime: number,
    context: DirectorSystemContext | undefined,
  ): void {
    if (!context?.runtime) {
      return;
    }

    const shot = this.cameraShots[shotId];

    if (!shot) {
      return;
    }

    new DirectorCameraSystem(context.runtime).applyShot(shot, shotTime);
  }
}

function applyMaterialParameterSample(
  sample: MaterialParameterTrackSample,
  context: DirectorSystemContext,
): void {
  context.runtime?.setMaterialParameter?.({
    entityId: sample.target,
    slot: sample.slot,
    parameter: sample.parameter,
    value: sample.value,
  });
}

function clampTrackTime(time: number, duration: number): number {
  return Math.round(Math.min(Math.max(time, 0), duration) * 1_000_000) / 1_000_000;
}
