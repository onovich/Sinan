import type { EditorCommand, EditorCommandContext } from './Command';

export class CommandHistory {
  private readonly undoStack: EditorCommand[] = [];
  private readonly redoStack: EditorCommand[] = [];

  execute(command: EditorCommand, context: EditorCommandContext): void {
    command.do(context);
    this.undoStack.push(command);
    this.redoStack.length = 0;
  }

  undo(context: EditorCommandContext): void {
    const command = this.undoStack.pop();

    if (!command) {
      return;
    }

    command.undo(context);
    this.redoStack.push(command);
  }

  redo(context: EditorCommandContext): void {
    const command = this.redoStack.pop();

    if (!command) {
      return;
    }

    command.do(context);
    this.undoStack.push(command);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
