import type { ProjectData } from '../data/DataRepository';
import type { DeliveryJobStatusData } from '../schemas/delivery.schema';
import type { ActiveTool, EditorMode } from './store/editorStore';

export type EditorPanelId = 'hierarchy' | 'viewport' | 'inspector' | 'timeline';

export interface EditorPanelDefinition {
  id: EditorPanelId;
  title: string;
}

export interface EditorShellModeState {
  isShowcase: boolean;
  mode: EditorMode;
  selectionEnabled: boolean;
  showEditorPanels: boolean;
  showEditorToolbarControls: boolean;
  showTimeline: boolean;
  showTriggerDebug: boolean;
  viewportActiveTool: ActiveTool;
  viewportAutoFocus: boolean;
}

export interface EditorShellModeStateInput {
  activeTool: ActiveTool;
  mode: EditorMode;
  triggerDebugVisible: boolean;
}

export interface ShowcaseModeHud {
  activeJobId?: string;
  activeJobStatus: DeliveryJobStatusData | 'unavailable';
  endpointCount: number;
  jobCount: number;
  prompt: string;
  title: string;
}

export const editorModeOptions = ['edit', 'play', 'preview', 'showcase'] as const;

export const editorPanelLayout: readonly EditorPanelDefinition[] = [
  { id: 'hierarchy', title: 'Hierarchy' },
  { id: 'viewport', title: 'Viewport' },
  { id: 'inspector', title: 'Inspector' },
  { id: 'timeline', title: 'Timeline' },
] as const;

export function createEditorShellModeState({
  activeTool,
  mode,
  triggerDebugVisible,
}: EditorShellModeStateInput): EditorShellModeState {
  const isShowcase = mode === 'showcase';

  return {
    isShowcase,
    mode,
    selectionEnabled: mode === 'edit' && activeTool === 'select',
    showEditorPanels: !isShowcase,
    showEditorToolbarControls: !isShowcase,
    showTimeline: !isShowcase,
    showTriggerDebug: mode === 'edit' && triggerDebugVisible,
    viewportActiveTool: isShowcase ? 'select' : activeTool,
    viewportAutoFocus: isShowcase,
  };
}

export function createShowcaseModeHud(project: ProjectData | null): ShowcaseModeHud {
  const deliveryJobs = project?.level.deliveryJobs ?? [];
  const activeJob =
    deliveryJobs.find((job) =>
      ['accepted', 'inProgress', 'readyToDeliver'].includes(job.defaultStatus),
    ) ??
    deliveryJobs.find((job) => job.defaultStatus === 'available') ??
    deliveryJobs[0];
  const activeJobStatus = activeJob?.defaultStatus ?? 'unavailable';

  return {
    ...(activeJob ? { activeJobId: activeJob.id } : {}),
    activeJobStatus,
    endpointCount: countDeliveryEndpoints(project),
    jobCount: deliveryJobs.length,
    prompt: activeJob
      ? getDeliveryJobPrompt(activeJob, activeJobStatus)
      : 'No delivery jobs loaded',
    title: activeJob?.title ?? 'Delivery Showcase',
  };
}

function getDeliveryJobPrompt(
  job: NonNullable<ProjectData['level']['deliveryJobs']>[number],
  status: DeliveryJobStatusData | 'unavailable',
): string {
  if (status === 'unavailable') {
    return job.description;
  }

  if (
    status === 'accepted' ||
    status === 'inProgress' ||
    status === 'readyToDeliver' ||
    status === 'completed' ||
    status === 'blocked' ||
    status === 'failed'
  ) {
    return job.feedback[status] ?? job.description;
  }

  return job.description;
}

function countDeliveryEndpoints(project: ProjectData | null): number {
  if (!project) {
    return 0;
  }

  const endpointIds = new Set<string>();

  for (const entity of project.level.entities) {
    const endpoint = entity.components.DeliveryEndpoint;

    if (isRecord(endpoint) && typeof endpoint.endpointId === 'string') {
      endpointIds.add(endpoint.endpointId);
    }
  }

  return endpointIds.size;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
