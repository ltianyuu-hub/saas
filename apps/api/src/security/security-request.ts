import type {
  ActorContext,
  RequestContext,
  TenantContext,
} from '@saas/identity-access';

export interface SecurityRequest {
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
  security?: {
    actor: ActorContext;
    requestContext: RequestContext;
    tenant: TenantContext | null;
  };
}
