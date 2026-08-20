export const merchantStatuses = [
  'PENDING_SETUP',
  'ACTIVE',
  'SUSPENDED',
  'FROZEN',
  'TERMINATED',
] as const;

export type MerchantStatus = (typeof merchantStatuses)[number];
export const initialMerchantStatus: MerchantStatus = 'PENDING_SETUP';
export type MerchantLifecycleAction =
  'ACTIVATE' | 'SUSPEND' | 'FREEZE' | 'RESTORE' | 'TERMINATE';

const transitions: Readonly<
  Record<MerchantLifecycleAction, ReadonlyMap<MerchantStatus, MerchantStatus>>
> = {
  ACTIVATE: new Map([['PENDING_SETUP', 'ACTIVE']]),
  SUSPEND: new Map([['ACTIVE', 'SUSPENDED']]),
  FREEZE: new Map([
    ['ACTIVE', 'FROZEN'],
    ['SUSPENDED', 'FROZEN'],
  ]),
  RESTORE: new Map([
    ['SUSPENDED', 'ACTIVE'],
    ['FROZEN', 'ACTIVE'],
  ]),
  TERMINATE: new Map([
    ['PENDING_SETUP', 'TERMINATED'],
    ['SUSPENDED', 'TERMINATED'],
    ['FROZEN', 'TERMINATED'],
  ]),
};

export class MerchantLifecycleError extends Error {
  readonly code = 'MERCHANT_INVALID_STATE';

  constructor(
    readonly currentStatus: MerchantStatus,
    readonly action: MerchantLifecycleAction,
  ) {
    super(`Merchant action ${action} is invalid from ${currentStatus}.`);
    this.name = 'MerchantLifecycleError';
  }
}

export class MerchantLifecyclePolicy {
  transition(
    currentStatus: MerchantStatus,
    action: MerchantLifecycleAction,
  ): MerchantStatus {
    const next = transitions[action].get(currentStatus);
    if (!next) throw new MerchantLifecycleError(currentStatus, action);
    return next;
  }

  can(currentStatus: MerchantStatus, action: MerchantLifecycleAction): boolean {
    return transitions[action].has(currentStatus);
  }
}
