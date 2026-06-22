import { DeliveryEndpointComponentSchema } from '../../schemas/component.schema';
import type {
  DeliveryEndpointIdData,
  DeliveryJobData,
  DeliveryJobIdData,
  DeliveryJobStatusData,
} from '../../schemas/delivery.schema';
import type { LevelData } from '../../schemas/level.schema';

export type DeliveryJobRuntimeIssueReason =
  | 'missing_accept_endpoint'
  | 'missing_completion_endpoint'
  | 'missing_route_endpoint'
  | 'missing_target_endpoint';

export interface DeliveryJobRuntimeIssue {
  endpointId: DeliveryEndpointIdData;
  jobId: DeliveryJobIdData;
  message: string;
  reason: DeliveryJobRuntimeIssueReason;
}

export type DeliveryJobRuntimeTransitionReason =
  | 'completed_job'
  | 'invalid_transition'
  | 'missing_endpoint'
  | 'missing_job'
  | 'stale_job';

export interface DeliveryJobRuntimeState {
  issue?: DeliveryJobRuntimeIssue;
  jobId: DeliveryJobIdData;
  sequence: number;
  status: DeliveryJobStatusData;
}

export interface DeliveryJobRuntimeSnapshot {
  activeJobId?: DeliveryJobIdData;
  issues: DeliveryJobRuntimeIssue[];
  jobs: DeliveryJobRuntimeState[];
  sequence: number;
}

export type DeliveryJobRuntimeResult =
  | {
      ok: true;
      job: DeliveryJobRuntimeState;
      snapshot: DeliveryJobRuntimeSnapshot;
    }
  | {
      job?: DeliveryJobRuntimeState;
      jobId: DeliveryJobIdData;
      message: string;
      ok: false;
      reason: DeliveryJobRuntimeTransitionReason;
      snapshot: DeliveryJobRuntimeSnapshot;
    };

interface DeliveryJobRuntimeOptions {
  endpointIds?: Iterable<DeliveryEndpointIdData>;
}

const activeStatuses = new Set<DeliveryJobStatusData>(['accepted', 'inProgress', 'readyToDeliver']);

const terminalStatuses = new Set<DeliveryJobStatusData>(['blocked', 'completed', 'failed']);

export class DeliveryJobRuntime {
  private readonly endpointIds: ReadonlySet<DeliveryEndpointIdData>;
  private readonly jobs: DeliveryJobData[];
  private readonly states = new Map<DeliveryJobIdData, DeliveryJobRuntimeState>();
  private sequence = 0;

  constructor(jobs: readonly DeliveryJobData[], options: DeliveryJobRuntimeOptions = {}) {
    this.jobs = cloneDeliveryJobs(jobs);
    this.endpointIds = new Set(options.endpointIds ?? []);
    this.reset();
  }

  accept(jobId: DeliveryJobIdData, endpointId?: DeliveryEndpointIdData): DeliveryJobRuntimeResult {
    const transition = this.getTransitionState(jobId);

    if (!transition.ok) {
      return transition;
    }

    const { job, state } = transition;

    if (state.status !== 'available') {
      return this.invalidTransition(
        jobId,
        `Delivery job "${jobId}" cannot be accepted from ${state.status}.`,
      );
    }

    if (endpointId && endpointId !== job.acceptEndpointId) {
      return this.missingEndpoint(
        jobId,
        endpointId,
        `Delivery job "${jobId}" can only be accepted at endpoint "${job.acceptEndpointId}".`,
      );
    }

    return this.setStatus(jobId, 'accepted');
  }

  complete(
    jobId: DeliveryJobIdData,
    endpointId?: DeliveryEndpointIdData,
  ): DeliveryJobRuntimeResult {
    const transition = this.getTransitionState(jobId);

    if (!transition.ok) {
      return transition;
    }

    const { job, state } = transition;

    if (state.status !== 'readyToDeliver') {
      return this.invalidTransition(
        jobId,
        `Delivery job "${jobId}" cannot be completed from ${state.status}.`,
      );
    }

    const completionEndpoint = endpointId ?? job.completion.endpointId;

    if (completionEndpoint !== job.completion.endpointId) {
      return this.missingEndpoint(
        jobId,
        completionEndpoint,
        `Delivery job "${jobId}" must be completed at endpoint "${job.completion.endpointId}".`,
      );
    }

    return this.setStatus(jobId, 'completed');
  }

