import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  enabled: !!process.env.SENTRY_DSN,

  integrations: [nodeProfilingIntegration()],

  // 10% de trazas en producción; 100% en desarrollo
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 1.0,

  // Filtrar errores esperados (401, 403, 404)
  beforeSend(event) {
    const status = (event.extra?.['statusCode'] as number) ?? 0;
    if ([400, 401, 403, 404].includes(status)) return null;
    return event;
  },
});
