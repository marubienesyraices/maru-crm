import { SetMetadata } from '@nestjs/common';

export type PlanFeatureKey =
  | 'tiene_correo'
  | 'tiene_campanas'
  | 'tiene_portal'
  | 'tiene_sitio_propio'
  | 'tiene_integraciones'
  | 'tiene_meta';

export const PLAN_FEATURE_KEY = 'plan_feature';
export const PlanFeature = (key: PlanFeatureKey) => SetMetadata(PLAN_FEATURE_KEY, key);
