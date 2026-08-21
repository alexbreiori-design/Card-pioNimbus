import { LANDING_LOAD_FRAMES } from '@/lib/landing/loadFrames';

/**
 * Splash SSR: no celular só o 1º mascote (os outros ficam lazy + display:none,
 * então o browser não baixa os frames extras). No desktop, o ciclo completo.
 */
export default function LandingSsrSplash() {
  return (
    <div id="landing-ssr-splash" className="landing-splash is-visible" aria-hidden="true">
      <div className="landing-splash__stage">
        {LANDING_LOAD_FRAMES.map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- splash SSR
          <img
            key={src}
            className={`landing-splash__mascot${index > 0 ? ' landing-splash__mascot--desk' : ''}`}
            src={src}
            alt=""
            width={360}
            height={360}
            decoding="async"
            fetchPriority={index === 0 ? 'high' : 'low'}
            loading={index === 0 ? 'eager' : 'lazy'}
            style={{ animationDelay: `${index * 0.22}s` }}
          />
        ))}
      </div>
    </div>
  );
}
