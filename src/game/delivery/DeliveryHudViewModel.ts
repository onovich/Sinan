import { DeliveryEndpointComponentSchema } from '../../schemas/component.schema';
import type {
  DeliveryEndpointIdData,
  DeliveryJobData,
  DeliveryJobStatusData,
} from '../../schemas/delivery.schema';
import type { LevelData } from '../../schemas/level.schema';
import type { RuntimeDeliveryRouteFeedbackState } from '../../runtime/RuntimeTypes';
import {
  createDeliveryJobRuntimeFromLevel,
  type DeliveryJobRuntimeIssue,
  type DeliveryJobRuntimeSnapshot,
} from './DeliveryJobRuntime';

export type DeliveryHudStatus = DeliveryJobStatusData | 'unavailable';
export type DeliveryHudTone = 'neutral' | 'active' | 'success' | 'warning' | 'muted';

export interface DeliveryHudInteractionPrompt {
  endpointId?: DeliveryEndpointIdData;
  text: string;
}

export interface DeliveryHudViewModelInput {
  interactionPrompt?: DeliveryHudInteractionPrompt;
  level: LevelData;
  routeFeedback?: RuntimeDeliveryRouteFeedbackState;
  snapshot?: DeliveryJobRuntimeSnapshot;
}

export interface DeliveryHudViewModel {
  activeJobId?: string;
  activeJobStatus: DeliveryHudStatus;
  blocked: boolean;
  completionText?: string;
  empty: boolean;
  endpointCount: number;
  jobCount: number;
  prompt: string;
  promptVisible: boolean;
  routeMarkerCount: number;
  stale: boolean;
  statusLabel: string;
  targetEndpointId?: string;
  targetLabel?: string;
  targetVisible: boolean;
  title: string;
  tone: DeliveryHudTone;
}

const activeStatuses = new Set<DeliveryJobStatusData>(['accepted', 'inProgress', 'readyToDeliver']);

export function createDeliveryHudViewModel({
  interactionPrompt,
  level,
  routeFeedback,
  snapshot,
}: DeliveryHudViewModelInput): DeliveryHudViewModel {
  const jobs = level.deliveryJobs ?? [];
  const endpointLabels = getEndpointLabels(level);
  const resolvedSnapshot = snapshot ?? createDeliveryJobRuntimeFromLevel(level).getSnapshot();

  if (jobs.length === 0) {
    return {
      activeJobStatus: 'unavailable',
      blocked: false,
      empty: true,
      endpointCount: endpointLabels.size,
      jobCount: 0,
      prompt: 'No delivery jobs loaded',
      promptVisible: true,
      routeMarkerCount: routeFeedback?.markerCount ?? 0,
      stale: false,
      statusLabel: 'Unavailable',
      targetVisible: false,
      title: 'Delivery Showcase',
      tone: 'muted',
    };
  }

  const job = selectHudJob(jobs, resolvedSnapshot);
  const state = resolvedSnapshot.jobs.find((candidate) => candidate.jobId === job.id);
  const status = state?.status ?? job.defaultStatus;
  const issue =
    state?.issue ?? resolvedSnapshot.issues.find((candidate) => candidate.jobId === job.id);
  const targetLabel = endpointLabels.get(job.targetEndpointId);
  const blocked = status === 'blocked' || Boolean(issue);
  const completed = status === 'completed';
  const prompt = resolvePrompt({
    interactionPrompt,
    issue,
    job,
    status,
    targetLabel,
  });

  return {
    activeJobId: resolvedSnapshot.activeJobId ?? job.id,
    activeJobStatus: status,
    blocked,
    ...(completed ? { completionText: job.feedback.completed } : {}),
    empty: false,
    endpointCount: endpointLabels.size,
    jobCount: jobs.length,
    prompt,
    promptVisible: prompt.length > 0,
    routeMarkerCount: routeFeedback?.markerCount ?? 0,
    stale: Boolean(issue),
    statusLabel: formatDeliveryHudStatus(status),
    targetEndpointId: job.targetEndpointId,
    ...(targetLabel ? { targetLabel } : {}),
    targetVisible: activeStatuses.has(status) || status === 'readyToDeliver',
    title: job.title,
    tone: getHudTone(status, issue),
  };
}

function selectHudJob(
  jobs: readonly DeliveryJobData[],
  snapshot: DeliveryJobRuntimeSnapshot,
): DeliveryJobData {
  const activeJob = snapshot.activeJobId
    ? jobs.find((job) => job.id === snapshot.activeJobId)
    : undefined;

  if (activeJob) {
    return activeJob;
  }

  const statesByJobId = new Map(snapshot.jobs.map((state) => [state.jobId, state]));
  const availableJob = jobs.find((job) => {
    const status = statesByJobId.get(job.id)?.status ?? job.defaultStatus;

    return status !== 'completed' && status !== 'blocked' && status !== 'failed';
  });

  return availableJob ?? jobs[0];
}

function resolvePrompt(input: {
  interactionPrompt: DeliveryHudInteractionPrompt | undefined;
  issue: DeliveryJobRuntimeIssue | undefined;
  job: DeliveryJobData;
  status: DeliveryJobStatusData;
  targetLabel: string | undefined;
}): string {
  if (input.issue) {
    return input.issue.message;
  }

  if (input.interactionPrompt?.text) {
    return input.interactionPrompt.text;
  }

  if (input.status === 'available') {
    return input.job.description;
  }

  if (input.status === 'readyToDeliver' && input.targetLabel) {
    return `${input.job.feedback.readyToDeliver} Target: ${input.targetLabel}.`;
  }

  return input.job.feedback[input.status] ?? input.job.description;
}

function getEndpointLabels(level: LevelData): ReadonlyMap<DeliveryEndpointIdData, string> {
  const labels = new Map<DeliveryEndpointIdData, string>();

  for (const entity of level.entities) {
    const result = DeliveryEndpointComponentSchema.safeParse(entity.components.DeliveryEndpoint);

    if (result.success) {
      labels.set(result.data.endpointId, result.data.label);
    }
  }

  return labels;
}

function formatDeliveryHudStatus(status: DeliveryHudStatus): string {
  if (status === 'readyToDeliver') {
    return 'Ready';
  }

  if (status === 'inProgress') {
    return 'In progress';
  }

  return status[0].toUpperCase() + status.slice(1);
}

function getHudTone(
  status: DeliveryJobStatusData,
  issue: DeliveryJobRuntimeIssue | undefined,
): DeliveryHudTone {
  if (issue || status === 'blocked' || status === 'failed') {
    return 'warning';
  }

  if (status === 'completed') {
    return 'success';
  }

  if (activeStatuses.has(status)) {
    return 'active';
  }

  if (status === 'available') {
    return 'neutral';
  }

  return 'muted';
}
