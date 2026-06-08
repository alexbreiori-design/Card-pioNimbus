'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import LandingIcon from '@/components/landing/LandingIcons';
import { whatsappUrl } from '@/lib/landing/constants';
import { landingNav } from '@/lib/landing/content';

const COMPACT_ENTER_Y = 88;
const COMPACT_EXIT_Y = 36;
const DOCK_MAGNET_RANGE = 72;
const DOCK_MAGNET_BOOST = 0.24;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function LandingHeader() {
  const [compact, setCompact] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const dockRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const compactRef = useRef(false);

  useEffect(() => {
    compactRef.current = compact;
  }, [compact]);

  useEffect(() => {
    let ticking = false;

    const setCompactWithTransition = (nextCompact) => {
      if (nextCompact === compactRef.current) return;
      compactRef.current = nextCompact;
      setTransitioning(true);
      setCompact(nextCompact);
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
      transitionTimerRef.current = window.setTimeout(() => {
        setTransitioning(false);
      }, 380);
    };

    const update = () => {
      const y = window.scrollY;
      if (y >= COMPACT_ENTER_Y) {
        setCompactWithTransition(true);
      } else if (y <= COMPACT_EXIT_Y) {
        setCompactWithTransition(false);
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const resetDockScales = useCallback(() => {
    const dock = dockRef.current;
    if (!dock) return;
    dock.querySelectorAll('.landing-dock-magnet').forEach((item) => {
      item.style.removeProperty('transform');
    });
  }, []);

  const handleDockMouseMove = useCallback(
    (event) => {
      if (!compactRef.current) return;
      const dock = dockRef.current;
      if (!dock) return;

      const pointerX = event.clientX;
      dock.querySelectorAll('.landing-dock-magnet').forEach((item) => {
        const rect = item.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const distance = Math.abs(pointerX - centerX);
        const influence = clamp(1 - distance / DOCK_MAGNET_RANGE, 0, 1);
        const scale = 1 + influence * DOCK_MAGNET_BOOST;
        const shiftY = (scale - 1) * 10;
        item.style.transform = `scale(${scale.toFixed(3)}) translateY(${shiftY.toFixed(2)}px)`;
      });
    },
    []
  );

  const handleDockMouseLeave = useCallback(() => {
    resetDockScales();
  }, [resetDockScales]);

  useEffect(() => {
    if (!compact) {
      resetDockScales();
    }
  }, [compact, resetDockScales]);

  return (
    <header
      className={`landing-header${compact ? ' landing-header--compact' : ''}${transitioning ? ' landing-header--transitioning' : ''}`}
    >
      <div
        ref={dockRef}
        className="landing-header__dock landing-glass-card"
        onMouseMove={handleDockMouseMove}
        onMouseLeave={handleDockMouseLeave}
      >
        <div className="landing-header__inner">
          <div className="landing-header__group landing-header__group--brand">
            <Link href="/" className="landing-brand landing-dock-magnet" aria-label="Cardápio Nimbus, início">
              <Image
                src="/images/logo-horizontal.png"
                alt="Cardápio Nimbus"
                width={160}
                height={38}
                className="landing-brand__logo landing-brand__logo--full"
                priority
              />
              <Image
                src="/images/icon.png"
                alt=""
                width={32}
                height={32}
                className="landing-brand__logo landing-brand__logo--icon"
                priority
                aria-hidden="true"
              />
            </Link>
          </div>

          <nav className="landing-header__group landing-header__group--nav landing-nav" aria-label="Navegação principal">
            {landingNav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="landing-nav__link landing-dock-magnet"
                title={item.label}
                aria-label={item.label}
              >
                <span className="landing-nav__text">{item.label}</span>
                <LandingIcon name={item.icon} className="landing-nav__icon" />
              </a>
            ))}
          </nav>

          <div className="landing-header__group landing-header__group--actions landing-header__actions">
            <Link href="/login" className="landing-btn landing-btn--ghost landing-header__login landing-dock-magnet" title="Login">
              <LandingIcon name="login" className="landing-header__btn-icon" />
              <span className="landing-header__btn-text">Login</span>
            </Link>
            <a
              className="landing-btn landing-btn--primary landing-header__cta landing-dock-magnet"
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              title="Quero começar"
            >
              <LandingIcon name="whatsapp" className="landing-header__btn-icon" />
              <span className="landing-header__btn-text">Quero começar</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
