import type { CameraShotData } from '../../schemas/cameraShot.schema';
import type { EditorCommand, EditorCommandContext } from './Command';

export class UpdateCameraShotCommand implements EditorCommand {
  readonly id: string;
  readonly label: string;

  constructor(
    private readonly before: CameraShotData,
    private readonly after: CameraShotData,
  ) {
    this.id = `camera-shot:${after.id}:${crypto.randomUUID()}`;
    this.label = `Update ${after.id}`;
  }

  do(context: EditorCommandContext): void {
    context.upsertCameraShot(this.after);
  }

  undo(context: EditorCommandContext): void {
    context.upsertCameraShot(this.before);
  }
}

export class AddCameraShotCommand implements EditorCommand {
  readonly id: string;
  readonly label: string;

  constructor(private readonly shot: CameraShotData) {
    this.id = `camera-shot:add:${shot.id}:${crypto.randomUUID()}`;
    this.label = `Add ${shot.id}`;
  }

  do(context: EditorCommandContext): void {
    context.upsertCameraShot(this.shot);
  }

  undo(context: EditorCommandContext): void {
    context.removeCameraShot(this.shot.id);
  }
}
