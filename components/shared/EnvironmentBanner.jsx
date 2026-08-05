'use client';

import { useState, useSyncExternalStore } from 'react';
import {
  getEnvironmentBannerCopy,
  getRuntimeEnvironment,
  shouldShowEnvironmentBanner,
} from '@/lib/runtimeEnvironment';

const LOCAL_BANNER_HIDE_KEY = 'nimbus:hide-local-env-banner';

function subscribeEmbed() {
  return () => {};
}

function getEmbedSnapshot() {
  try {
    return new URLSearchParams(window.location.search).get('embed') === '1';
  } catch {
    return false;
  }
}

function getEmbedServerSnapshot() {
  return false;
}

export default function EnvironmentBanner({ className = '' }) {
  const show = shouldShowEnvironmentBanner();
  const env = show ? getRuntimeEnvironment() : 'production';
  const copy = show ? getEnvironmentBannerCopy(env) : { title: '', detail: '' };
  const isAdminLocal =
    show && env === 'local' && String(className || '').includes('nimbus-env-banner-admin');
  const embedHidden = useSyncExternalStore(subscribeEmbed, getEmbedSnapshot, getEmbedServerSnapshot);

  const [hidden, setHidden] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(LOCAL_BANNER_HIDE_KEY) === '1';
    } catch {
      return false;
    }
  });

  function setBannerHidden(next) {
    setHidden(next);
    try {
      if (next) sessionStorage.setItem(LOCAL_BANNER_HIDE_KEY, '1');
      else sessionStorage.removeItem(LOCAL_BANNER_HIDE_KEY);
    } catch {
      // ignore
    }
  }

  if (embedHidden || !show) return null;

  if (isAdminLocal && hidden) {
    return (
      <button
        type="button"
        className="nimbus-env-banner-peek nimbus-env-banner-peek--local"
        onClick={() => setBannerHidden(false)}
        aria-label="Mostrar faixa Desenvolvimento local"
        title="Mostrar faixa"
      >
        <i className="ph ph-caret-down" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      className={`nimbus-env-banner nimbus-env-banner--${env} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <strong>{copy.title}</strong>
      {copy.detail ? <span>{copy.detail}</span> : null}
      {isAdminLocal ? (
        <button
          type="button"
          className="nimbus-env-banner-hide"
          onClick={() => setBannerHidden(true)}
          aria-label="Ocultar faixa Desenvolvimento local"
          title="Ocultar faixa"
        >
          <i className="ph ph-caret-up" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
