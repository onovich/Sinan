import { DeliveryEndpointComponentSchema } from '../../schemas/component.schema';
import type {
  DeliveryEndpointIdData,
  DeliveryJobData,
  DeliveryJobIdData,
  DeliveryJobStatusData,
  DeliveryRouteHintData,
} from '../../schemas/delivery.schema';
import type { EntityData } from '../../schemas/entity.schema';
import type { LevelData } from '../../schemas/level.schema';
import type {
  RuntimeDeliveryRouteFeedbackIssue,
  RuntimeDeliveryRouteFeedbackMarker,
  RuntimeDeliveryRouteFeedbackMarkerKind,
  RuntimeDeliveryRouteFeedbackMarkerStatus,
  RuntimeDeliveryRouteFeedbackState,
  Vec3,
} from '../../runtime/RuntimeTypes';
import type { World } from '../../world';
import {
  createDeliveryJobRuntimeFromLevel,
  type DeliveryJobRuntimeSnapshot,
} from './DeliveryJobRuntime';

export interface DeliveryRouteFeedbackInput {
  level: LevelData;
  snapshot?: DeliveryJobRuntimeSnapshot;
  world?: World;
}

type EndpointBinding = {
  endpointId: DeliveryEndpointIdData;
  entity: EntityData;
  label: string;
};

const activeStatuses = new Set<DeliveryJobStatusData>(['accepted', 'inProgress', 'readyToDeliver']);

const terminalStatuses = new Set<DeliveryJobStatusData>(['blocked', 'completed', 'failed']);

export function createDeliveryRouteFeedbackState(
  input: DeliveryRouteFeedbackInput,
): RuntimeDeliveryRouteFeedbackState {
  const jobs = input.level.deliveryJobs ?? [];
  const snapshot = input.snapshot ?? createDeliveryJobRuntimeFromLevel(input.level).getSnapshot();

  if (jobs.length === 0) {
    return {
      issueCount: snapshot.issues.length,
      issues: snapshot.issues.map((issue) => ({ ...issue })),
      markerCount: 0,
      markers: [],
      sequence: snapshot.sequence,
      status: 'inactive',
    };
  }

  const job = selectFeedbackJob(jobs, snapshot);
  const state = snapshot.jobs.find((candidate) => candidate.jobId === job.id);
  const status = state?.status ?? job.defaultStatus;
  const endpointBindings = getEndpointBindings(input.level, input.world);
  const issues = snapshot.issues.map((issue) => ({ ...issue }));
  const markers = job.routeHints.flatMap((hint, index) =>
    createMarkerFromHint({
      endpointBindings,
      hint,
      index,
      issues,
      job,
      status,
      world: input.world,
    }),
  );

  ensureEndpointMarker({
    endpointBindings,
    endpointId: job.acceptEndpointId,
    index: markers.length,
    issues,
    job,
    kind: 'accept',
    markers,
    status,
    world: input.world,
  });
  ensureEndpointMarker({
    endpointBindings,
    endpointId: job.targetEndpointId,
    index: markers.length,
    issues,
    job,
    kind: 'target',
    markers,
    status,
    world: input.world,
  });

  return {
    ...(snapshot.activeJobId ? { activeJobId: snapshot.activeJobId } : {}),
    issueCount: issues.length,
    issues,
    jobId: job.id,
    markerCount: markers.length,
    markers,
    sequence: snapshot.sequence,
    status,
  };
}

function selectFeedbackJob(
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
    const state = statesByJobId.get(job.id);
    const status = state?.status ?? job.defaultStatus;

    return !terminalStatuses.has(status);
  });

  return availableJob ?? jobs[0];
}

function createMarkerFromHint(input: {
  endpointBindings: ReadonlyMap<DeliveryEndpointIdData, EndpointBinding>;
  hint: DeliveryRouteHintData;
  index: number;
  issues: RuntimeDeliveryRouteFeedbackIssue[];
  job: DeliveryJobData;
  status: DeliveryJobStatusData;
  world: World | undefined;
}): RuntimeDeliveryRouteFeedbackMarker[] {
  if (input.hint.type === 'endpoint') {
    const kind = getEndpointMarkerKind(input.job, input.hint.endpointId);

    return createEndpointMarker({
      endpointBindings: input.endpointBindings,
      endpointId: input.hint.endpointId,
      index: input.index,
      issues: input.issues,
      job: input.job,
      kind,
      label: input.hint.label,
      status: input.status,
      world: input.world,
    });
  }

  return createSphericalRouteMarker({
    hint: input.hint,
    index: input.index,
    issues: input.issues,
    job: input.job,
    status: input.status,
    world: input.world,
  });
}

