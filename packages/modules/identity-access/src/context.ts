export type ActorType = 'CONSUMER' | 'STAFF' | 'PLATFORM';

interface BaseActorContext {
  actorId: string;
  actorType: ActorType;
  sessionId: string;
}

export interface ConsumerActorContext extends BaseActorContext {
  actorType: 'CONSUMER';
}

export interface StaffActorContext extends BaseActorContext {
  actorType: 'STAFF';
  merchantId: string;
  roleCode: string;
  permissions: ReadonlySet<string>;
  primaryStoreId: string | null;
  storeIds: readonly string[];
}

export interface PlatformActorContext extends BaseActorContext {
  actorType: 'PLATFORM';
  roleCode: string;
  permissions: ReadonlySet<string>;
}

export type ActorContext =
  ConsumerActorContext | StaffActorContext | PlatformActorContext;

export interface TenantContext {
  merchantId: string;
  source: 'STAFF_SESSION' | 'PLATFORM_TARGET';
}

export interface RequestContext {
  requestId: string;
  correlationId: string;
  actor: ActorContext;
  tenant: TenantContext | null;
}
