import { describe, it, expect } from 'vitest';
import { canTransitionJournal, nextJournalStates, JOURNAL_TRANSITIONS } from '../journal-state';

describe('journal state – transition map', () => {
  it('draft can only go to posted', () => {
    expect(JOURNAL_TRANSITIONS.draft).toEqual(['posted']);
  });

  it('posted can only go to void', () => {
    expect(JOURNAL_TRANSITIONS.posted).toEqual(['void']);
  });

  it('void is terminal', () => {
    expect(JOURNAL_TRANSITIONS.void).toEqual([]);
  });
});

describe('journal state – nextJournalStates', () => {
  it('returns the allowed targets for a known status', () => {
    expect(nextJournalStates('draft')).toEqual(['posted']);
  });

  it('returns an empty array for an unknown status', () => {
    expect(nextJournalStates('archived')).toEqual([]);
  });
});

describe('journal state – canTransitionJournal', () => {
  it('allows draft → posted', () => {
    expect(canTransitionJournal('draft', 'posted')).toBe(true);
  });

  it('allows posted → void', () => {
    expect(canTransitionJournal('posted', 'void')).toBe(true);
  });

  it('rejects posted → posted (the bug the API guards against)', () => {
    expect(canTransitionJournal('posted', 'posted')).toBe(false);
  });

  it('rejects draft → void (cannot skip posting)', () => {
    expect(canTransitionJournal('draft', 'void')).toBe(false);
  });

  it('rejects any transition out of void', () => {
    expect(canTransitionJournal('void', 'posted')).toBe(false);
    expect(canTransitionJournal('void', 'draft')).toBe(false);
  });

  it('rejects transitions from an unknown status', () => {
    expect(canTransitionJournal('archived', 'posted')).toBe(false);
  });

  it('rejects a transition to an unknown status', () => {
    expect(canTransitionJournal('draft', 'frozen')).toBe(false);
  });
});
