'use client';

import {
  getEnvironmentBannerCopy,
  getRuntimeEnvironment,
  shouldShowEnvironmentBanner,
} from '@/lib/runtimeEnvironment';

export default function EnvironmentBanner({ className = '' }) {
  if (!shouldShowEnvironmentBanner()) return null;

  const env = getRuntimeEnvironment();
  const copy = getEnvironmentBannerCopy(env);

  return (
    <div
      className={`nimbus-env-banner nimbus-env-banner--${env} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <strong>{copy.title}</strong>
      <span>{copy.detail}</span>
    </div>
  );
}
