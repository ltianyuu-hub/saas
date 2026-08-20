export const securityErrorCodes = {
  unauthenticated: 'UNAUTHENTICATED',
  invalidSession: 'INVALID_SESSION',
  sessionExpired: 'SESSION_EXPIRED',
  sessionRevoked: 'SESSION_REVOKED',
  permissionVersionMismatch: 'PERMISSION_VERSION_MISMATCH',
  forbidden: 'FORBIDDEN',
  invalidTenantContext: 'INVALID_TENANT_CONTEXT',
  crossTenantAccessDenied: 'CROSS_TENANT_ACCESS_DENIED',
  resourceNotFound: 'NOT_FOUND',
} as const;

export type SecurityErrorCode =
  (typeof securityErrorCodes)[keyof typeof securityErrorCodes];

export class SecurityError extends Error {
  constructor(
    readonly code: SecurityErrorCode,
    message: string,
    readonly httpStatus: 401 | 403 | 404,
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}
