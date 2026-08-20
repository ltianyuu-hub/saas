# Identity and access module

Framework-neutral Identity, opaque Session, Actor/Tenant Context, RBAC and Staff
Store Scope infrastructure. HTTP/NestJS adapters live in `apps/api`.

Raw session tokens are returned only by `SessionService.issue()`. Persistence
adapters receive and store only SHA-256 token hashes.
