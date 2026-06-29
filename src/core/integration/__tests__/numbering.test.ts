import { describe, it, expect, vi } from 'vitest';
import { nextDocumentNumber } from '../numbering';

describe('nextDocumentNumber', () => {
  it('bumps an existing counter atomically (no seed)', async () => {
    const client = { $queryRawUnsafe: vi.fn().mockResolvedValue([{ value: 42 }]) };
    const seed = vi.fn();
    const n = await nextDocumentNumber(client, 1, 'INV', { prefix: 'INV-', pad: 5, seed });
    expect(n).toBe('INV-00042');
    expect(seed).not.toHaveBeenCalled();
    expect(client.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it('seeds from existing data on first use', async () => {
    const client = {
      $queryRawUnsafe: vi
        .fn()
        .mockResolvedValueOnce([]) // UPDATE finds no counter yet
        .mockResolvedValueOnce([{ value: 8 }]), // INSERT ... RETURNING
    };
    const seed = vi.fn().mockResolvedValue(7);
    const n = await nextDocumentNumber(client, 1, 'INV', { prefix: 'INV-', pad: 4, seed });
    expect(seed).toHaveBeenCalled();
    expect(n).toBe('INV-0008');
    // seed + 1 (= 8) is passed as the INSERT value
    expect(client.$queryRawUnsafe).toHaveBeenLastCalledWith(expect.stringContaining('INSERT'), 1, 'INV', 8);
  });

  it('handles bigint counter values from postgres', async () => {
    const client = { $queryRawUnsafe: vi.fn().mockResolvedValue([{ value: BigInt(5) }]) };
    const n = await nextDocumentNumber(client, 1, 'JE', { prefix: 'JE-', pad: 5 });
    expect(n).toBe('JE-00005');
  });
});
