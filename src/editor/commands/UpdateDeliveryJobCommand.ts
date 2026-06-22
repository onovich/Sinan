import type { DeliveryJobData } from '../../schemas/delivery.schema';
import type { LevelData } from '../../schemas/level.schema';
import type { EditorCommand, EditorCommandContext } from './Command';

export class UpdateDeliveryJobCommand implements EditorCommand {
  readonly id: string;
  readonly label: string;

  constructor(
    private readonly jobId: string,
    private readonly beforeLevel: LevelData,
    private readonly afterJob: DeliveryJobData,
  ) {
    this.id = `level:delivery-job:${jobId}:${crypto.randomUUID()}`;
    this.label = `Update delivery job ${jobId}`;
  }

  do(context: EditorCommandContext): void {
    context.updateLevel(replaceDeliveryJob(this.beforeLevel, this.afterJob));
  }

  undo(context: EditorCommandContext): void {
    context.updateLevel(this.beforeLevel);
  }
}

function replaceDeliveryJob(level: LevelData, job: DeliveryJobData): LevelData {
  return {
    ...level,
    deliveryJobs: (level.deliveryJobs ?? []).map((candidate) =>
      candidate.id === job.id ? job : candidate,
    ),
  };
}
