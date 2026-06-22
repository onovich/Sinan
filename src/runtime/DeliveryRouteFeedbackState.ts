import type {
  RuntimeDeliveryRouteFeedbackIssue,
  RuntimeDeliveryRouteFeedbackMarker,
  RuntimeDeliveryRouteFeedbackState,
  Vec3,
} from './RuntimeTypes';

export function createEmptyDeliveryRouteFeedbackState(): RuntimeDeliveryRouteFeedbackState {
  return {
    issueCount: 0,
    issues: [],
    markerCount: 0,
    markers: [],
    sequence: 0,
    status: 'inactive',
  };
}

export function cloneDeliveryRouteFeedbackState(
  state: RuntimeDeliveryRouteFeedbackState,
): RuntimeDeliveryRouteFeedbackState {
  return {
    ...(state.activeJobId ? { activeJobId: state.activeJobId } : {}),
    issueCount: state.issueCount,
    issues: state.issues.map(cloneIssue),
    ...(state.jobId ? { jobId: state.jobId } : {}),
    markerCount: state.markerCount,
    markers: state.markers.map(cloneMarker),
    sequence: state.sequence,
    status: state.status,
  };
}

function cloneIssue(issue: RuntimeDeliveryRouteFeedbackIssue): RuntimeDeliveryRouteFeedbackIssue {
  return { ...issue };
}

function cloneMarker(
  marker: RuntimeDeliveryRouteFeedbackMarker,
): RuntimeDeliveryRouteFeedbackMarker {
  return {
    active: marker.active,
    completed: marker.completed,
    ...(marker.endpointId ? { endpointId: marker.endpointId } : {}),
    ...(marker.entityId ? { entityId: marker.entityId } : {}),
    fallbackUsed: marker.fallbackUsed,
    id: marker.id,
    jobId: marker.jobId,
    kind: marker.kind,
    ...(marker.label ? { label: marker.label } : {}),
    ...(marker.normal ? { normal: cloneVec3(marker.normal) } : {}),
    ...(marker.position ? { position: cloneVec3(marker.position) } : {}),
    ...(marker.regionId ? { regionId: marker.regionId } : {}),
    status: marker.status,
    target: marker.target,
    visible: marker.visible,
  };
}

function cloneVec3(value: Vec3): Vec3 {
  return [value[0], value[1], value[2]];
}
