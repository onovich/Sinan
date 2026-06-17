import type { EditorCommand, EditorCommandContext } from './Command';

export class CommandHistory {
  private readonly undoStack: EditorCommand[] = [];
  private readonly redoStack: EditorCommand[] = [];

  execute(command: EditorCommand, context: EditorCommandContext): void {
    command.do(context);
    this.undoStack.push(command);
    this.redoStack.length = 0;
  }

  undo(context: EditorCommandContext): EditorCommand | undefined {
    const command = this.undoStack.pop();

    if (!command) {
      return undefined;
    }

    command.undo(context);
    this.redoStack.push(command);

    return command;
  }

  redo(context: EditorCommandContext): EditorCommand | undefined {
    const command = this.redoStack.pop();

    if (!command) {
      return undefined;
    }

    command.do(context);
    this.undoStack.push(command);

    return command;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