function createEndpointMarker(input: {
  endpointBindings: ReadonlyMap<DeliveryEndpointIdData, EndpointBinding>;
  endpointId: DeliveryEndpointIdData;
  index: number;
  issues: RuntimeDeliveryRouteFeedbackIssue[];
  job: DeliveryJobData;
  kind: RuntimeDeliveryRouteFeedbackMarkerKind;
  label?: string;
  status: DeliveryJobStatusData;
  world: World | undefined;
}): RuntimeDeliveryRouteFeedbackMarker[] {
  const binding = input.endpointBindings.get(input.endpointId);

  if (!binding) {
    pushMissingEndpointIssue(input.issues, input.job, input.endpointId, input.kind);

    return [];
  }

  const runtimeTransform = input.world?.getRuntimeTransform(binding.entity.id);
  const authoredPosition = binding.entity.transform.position;
  const sphericalPlacement = input.world
    ?.getSphericalPlacements()
    .placements.find((placement) => placement.entityId === binding.entity.id);
  const position = runtimeTransform?.position ?? authoredPosition;
  const normal = sphericalPlacement?.surfaceFrame.normal ?? ([0, 1, 0] as const);

  return [
    createMarker({
      endpointId: input.endpointId,
      entityId: binding.entity.id,
      fallbackUsed: !runtimeTransform,
      index: input.index,
      job: input.job,
      kind: input.kind,
      label: input.label ?? binding.label,
      normal,
      position,
      status: input.status,
    }),
  ];
}

function createSphericalRouteMarker(input: {
  hint: Extract<DeliveryRouteHintData, { type: 'spherical-region' }>;
  index: number;
  issues: RuntimeDeliveryRouteFeedbackIssue[];
  job: DeliveryJobData;
  status: DeliveryJobStatusData;
  world: World | undefined;
}): RuntimeDeliveryRouteFeedbackMarker[] {
  const localPosition = input.hint.localPosition;
  const frame =
    localPosition && input.world
      ? input.world.resolveSphericalRegionFrame({
          localPosition,
          region: input.hint.region,
        })
      : undefined;
  const fallbackUsed = !frame;

  if (!frame) {
    input.issues.push({
      jobId: input.job.id,
      message: createSphericalIssueMessage(input.job.id, input.hint.region, input.world),
      reason: getSphericalIssueReason(input.hint.region, input.world),
      regionId: input.hint.region,
    });
  }

  if (!frame && !localPosition) {
    return [];
  }

  return [
    createMarker({
      fallbackUsed,
      index: input.index,
      job: input.job,
      kind: 'route',
      label: input.hint.label,
      normal: frame?.normal ?? ([0, 1, 0] as const),
      position: frame?.position ?? localPosition,
      regionId: input.hint.region,
      status: input.status,
    }),
  ];
}

function ensureEndpointMarker(input: {
  endpointBindings: ReadonlyMap<DeliveryEndpointIdData, EndpointBinding>;
  endpointId: DeliveryEndpointIdData;
  index: number;
  issues: RuntimeDeliveryRouteFeedbackIssue[];
  job: DeliveryJobData;
  kind: 'accept' | 'target';
  markers: RuntimeDeliveryRouteFeedbackMarker[];
  status: DeliveryJobStatusData;
  world: World | undefined;
}): void {
  const existing = input.markers.some((marker) => marker.endpointId === input.endpointId);

  if (existing) {
    return;
  }

  input.markers.push(
    ...createEndpointMarker({
      endpointBindings: input.endpointBindings,
      endpointId: input.endpointId,
      index: input.index,
      issues: input.issues,
      job: input.job,
      kind: input.kind,
      status: input.status,
      world: input.world,
    }),
  );
}

