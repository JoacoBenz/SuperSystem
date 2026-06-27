export type JournalStatus = 'draft' | 'posted' | 'void';

/**
 * Allowed journal-entry status transitions.
 * A draft can be posted; a posted entry can only be voided; void is terminal.
 */
export const JOURNAL_TRANSITIONS: Record<JournalStatus, JournalStatus[]> = {
  draft: ['posted'],
  posted: ['void'],
  void: [],
};

/** Statuses a journal entry can move to from its current status. */
export function nextJournalStates(from: string): JournalStatus[] {
  return JOURNAL_TRANSITIONS[from as JournalStatus] ?? [];
}

/** Whether moving a journal entry from `from` to `to` is permitted. */
export function canTransitionJournal(from: string, to: string): boolean {
  return nextJournalStates(from).includes(to as JournalStatus);
}
