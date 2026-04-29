import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to skip automatic audit logging on a route.
 * Use on endpoints that already log manually (e.g. auth login/logout)
 * or that are read-only and don't need audit trails.
 *
 * @example
 * @SkipAudit()
 * @Get('public-data')
 * getPublicData() { ... }
 */
export const SKIP_AUDIT_KEY = 'skipAudit';
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
