import { LANDING_LOAD_FRAMES } from '@/lib/landing/loadFrames';

/** Splash SSR: só o 1º frame no HTML crítico (os demais entram no client após idle). */
export default function LandingSsrSplash() {
  const first = LANDING_LOAD_FRAMES[0];

  return (
    <div id="landing-ssr-splash" className="landing-splash is-visible" aria-hidden="true">
      <div className="landing-splash__stage" data-landing-splash-stage="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- splash SSR */}
        <img
          className="landing-splash__mascot"
          src={first}
          alt=""
          width={360}
          height={360}
          decoding="async"
          fetchPriority="high"
          style={{ animationDelay: '0s' }}
        />
      </div>
    </div>
  );
}