  fail(jobId: DeliveryJobIdData): DeliveryJobRuntimeResult {
    const transition = this.getTransitionState(jobId);

    if (!transition.ok) {
      return transition;
    }

    return this.setStatus(jobId, 'failed');
  }

  getJob(jobId: DeliveryJobIdData): DeliveryJobRuntimeState | undefined {
    const state = this.states.get(jobId);

    return state ? cloneState(state) : undefined;
  }

  progress(jobId: DeliveryJobIdData): DeliveryJobRuntimeResult {
    const transition = this.getTransitionState(jobId);

    if (!transition.ok) {
      return transition;
    }

    if (transition.state.status !== 'accepted') {
      return this.invalidTransition(
        jobId,
        `Delivery job "${jobId}" cannot progress from ${transition.state.status}.`,
      );
    }

    return this.setStatus(jobId, 'inProgress');
  }

  readyToDeliver(
    jobId: DeliveryJobIdData,
    endpointId?: DeliveryEndpointIdData,
  ): DeliveryJobRuntimeResult {
    const transition = this.getTransitionState(jobId);

    if (!transition.ok) {
      return transition;
    }

    const { job, state } = transition;

    if (state.status !== 'inProgress') {
      return this.invalidTransition(
        jobId,
        `Delivery job "${jobId}" cannot become ready to deliver from ${state.status}.`,
      );
    }

    if (endpointId && endpointId !== job.targetEndpointId) {
      return this.missingEndpoint(
        jobId,
        endpointId,
        `Delivery job "${jobId}" target endpoint is "${job.targetEndpointId}".`,
      );
    }

    return this.setStatus(jobId, 'readyToDeliver');
  }

  reset(): DeliveryJobRuntimeSnapshot {
    this.sequence = 0;
    this.states.clear();

    for (const job of this.jobs) {
      const issue = this.getJobIssue(job);

      this.states.set(job.id, {
        ...(issue ? { issue } : {}),
        jobId: job.id,
        sequence: this.sequence,
        status: issue ? 'blocked' : job.defaultStatus,
      });
    }

    return this.getSnapshot();
  }

  getSnapshot(): DeliveryJobRuntimeSnapshot {
    const jobs = this.jobs.map((job) => cloneState(requiredState(this.states, job.id)));
    const issues = jobs.flatMap((job) => (job.issue ? [cloneIssue(job.issue)] : []));
    const activeJob = jobs.find((job) => activeStatuses.has(job.status));

    return {
      ...(activeJob ? { activeJobId: activeJob.jobId } : {}),
      issues,
      jobs,
      sequence: this.sequence,
    };
  }

  private getJobIssue(job: DeliveryJobData): DeliveryJobRuntimeIssue | undefined {
    if (!this.hasEndpoint(job.acceptEndpointId)) {
      return {
        endpointId: job.acceptEndpointId,
        jobId: job.id,
        message: `Delivery job "${job.id}" is missing accept endpoint "${job.acceptEndpointId}".`,
        reason: 'missing_accept_endpoint',
      };
    }

    if (!this.hasEndpoint(job.targetEndpointId)) {
      return {
        endpointId: job.targetEndpointId,
        jobId: job.id,
        message: `Delivery job "${job.id}" is missing target endpoint "${job.targetEndpointId}".`,
        reason: 'missing_target_endpoint',
      };
    }

    if (!this.hasEndpoint(job.completion.endpointId)) {
      return {
        endpointId: job.completion.endpointId,
        jobId: job.id,
        message: `Delivery job "${job.id}" is missing completion endpoint "${job.completion.endpointId}".`,
        reason: 'missing_completion_endpoint',
      };
    }

    const staleRouteHint = job.routeHints.find(
      (hint) => hint.type === 'endpoint' && !this.hasEndpoint(hint.endpointId),
    );

    if (staleRouteHint?.type === 'endpoint') {
      return {
        endpointId: staleRouteHint.endpointId,
        jobId: job.id,
        message: `Delivery job "${job.id}" is missing route endpoint "${staleRouteHint.endpointId}".`,
        reason: 'missing_route_endpoint',
      };
    }

    return undefined;
  }

