import { describe, expect, it } from 'vitest';

import {
  MerchantLifecyclePolicy,
  initialMerchantStatus,
  merchantStatuses,
  type MerchantLifecycleAction,
  type MerchantStatus,
} from './merchant-lifecycle';

const policy = new MerchantLifecyclePolicy();

describe('MerchantLifecyclePolicy', () => {
  it('starts a new Merchant in PENDING_SETUP', () => {
    expect(initialMerchantStatus).toBe('PENDING_SETUP');
  });

  it.each<[MerchantStatus, MerchantLifecycleAction, MerchantStatus]>([
    ['PENDING_SETUP', 'ACTIVATE', 'ACTIVE'],
    ['ACTIVE', 'SUSPEND', 'SUSPENDED'],
    ['ACTIVE', 'FREEZE', 'FROZEN'],
    ['SUSPENDED', 'FREEZE', 'FROZEN'],
    ['SUSPENDED', 'RESTORE', 'ACTIVE'],
    ['FROZEN', 'RESTORE', 'ACTIVE'],
    ['PENDING_SETUP', 'TERMINATE', 'TERMINATED'],
    ['SUSPENDED', 'TERMINATE', 'TERMINATED'],
    ['FROZEN', 'TERMINATE', 'TERMINATED'],
  ])('allows %s through %s to %s', (from, action, to) => {
    expect(policy.transition(from, action)).toBe(to);
  });

  it('denies ACTIVE direct termination', () => {
    expect(() => policy.transition('ACTIVE', 'TERMINATE')).toThrowError(
      expect.objectContaining({ code: 'MERCHANT_INVALID_STATE' }),
    );
  });

  it.each<MerchantLifecycleAction>([
    'ACTIVATE',
    'SUSPEND',
    'FREEZE',
    'RESTORE',
    'TERMINATE',
  ])('keeps TERMINATED terminal for %s', (action) => {
    expect(() => policy.transition('TERMINATED', action)).toThrowError(
      expect.objectContaining({ code: 'MERCHANT_INVALID_STATE' }),
    );
  });

  it('uses only the approved canonical states', () => {
    expect(merchantStatuses).toEqual([
      'PENDING_SETUP',
      'ACTIVE',
      'SUSPENDED',
      'FROZEN',
      'TERMINATED',
    ]);
  });
});
