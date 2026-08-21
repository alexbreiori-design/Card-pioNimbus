import { LANDING_LOAD_FRAMES } from '@/lib/landing/loadFrames';

/** Splash SSR com os 5 mascotes (animação CSS desde o 1º paint). */
export default function LandingSsrSplash() {
  return (
    <div id="landing-ssr-splash" className="landing-splash is-visible" aria-hidden="true">
      <div className="landing-splash__stage">
        {LANDING_LOAD_FRAMES.map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- splash SSR
          <img
            key={src}
            className="landing-splash__mascot"
            src={src}
            alt=""
            width={360}
            height={360}
            decoding="async"
            fetchPriority={index === 0 ? 'high' : 'low'}
            style={{ animationDelay: `${index * 0.22}s` }}
          />
        ))}
      </div>
    </div>
  );
}
