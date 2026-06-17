import type { EventData } from '../../schemas/event.schema';
import type { CameraShotData } from '../../schemas/cameraShot.schema';
import type { ComponentMapData } from '../../schemas/entity.schema';
import type { TimelineData } from '../../schemas/timeline.schema';
import type { TransformData } from '../../schemas/transform.schema';

export interface EditorCommandContext {
  updateEntityTransform(entityId: string, transform: TransformData): void;
  updateEntityComponents(entityId: string, components: ComponentMapData): void;
  updateEvent(eventId: string, event: EventData): void;
  updateTimeline(timelineId: string, timeline: TimelineData): void;
  upsertCameraShot(shot: CameraShotData): void;
  removeCameraShot(shotId: string): void;
}

export interface EditorCommand {
  id: string;
  label: string;
  do(context: EditorCommandContext): void;
  undo(context: EditorCommandContext): void;
}
