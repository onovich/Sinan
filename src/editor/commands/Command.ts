import type { EventData } from '../../schemas/event.schema';
import type { CameraShotData } from '../../schemas/cameraShot.schema';
import type { TransformData } from '../../schemas/transform.schema';

export interface EditorCommandContext {
  updateEntityTransform(entityId: string, transform: TransformData): void;
  updateEvent(eventId: string, event: EventData): void;
  upsertCameraShot(shot: CameraShotData): void;
  removeCameraShot(shotId: string): void;
}

export interface EditorCommand {
  id: string;
  label: string;
  do(context: EditorCommandContext): void;
  undo(context: EditorCommandContext): void;
}
