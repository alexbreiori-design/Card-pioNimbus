'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { NIMBUS_DEMO_SLUG } from '@/lib/landing/constants';
import { buildLandingDemoEmbedUrl } from '@/lib/landing/demoMode';
import {
  HERO_DEMO_IMAGES,
  HERO_IDLE_HOTSPOTS,
  HERO_IDLE_NATIVE,
  HERO_IFRAME_DESIGN,
  HERO_MOBILE_HOTSPOT,
  HERO_MOBILE_SCREEN_RECT,
  HERO_PHONE_DEMO_OFFSET_Y,
  HERO_SCREEN_RECTS,
  HERO_TRANSITION_MS,
} from '@/lib/landing/heroDemo';

const Lottie = dynamic(() => import('lottie-react').then((m) => m.Lottie), {
  ssr: false,
  loading: () => null,
});

function HeroTapLottie() {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      import('@/public/animated/tap.json')
        .then((mod) => {
          if (!cancelled) setAnimationData(mod.default || mod);
        })
        .catch(() => undefined);
    };

    // Fora do caminho crítico: a mão só entra quando a thread está livre.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(load, { timeout: 2500 })
      : window.setTimeout(load, 1200);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  if (!animationData) return null;
  return (
    <div className="landing-hero-demo__tap-lottie" aria-hidden="true">
      <Lottie animationData={animationData} loop autoplay style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function loadImageData(src) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve({
          data: ctx.getImageData(0, 0, canvas.width, canvas.height),
          width: canvas.width,
          height: canvas.height,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function hitTest(map, clientX, clientY, stageEl, offsetYPercent = 0) {
  if (!map || !stageEl) return false;
  const rect = stageEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  // object-fit: contain mapping
  const nativeW = HERO_IDLE_NATIVE.width;
  const nativeH = HERO_IDLE_NATIVE.height;
  const scale = Math.min(rect.width / nativeW, rect.height / nativeH);
  const drawW = nativeW * scale;
  const drawH = nativeH * scale;
  const offsetX = (rect.width - drawW) / 2;
  const offsetY = (rect.height - drawH) / 2;
  const artOffsetY = (offsetYPercent / 100) * rect.height;

  const localX = clientX - rect.left - offsetX;
  const localY = clientY - rect.top - offsetY - artOffsetY;
  if (localX < 0 || localY < 0 || localX > drawW || localY > drawH) return false;

  const px = Math.min(map.width - 1, Math.max(0, Math.floor((localX / drawW) * map.width)));
  const py = Math.min(map.height - 1, Math.max(0, Math.floor((localY / drawH) * map.height)));
  const alpha = map.data.data[(py * map.width + px) * 4 + 3];
  return alpha > 40;
}

function rectHitTest(box, clientX, clientY, stageEl) {
  if (!box || !stageEl) return false;
  const rect = stageEl.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  return (
    x >= box.left &&
    x <= box.left + box.width &&
    y >= box.top &&
    y <= box.top + box.height
  );
}

function ScaledEmbed({
  src,
  designWidth,
  designHeight,
  title,
  fit = 'contain',
  align = 'center',
  onLoad,
}) {
  const shellRef = useRef(null);
  const [layout, setLayout] = useState({
    scale: 1,
    x: 0,
    y: 0,
    width: designWidth,
    height: designHeight,
  });

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return undefined;
    const update = () => {
      const { clientWidth, clientHeight } = el;
      if (!clientWidth || !clientHeight) return;

      /*
        fill-width: ocupa 100% da largura da tela do device e define a altura
        do iframe pela área visível — evita letterbox e também o crop do cover
        que escondia o rodapé do modal de produto.
      */
      if (fit === 'fill-width') {
        const scale = clientWidth / designWidth;
        const height = Math.max(1, Math.round(clientHeight / scale));
        setLayout({ scale, x: 0, y: 0, width: designWidth, height });
        return;
      }

      const scale =
        fit === 'cover'
          ? Math.max(clientWidth / designWidth, clientHeight / designHeight)
          : Math.min(clientWidth / designWidth, clientHeight / designHeight);
      const x = (clientWidth - designWidth * scale) / 2;
      let y = (clientHeight - designHeight * scale) / 2;
      if (align === 'top') y = 0;
      if (align === 'bottom') y = clientHeight - designHeight * scale;
      setLayout({ scale, x, y, width: designWidth, height: designHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth, designHeight, fit, align]);

  return (
    <div ref={shellRef} className="landing-hero-demo__embed-shell">
      <iframe
        className="landing-hero-demo__iframe"
        title={title}
        src={src}
        allow="payment *"
        onLoad={onLoad}
        style={{
          width: layout.width,
          height: layout.height,
          transform: `translate(${layout.x}px, ${layout.y}px) scale(${layout.scale})`,
        }}
      />
    </div>
  );
}

function DeviceGlow({ deviceKey, hitSrc, active, variant = 'idle' }) {
  return (
    <div
      className={`landing-hero-demo__glow landing-hero-demo__glow--${deviceKey}${
        variant === 'demo' ? ' landing-hero-demo__glow--demo' : ''
      }${active ? ' is-active' : ''}`}
      style={{
        WebkitMaskImage: `linear-gradient(#fff, #fff), url(${hitSrc})`,
        maskImage: `linear-gradient(#fff, #fff), url(${hitSrc})`,
      }}
      aria-hidden="true"
    >
      <div className="landing-hero-demo__glow-soft">
        <div
          className="landing-hero-demo__glow-core"
          style={{
            WebkitMaskImage: `url(${hitSrc})`,
            maskImage: `url(${hitSrc})`,
          }}
        />
      </div>
    </div>
  );
}

export default function LandingHeroDemo({
  calloutTitle = 'Comprove a melhor\nexperiência de compra!',
  calloutSub = 'Clique em um dos dispositivos e teste.',
  calloutSubMobile = 'Toque no celular para testar.',
  closeLabel = 'Fechar',
}) {
  const [phase, setPhase] = useState('idle');
  const [device, setDevice] = useState(null);
  const [embedReady, setEmbedReady] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [hoverDevice, setHoverDevice] = useState(null);
  const [isMobileHero, setIsMobileHero] = useState(true);
  const timerRef = useRef(null);
  const stageRef = useRef(null);
  const hitMapsRef = useRef({ phone: null, laptop: null, phoneView2: null, laptopView2: null });

  const embedSrc = buildLandingDemoEmbedUrl(NIMBUS_DEMO_SLUG);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    // No celular o alvo é um retângulo (HERO_MOBILE_HOTSPOT): as hitmaps são
    // 167 KB de PNG + decode em canvas que só o desktop usa.
    if (isMobileHero) return undefined;

    let cancelled = false;
    const loadHitmaps = async () => {
      const [phone, laptop, phoneView2, laptopView2] = await Promise.all([
        loadImageData(HERO_DEMO_IMAGES.idleHitPhone),
        loadImageData(HERO_DEMO_IMAGES.idleHitLaptop),
        loadImageData(HERO_DEMO_IMAGES.idleHitPhoneView2),
        loadImageData(HERO_DEMO_IMAGES.idleHitLaptopView2),
      ]);
      if (cancelled) return;
      hitMapsRef.current = { phone, laptop, phoneView2, laptopView2 };
    };

    const schedule =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (cb) => window.requestIdleCallback(cb, { timeout: 2500 })
        : (cb) => window.setTimeout(cb, 1200);
    const cancelSchedule =
      typeof window !== 'undefined' && 'cancelIdleCallback' in window
        ? (id) => window.cancelIdleCallback(id)
        : (id) => window.clearTimeout(id);

    const idleId = schedule(() => {
      void loadHitmaps();
    });

    return () => {
      cancelled = true;
      cancelSchedule(idleId);
    };
  }, [isMobileHero]);

  const resolveDeviceAtPoint = useCallback((clientX, clientY) => {
    const stage = stageRef.current;
    const maps = hitMapsRef.current;
    // Phone first (fica na frente / sobrepõe o notebook)
    if (maps.phone) {
      if (hitTest(maps.phone, clientX, clientY, stage)) return 'phone';
    } else if (rectHitTest(HERO_IDLE_HOTSPOTS.phone, clientX, clientY, stage)) {
      return 'phone';
    }
    if (maps.laptop) {
      if (hitTest(maps.laptop, clientX, clientY, stage)) return 'laptop';
    } else if (rectHitTest(HERO_IDLE_HOTSPOTS.laptop, clientX, clientY, stage)) {
      return 'laptop';
    }
    return null;
  }, []);

  const resolveAlternateAtPoint = useCallback(
    (clientX, clientY) => {
      if (device !== 'phone' && device !== 'laptop') return null;
      const stage = stageRef.current;
      const maps = hitMapsRef.current;
      const target = device === 'phone' ? 'laptop' : 'phone';
      const map = device === 'phone' ? maps.laptopView2 : maps.phoneView2;
      // Na demo do celular a arte desce 8% — a hitmap view-2 acompanha esse offset
      const offsetY = device === 'phone' ? HERO_PHONE_DEMO_OFFSET_Y : 0;
      if (map && hitTest(map, clientX, clientY, stage, offsetY)) return target;
      return null;
    },
    [device]
  );

  const scrollStageIntoView = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduceMotion = prefersReducedMotion();

    const run = () => {
      if (isMobileHero) {
        const header = document.querySelector('.landing-header');
        const headerBottom = header ? header.getBoundingClientRect().bottom : 64;
        const gap = 10;
        const demo = stage.closest('.landing-hero-demo') || stage;
        const anchorTop = demo.getBoundingClientRect().top + window.scrollY;
        const target = Math.max(0, anchorTop - headerBottom - gap);
        window.scrollTo({
          top: target,
          behavior: reduceMotion ? 'auto' : 'smooth',
        });
        return;
      }

      stage.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    };

    requestAnimationFrame(run);
  }, [isMobileHero]);

  const closeDemo = useCallback(() => {
    clearTimer();
    setPhase('idle');
    setDevice(null);
    setEmbedReady(false);
    setIframeLoaded(false);
    setHoverDevice(null);
  }, [clearTimer]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const update = () => setIsMobileHero(mq.matches);
    update();
    const onChange = () => {
      setIsMobileHero(mq.matches);
      closeDemo();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [closeDemo]);

  useEffect(() => {
    if (!isMobileHero) return undefined;
    if (phase !== 'active' && phase !== 'transitioning') return undefined;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollStageIntoView());
    });
    return () => window.cancelAnimationFrame(id);
  }, [phase, isMobileHero, scrollStageIntoView]);

  const startDevice = useCallback(
    (nextDevice) => {
      if (!nextDevice) return;
      clearTimer();
      setHoverDevice(null);
      setDevice(nextDevice);
      setEmbedReady(false);
      setIframeLoaded(false);
      if (!isMobileHero) {
        scrollStageIntoView();
      }

      if (prefersReducedMotion() || isMobileHero) {
        setPhase('active');
        setEmbedReady(true);
        return;
      }
      setPhase('transitioning');
      timerRef.current = window.setTimeout(() => {
        setPhase('active');
        setEmbedReady(true);
        timerRef.current = null;
      }, HERO_TRANSITION_MS);
    },
    [clearTimer, isMobileHero, scrollStageIntoView]
  );

  const openDevice = useCallback(
    (nextDevice) => {
      if (phase !== 'idle' || !nextDevice) return;
      startDevice(nextDevice);
    },
    [phase, startDevice]
  );

  const switchDevice = useCallback(
    (nextDevice) => {
      if (!nextDevice || nextDevice === device) return;
      if (phase !== 'active') return;
      startDevice(nextDevice);
    },
    [device, phase, startDevice]
  );

  useEffect(() => {
    if (phase === 'idle') return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') closeDemo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, closeDemo]);

  const showPhoneLayers = !isMobileHero && device === 'phone';
  const showLaptopLayers = !isMobileHero && device === 'laptop';
  const showEmbed = phase === 'active' && embedReady && device;
  const screenRect =
    isMobileHero && device === 'phone'
      ? HERO_MOBILE_SCREEN_RECT
      : device
        ? HERO_SCREEN_RECTS[device]
        : null;
  const iframeDesign = device ? HERO_IFRAME_DESIGN[isMobileHero ? 'phone' : device] : null;
  const alternateDevice = device === 'phone' ? 'laptop' : device === 'laptop' ? 'phone' : null;
  const alternateHitSrc =
    device === 'phone'
      ? HERO_DEMO_IMAGES.idleHitLaptopView2
      : device === 'laptop'
        ? HERO_DEMO_IMAGES.idleHitPhoneView2
        : null;
  const showDemoSwitch = !isMobileHero && phase === 'active' && alternateDevice && alternateHitSrc;
  const calloutSubText = isMobileHero ? calloutSubMobile : calloutSub;
  const screenMaskSrc = isMobileHero
    ? HERO_DEMO_IMAGES.mobilePhoneScreenMask
    : device === 'phone'
      ? HERO_DEMO_IMAGES.phoneScreenMask
      : null;

  return (
    <div
      className={`landing-hero-demo landing-hero-demo--${phase}${device ? ` landing-hero-demo--${device}` : ''}${
        iframeLoaded ? ' is-embed-ready' : ''
      }${isMobileHero ? ' landing-hero-demo--mobile' : ''}`}
    >
      <div className="landing-hero-demo__stage-shell">
        {phase === 'idle' && isMobileHero ? (
          <div className="landing-hero-demo__callout landing-hero-demo__callout--mobile" aria-hidden="true">
            <p className="landing-hero-demo__callout-sub">{calloutSubMobile}</p>
            <HeroTapLottie />
          </div>
        ) : null}

        <div
          ref={stageRef}
          className={`landing-hero-demo__stage${hoverDevice ? ` is-hover-${hoverDevice}` : ''}`}
        >
        {!isMobileHero ? (
          <img
            className={`landing-hero-demo__img landing-hero-demo__img--idle${
              phase === 'idle' || phase === 'transitioning' ? ' is-visible' : ''
            }`}
            src={HERO_DEMO_IMAGES.idle}
            alt="Cardápio Nimbus no celular e no notebook"
            width={1600}
            height={1065}
            decoding="async"
            fetchPriority="high"
            loading="eager"
          />
        ) : (
          <img
            className={`landing-hero-demo__img landing-hero-demo__img--mobile-phone${
              isMobileHero ? ' is-visible' : ''
            }`}
            src={HERO_DEMO_IMAGES.mobilePhone}
            alt="Cardápio Nimbus no celular"
            width={720}
            height={1340}
            decoding="async"
            fetchPriority="high"
            loading="eager"
          />
        )}

        {showPhoneLayers ? (
          <>
            <img
              className={`landing-hero-demo__img landing-hero-demo__img--phone${
                phase === 'transitioning' || phase === 'active' ? ' is-visible' : ''
              }`}
              src={HERO_DEMO_IMAGES.phone}
              alt=""
              width={1600}
              height={1065}
              decoding="async"
              loading="lazy"
              aria-hidden="true"
            />
            {phase === 'active' ? (
              <img
                className="landing-hero-demo__img landing-hero-demo__img--phone-blank is-visible"
                src={HERO_DEMO_IMAGES.phoneBlank}
                alt=""
                width={1600}
                height={1065}
                decoding="async"
                loading="lazy"
                aria-hidden="true"
              />
            ) : null}
          </>
        ) : null}

        {showLaptopLayers ? (
          <>
            <img
              className={`landing-hero-demo__img landing-hero-demo__img--laptop${
                phase === 'transitioning' || phase === 'active' ? ' is-visible' : ''
              }`}
              src={HERO_DEMO_IMAGES.laptop}
              alt=""
              width={1537}
              height={1023}
              decoding="async"
              loading="lazy"
              aria-hidden="true"
            />
            {phase === 'active' ? (
              <img
                className="landing-hero-demo__img landing-hero-demo__img--laptop-blank is-visible"
                src={HERO_DEMO_IMAGES.laptopBlank}
                alt=""
                width={1537}
                height={1023}
                decoding="async"
                loading="lazy"
                aria-hidden="true"
              />
            ) : null}
          </>
        ) : null}

        {phase === 'idle' && !isMobileHero ? (
          <>
            <DeviceGlow
              deviceKey="phone"
              hitSrc={HERO_DEMO_IMAGES.idleHitPhone}
              active={hoverDevice === 'phone'}
            />
            <DeviceGlow
              deviceKey="laptop"
              hitSrc={HERO_DEMO_IMAGES.idleHitLaptop}
              active={hoverDevice === 'laptop'}
            />
          </>
        ) : null}

        {showDemoSwitch ? (
          <div
            className={`landing-hero-demo__glow-slot${
              device === 'phone' ? ' landing-hero-demo__glow-slot--phone-offset' : ''
            }`}
          >
            <DeviceGlow
              deviceKey={alternateDevice}
              hitSrc={alternateHitSrc}
              active={hoverDevice === alternateDevice}
              variant="demo"
            />
          </div>
        ) : null}

        {phase === 'idle' ? (
          <div className="landing-hero-demo__callout landing-hero-demo__callout--desktop" aria-hidden="true">
            <div className="landing-hero-demo__callout-text">
              <p className="landing-hero-demo__callout-title">
                {calloutTitle.split('\n').map((line, index) => (
                  <span key={line}>
                    {index > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </p>
              <p className="landing-hero-demo__callout-sub">{calloutSub}</p>
            </div>
            <img
              className="landing-hero-demo__callout-arrow"
              src="/images/landing/hero/arrow-landing.svg"
              alt=""
              width={286}
              height={76}
              decoding="async"
            />
          </div>
        ) : null}

        {phase === 'idle' ? (
          <button
            type="button"
            className="landing-hero-demo__hitlayer"
            aria-label={`${calloutTitle.replace(/\n/g, ' ')} ${calloutSubText}`}
            onMouseMove={
              isMobileHero
                ? undefined
                : (event) => {
                    const next = resolveDeviceAtPoint(event.clientX, event.clientY);
                    setHoverDevice((prev) => (prev === next ? prev : next));
                  }
            }
            onMouseLeave={isMobileHero ? undefined : () => setHoverDevice(null)}
            onClick={(event) => {
              if (isMobileHero) {
                if (rectHitTest(HERO_MOBILE_HOTSPOT, event.clientX, event.clientY, stageRef.current)) {
                  openDevice('phone');
                }
                return;
              }
              const next = resolveDeviceAtPoint(event.clientX, event.clientY);
              if (next) openDevice(next);
            }}
          />
        ) : null}

        {showDemoSwitch ? (
          <button
            type="button"
            className="landing-hero-demo__hitlayer landing-hero-demo__hitlayer--switch"
            aria-label={
              alternateDevice === 'phone'
                ? 'Trocar para demonstração no celular'
                : 'Trocar para demonstração no computador'
            }
            onMouseMove={(event) => {
              const next = resolveAlternateAtPoint(event.clientX, event.clientY);
              setHoverDevice((prev) => (prev === next ? prev : next));
            }}
            onMouseLeave={() => setHoverDevice(null)}
            onClick={(event) => {
              const next = resolveAlternateAtPoint(event.clientX, event.clientY);
              if (next) switchDevice(next);
            }}
          />
        ) : null}

        {showEmbed && screenRect && iframeDesign ? (
          <div
            className={`landing-hero-demo__screen-layer landing-hero-demo__screen-layer--${
              isMobileHero ? 'phone' : device
            }${isMobileHero ? ' landing-hero-demo__screen-layer--mobile' : ''} is-visible`}
            style={
              screenMaskSrc
                ? {
                    WebkitMaskImage: `url(${screenMaskSrc})`,
                    maskImage: `url(${screenMaskSrc})`,
                    WebkitMaskSize: isMobileHero ? '100% 100%' : undefined,
                    maskSize: isMobileHero ? '100% 100%' : undefined,
                  }
                : undefined
            }
          >
            <div
              className={`landing-hero-demo__screen landing-hero-demo__screen--${device}`}
              style={{
                left: `${screenRect.left}%`,
                top: `${screenRect.top}%`,
                width: `${screenRect.width}%`,
                height: `${screenRect.height}%`,
                borderRadius: screenRect.radius ? `${screenRect.radius}px` : undefined,
              }}
            >
              {device === 'phone' || isMobileHero ? (
                <div className="landing-hero-demo__phone-safe-top" aria-hidden="true" />
              ) : null}
              <div className="landing-hero-demo__screen-body">
                <div
                  className={`landing-hero-demo__splash${iframeLoaded ? ' is-done' : ''}`}
                  aria-hidden="true"
                >
                  <img
                    className="landing-hero-demo__splash-icon"
                    src="/images/icon.png"
                    alt=""
                    width={88}
                    height={88}
                    decoding="async"
                  />
                </div>
                <ScaledEmbed
                  key={device}
                  src={embedSrc}
                  designWidth={iframeDesign.width}
                  designHeight={iframeDesign.height}
                  fit={device === 'phone' || isMobileHero ? 'fill-width' : 'contain'}
                  align={device === 'phone' || isMobileHero ? 'top' : 'center'}
                  onLoad={() => setIframeLoaded(true)}
                  title={
                    device === 'phone' || isMobileHero
                      ? 'Demonstração do cardápio no celular'
                      : 'Demonstração do cardápio no computador'
                  }
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
        {phase !== 'idle' ? (
          <div className="landing-hero-demo__close-wrap">
            <button
              type="button"
              className="landing-hero-demo__close landing-glass-card"
              aria-label={closeLabel}
              onClick={closeDemo}
            >
              <span className="landing-hero-demo__close-icon" aria-hidden="true">
                ×
              </span>
            </button>
            <span className="landing-hero-demo__close-tip" role="tooltip">
              {closeLabel}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
