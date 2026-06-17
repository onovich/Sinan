import type { ActionData } from '../schemas/action.schema';
import type { ConditionData } from '../schemas/condition.schema';
import type { EventData } from '../schemas/event.schema';
import type { TimelineData, TimelineTrackData } from '../schemas/timeline.schema';
import type { ReferenceValidationIssue } from './ReferenceResolver';

export interface RegistryCoverageValidationInput {
  events?: readonly EventData[];
  timelines?: readonly TimelineData[];
  registeredActionTypes?: ReadonlySet<string>;
  registeredConditionTypes?: ReadonlySet<string>;
  registeredActionFunctionNames?: ReadonlySet<string>;
  registeredCustomConditionNames?: ReadonlySet<string>;
}

export function validateRegistryCoverage(
  input: RegistryCoverageValidationInput,
): ReferenceValidationIssue[] {
  const issues: ReferenceValidationIssue[] = [];

  for (const event of input.events ?? []) {
    for (const [index, action] of event.actions.entries()) {
      addActionCoverageIssues(
        action,
        `data/events/${event.id}.json.actions.${index}`,
        input,
        issues,
      );
    }

    if (event.condition) {
      addConditionCoverageIssues(
        event.condition,
        `data/events/${event.id}.json.condition`,
        input,
        issues,
      );
    }
  }

  for (const timeline of input.timelines ?? []) {
    for (const track of timeline.tracks) {
      addTimelineTrackCoverageIssues(
        track,
        `data/timelines/${timeline.id}.json.tracks.${track.id}`,
        input,
        issues,
      );
    }
  }

  return issues;
}

function addTimelineTrackCoverageIssues(
  track: TimelineTrackData,
  path: string,
  input: RegistryCoverageValidationInput,
  issues: ReferenceValidationIssue[],
): void {
  if (track.type !== 'action') {
    return;
  }

  addActionCoverageIssues(track.action, `${path}.action`, input, issues);
}

function addActionCoverageIssues(
  action: ActionData,
  path: string,
  input: RegistryCoverageValidationInput,
  issues: ReferenceValidationIssue[],
): void {
  if (input.registeredActionTypes && !input.registeredActionTypes.has(action.type)) {
    issues.push({
      severity: 'error',
      path: `${path}.type`,
      message: `Unregistered action type "${action.type}".`,
    });
  }

  if (
    action.type === 'function.call' &&
    input.registeredActionFunctionNames &&
    !input.registeredActionFunctionNames.has(action.name)
  ) {
    issues.push({
      severity: 'error',
      path: `${path}.name`,
      message: `Unregistered action function "${action.name}".`,
    });
  }
}

function addConditionCoverageIssues(
  condition: ConditionData,
  path: string,
  input: RegistryCoverageValidationInput,
  issues: ReferenceValidationIssue[],
): void {
  if ('all' in condition) {
    condition.all.forEach((child, index) =>
      addConditionCoverageIssues(child, `${path}.all.${index}`, input, issues),
    );
    return;
  }

  if ('any' in condition) {
    condition.any.forEach((child, index) =>
      addConditionCoverageIssues(child, `${path}.any.${index}`, input, issues),
    );
    return;
  }

  if ('not' in condition) {
    addConditionCoverageIssues(condition.not, `${path}.not`, input, issues);
    return;
  }

  if (input.registeredConditionTypes && !input.registeredConditionTypes.has(condition.type)) {
    issues.push({
      severity: 'error',
      path: `${path}.type`,
      message: `Unregistered condition type "${condition.type}".`,
    });
  }

  if (
    condition.type === 'custom.condition' &&
    input.registeredCustomConditionNames &&
    !input.registeredCustomConditionNames.has(condition.name)
  ) {
    issues.push({
      severity: 'error',
      path: `${path}.name`,
      message: `Unregistered custom condition "${condition.name}".`,
    });
  }
}
