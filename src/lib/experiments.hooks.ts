import { useEffect, useState } from "react";
import {
  EXPERIMENTS,
  trackExposure,
  variantOf,
  type ExperimentKey,
  type Variant,
} from "@/lib/experiments";

/**
 * Returns this visitor's sticky variant.
 *
 * The control renders on the server and on the first client paint (so hydration
 * always matches); the assigned variant applies right after hydration and the
 * exposure is recorded once per session.
 */
export function useExperiment<K extends ExperimentKey>(key: K): Variant<K> {
  const [variant, setVariant] = useState<Variant<K>>(EXPERIMENTS[key][0] as Variant<K>);

  useEffect(() => {
    const assigned = variantOf(key);
    setVariant(assigned);
    trackExposure(key, assigned);
  }, [key]);

  return variant;
}
