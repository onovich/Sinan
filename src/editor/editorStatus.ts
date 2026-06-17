export type EditorSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export interface StatusPill {
  text: string;
  className: string;
  tone: 'clean' | 'dirty' | 'failed' | 'invalid' | 'preview' | 'saved' | 'saving';
}

export function getSaveStatusPill({
  saveStatus,
  isDirty,
  issueCount = 0,
  cleanText = 'Clean',
  unsavedText = 'Unsaved',
}: {
  saveStatus: EditorSaveStatus;
  isDirty: boolean;
  issueCount?: number;
  cleanText?: string;
  unsavedText?: string;
}): StatusPill {
  if (issueCount > 0) {
    return createStatusPill(formatCount(issueCount, 'issue'), 'invalid');
  }

  if (saveStatus === 'saving') {
    return createStatusPill('Saving', 'saving');
  }

  if (saveStatus === 'failed') {
    return createStatusPill('Save failed', 'failed');
  }

  if (isDirty) {
    return createStatusPill(unsavedText, 'dirty');
  }

  if (saveStatus === 'saved') {
    return createStatusPill('Saved', 'saved');
  }

  return createStatusPill(cleanText, 'clean');
}

export function getPreviewStatusPill(text: string): StatusPill {
  return createStatusPill(text, 'preview');
}

export function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}

function createStatusPill(text: string, tone: StatusPill['tone']): StatusPill {
  return {
    text,
    tone,
    className: `status-pill is-${tone}`,
  };
}