function createMarker(input: {
  endpointId?: string;
  entityId?: string;
  fallbackUsed: boolean;
  index: number;
  job: DeliveryJobData;
  kind: RuntimeDeliveryRouteFeedbackMarkerKind;
  label?: string;
  normal?: Vec3;
  position?: Vec3;
  regionId?: string;
  status: DeliveryJobStatusData;
}): RuntimeDeliveryRouteFeedbackMarker {
  const active = isMarkerActive(input.kind, input.status);
  const completed = input.status === 'completed';
  const markerStatus = getMarkerStatus(input.status, active);

  return {
    active,
    completed,
    ...(input.endpointId ? { endpointId: input.endpointId } : {}),
    ...(input.entityId ? { entityId: input.entityId } : {}),
    fallbackUsed: input.fallbackUsed,
    id: `${input.job.id}:route-feedback:${input.index}:${input.kind}`,
    jobId: input.job.id,
    kind: input.kind,
    ...(input.label ? { label: input.label } : {}),
    ...(input.normal ? { normal: cloneVec3(input.normal) } : {}),
    ...(input.position ? { position: cloneVec3(input.position) } : {}),
    ...(input.regionId ? { regionId: input.regionId } : {}),
    status: markerStatus,
    target: input.kind === 'target' || input.kind === 'completion',
    visible: input.status !== 'failed',
  };
}

function getEndpointBindings(
  level: LevelData,
  world: World | undefined,
): ReadonlyMap<DeliveryEndpointIdData, EndpointBinding> {
  const bindings = new Map<DeliveryEndpointIdData, EndpointBinding>();
  const entities = world?.toEntityData() ?? level.entities;

  for (const entity of entities) {
    const result = DeliveryEndpointComponentSchema.safeParse(entity.components.DeliveryEndpoint);

    if (!result.success) {
      continue;
    }

    bindings.set(result.data.endpointId, {
      endpointId: result.data.endpointId,
      entity,
      label: result.data.label,
    });
  }

  return bindings;
}

function getEndpointMarkerKind(
  job: DeliveryJobData,
  endpointId: DeliveryEndpointIdData,
): RuntimeDeliveryRouteFeedbackMarkerKind {
  if (endpointId === job.acceptEndpointId) {
    return 'accept';
  }

  if (endpointId === job.targetEndpointId) {
    return 'target';
  }

  if (endpointId === job.completion.endpointId) {
    return 'completion';
  }

  return 'route';
}

function isMarkerActive(
  kind: RuntimeDeliveryRouteFeedbackMarkerKind,
  status: DeliveryJobStatusData,
): boolean {
  if (status === 'available') {
    return kind === 'accept';
  }

  if (!activeStatuses.has(status)) {
    return false;
  }

  if (status === 'readyToDeliver') {
    return kind === 'target' || kind === 'completion';
  }

  return kind === 'route' || kind === 'target' || kind === 'completion';
}

function getMarkerStatus(
  status: DeliveryJobStatusData,
  active: boolean,
): RuntimeDeliveryRouteFeedbackMarkerStatus {
  if (status === 'completed') {
    return 'completed';
  }

  if (status === 'blocked' || status === 'failed') {
    return 'blocked';
  }

  if (active) {
    return 'active';
  }

  if (status === 'available') {
    return 'available';
  }

  return 'inactive';
}

function pushMissingEndpointIssue(
  issues: RuntimeDeliveryRouteFeedbackIssue[],
  job: DeliveryJobData,
  endpointId: DeliveryEndpointIdData,
  kind: RuntimeDeliveryRouteFeedbackMarkerKind,
): void {
  const reason =
    kind === 'accept'
      ? 'missing_accept_endpoint'
      : kind === 'target'
        ? 'missing_target_endpoint'
        : kind === 'completion'
          ? 'missing_completion_endpoint'
          : 'missing_route_endpoint';
  const exists = issues.some(
    (issue) => issue.jobId === job.id && issue.endpointId === endpointId && issue.reason === reason,
  );

  if (exists) {
    return;
  }

  issues.push({
    endpointId,
    jobId: job.id,
    message: `Delivery job "${job.id}" is missing ${kind} endpoint "${endpointId}".`,
    reason,
  });
}

function getSphericalIssueReason(
  regionId: string,
  world: World | undefined,
): RuntimeDeliveryRouteFeedbackIssue['reason'] {
  if (!world) {
    return 'missing_world_projection';
  }

  return world.resolveSphericalRegionFrame({
    localPosition: [0, 0, 0],
    region: regionId,
  })
    ? 'invalid_spherical_region'
    : 'missing_spherical_region';
}

function createSphericalIssueMessage(
  jobId: DeliveryJobIdData,
  regionId: string,
  world: World | undefined,
): string {
  if (!world) {
    return `Delivery job "${jobId}" route marker references spherical region "${regionId}" without a world projection.`;
  }

  return `Delivery job "${jobId}" route marker references unavailable spherical region "${regionId}".`;
}

function cloneVec3(value: Vec3): Vec3 {
  return [value[0], value[1], value[2]];
}