  private getTransitionState(
    jobId: DeliveryJobIdData,
  ):
    | { job: DeliveryJobData; ok: true; state: DeliveryJobRuntimeState }
    | Extract<DeliveryJobRuntimeResult, { ok: false }> {
    const job = this.jobs.find((candidate) => candidate.id === jobId);
    const state = this.states.get(jobId);

    if (!job || !state) {
      return {
        jobId,
        message: `Delivery job "${jobId}" does not exist.`,
        ok: false,
        reason: 'missing_job',
        snapshot: this.getSnapshot(),
      };
    }

    if (state.issue) {
      return {
        job: cloneState(state),
        jobId,
        message: state.issue.message,
        ok: false,
        reason: 'stale_job',
        snapshot: this.getSnapshot(),
      };
    }

    if (terminalStatuses.has(state.status)) {
      return {
        job: cloneState(state),
        jobId,
        message: `Delivery job "${jobId}" is already ${state.status}.`,
        ok: false,
        reason: state.status === 'completed' ? 'completed_job' : 'invalid_transition',
        snapshot: this.getSnapshot(),
      };
    }

    return { job, ok: true, state };
  }

  private hasEndpoint(endpointId: DeliveryEndpointIdData): boolean {
    return this.endpointIds.size === 0 || this.endpointIds.has(endpointId);
  }

  private invalidTransition(
    jobId: DeliveryJobIdData,
    message: string,
  ): Extract<DeliveryJobRuntimeResult, { ok: false }> {
    return {
      job: this.getJob(jobId),
      jobId,
      message,
      ok: false,
      reason: 'invalid_transition',
      snapshot: this.getSnapshot(),
    };
  }

  private missingEndpoint(
    jobId: DeliveryJobIdData,
    endpointId: DeliveryEndpointIdData,
    message: string,
  ): Extract<DeliveryJobRuntimeResult, { ok: false }> {
    return {
      job: this.getJob(jobId),
      jobId,
      message,
      ok: false,
      reason: this.hasEndpoint(endpointId) ? 'invalid_transition' : 'missing_endpoint',
      snapshot: this.getSnapshot(),
    };
  }

  private setStatus(
    jobId: DeliveryJobIdData,
    status: DeliveryJobStatusData,
  ): Extract<DeliveryJobRuntimeResult, { ok: true }> {
    const current = requiredState(this.states, jobId);
    const nextSequence = this.sequence + 1;
    const nextState: DeliveryJobRuntimeState = {
      jobId,
      sequence: nextSequence,
      status,
    };

    this.sequence = nextSequence;
    this.states.set(current.jobId, nextState);

    return {
      job: cloneState(nextState),
      ok: true,
      snapshot: this.getSnapshot(),
    };
  }
}

export function collectDeliveryEndpointIds(level: LevelData): DeliveryEndpointIdData[] {
  return level.entities
    .map((entity) => DeliveryEndpointComponentSchema.safeParse(entity.components.DeliveryEndpoint))
    .filter((result): result is Extract<typeof result, { success: true }> => result.success)
    .map((result) => result.data.endpointId)
    .sort((left, right) => left.localeCompare(right));
}

export function createDeliveryJobRuntimeFromLevel(level: LevelData): DeliveryJobRuntime {
  return new DeliveryJobRuntime(level.deliveryJobs ?? [], {
    endpointIds: collectDeliveryEndpointIds(level),
  });
}

function cloneDeliveryJobs(jobs: readonly DeliveryJobData[]): DeliveryJobData[] {
  return JSON.parse(JSON.stringify(jobs)) as DeliveryJobData[];
}

function cloneIssue(issue: DeliveryJobRuntimeIssue): DeliveryJobRuntimeIssue {
  return { ...issue };
}

function cloneState(state: DeliveryJobRuntimeState): DeliveryJobRuntimeState {
  return {
    ...(state.issue ? { issue: cloneIssue(state.issue) } : {}),
    jobId: state.jobId,
    sequence: state.sequence,
    status: state.status,
  };
}

function requiredState(
  states: ReadonlyMap<DeliveryJobIdData, DeliveryJobRuntimeState>,
  jobId: DeliveryJobIdData,
): DeliveryJobRuntimeState {
  const state = states.get(jobId);

  if (!state) {
    throw new Error(`Delivery job runtime state is missing "${jobId}".`);
  }

  return state;
}
