import type { Panel } from '../../../domain/panels';

/** Every panel module renders from its panel's config. */
export interface ModuleProps {
  panel: Panel;
}
