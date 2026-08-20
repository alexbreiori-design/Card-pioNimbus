'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import LandingIcon from '@/components/landing/LandingIcons';
import LandingNavIcon from '@/components/landing/LandingNavIcon';
import { whatsappUrl } from '@/lib/landing/constants';
import { landingNav } from '@/lib/landing/content';

const COMPACT_ENTER_Y = 88;
const COMPACT_EXIT_Y = 36;
const DOCK_MAGNET_RANGE = 72;
const DOCK_MAGNET_BOOST = 0.24;
const PHONE_NAV_QUERY = '(max-width: 1080px)';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isPhoneNav() {
  return typeof window !== 'undefined' && window.matchMedia(PHONE_NAV_QUERY).matches;
}

function LandingBurger({ open = false }) {
  return (
    <span className={`landing-burger${open ? ' is-open' : ''}`} aria-hidden="true">
      <span className="landing-burger__line" />
      <span className="landing-burger__line" />
      <span className="landing-burger__line" />
    </span>
  );
}

export default function LandingHeader() {
  const [compact, setCompact] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
      }, 540);
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

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setMenuOpen((open) => !open);
  }, []);

  const handleBrandClick = useCallback(
    (event) => {
      event.preventDefault();
      closeMenu();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (window.location.hash) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }
    },
    [closeMenu],
  );

  const handleNavClick = useCallback(
    (event, id) => {
      if (!isPhoneNav()) return;
      event.preventDefault();
      closeMenu();
      window.requestAnimationFrame(() => {
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${id}`);
      });
    },
    [closeMenu],
  );

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, closeMenu]);

  const resetDockScales = useCallback(() => {
    const dock = dockRef.current;
    if (!dock) return;
    dock.querySelectorAll('.landing-dock-magnet').forEach((item) => {
      item.style.removeProperty('transform');
    });
  }, []);

  const handleDockMouseMove = useCallback((event) => {
    if (!compactRef.current || isPhoneNav() || menuOpen) return;
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
  }, [menuOpen]);

  const handleDockMouseLeave = useCallback(() => {
    resetDockScales();
  }, [resetDockScales]);

  useEffect(() => {
    if (!compact || menuOpen) {
      resetDockScales();
    }
  }, [compact, menuOpen, resetDockScales]);

  return (
    <header
      className={`landing-header${compact ? ' landing-header--compact' : ''}${transitioning ? ' landing-header--transitioning' : ''}${menuOpen ? ' is-menu-open' : ''}`}
    >
      <button
        type="button"
        className={`landing-header__sheet-backdrop${menuOpen ? ' is-open' : ''}`}
        aria-label="Fechar menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />

      <div
        ref={dockRef}
        className="landing-header__dock landing-glass-card"
        onMouseMove={handleDockMouseMove}
        onMouseLeave={handleDockMouseLeave}
      >
        <div className="landing-header__inner">
          <div className="landing-header__group landing-header__group--brand">
            <a
              href="#topo"
              className="landing-brand landing-dock-magnet"
              aria-label="Cardápio Nimbus, início"
              onClick={handleBrandClick}
            >
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
            </a>
          </div>

          <nav className="landing-header__group landing-header__group--nav landing-nav" aria-label="Navegação principal">
            {landingNav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="landing-nav__link landing-dock-magnet"
                aria-label={item.label}
              >
                <span className="landing-nav__text">{item.label}</span>
                <LandingNavIcon name={item.navIcon} className="landing-nav__icon" />
                <span className="landing-dock-tooltip">{item.label}</span>
              </a>
            ))}
          </nav>

          <div className="landing-header__group landing-header__group--actions landing-header__actions">
            <Link href="/login" className="landing-btn landing-btn--ghost landing-header__login landing-dock-magnet" aria-label="Login">
              <LandingIcon name="login" className="landing-header__btn-icon" />
              <span className="landing-header__btn-text">Login</span>
              <span className="landing-dock-tooltip">Login</span>
            </Link>
            <a
              className="landing-btn landing-btn--primary landing-header__cta landing-dock-magnet"
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Quero começar"
            >
              <LandingIcon name="whatsapp" className="landing-header__btn-icon" />
              <span className="landing-header__btn-text">Quero começar</span>
              <span className="landing-dock-tooltip">Quero começar</span>
            </a>
            <button
              type="button"
              className="landing-header__menu-toggle"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
              aria-controls="landing-header-sheet"
              onClick={toggleMenu}
            >
              <LandingBurger open={menuOpen} />
            </button>
          </div>
        </div>

        <div
          id="landing-header-sheet"
          className="landing-header__menu-panel"
          role="dialog"
          aria-modal={menuOpen}
          aria-label="Menu"
          aria-hidden={!menuOpen}
          inert={!menuOpen || undefined}
        >
          <div className="landing-header__menu-panel-inner">
            <nav className="landing-header__sheet-nav" aria-label="Seções da página">
              {landingNav.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="landing-header__sheet-link"
                  onClick={(event) => handleNavClick(event, item.id)}
                >
                  <LandingNavIcon name={item.navIcon} className="landing-header__sheet-icon" />
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>
            <Link href="/login" className="landing-header__sheet-link landing-header__sheet-link--login" onClick={closeMenu}>
              <LandingIcon name="login" className="landing-header__sheet-icon" />
              <span>Login</span>
            </Link>
            <a
              className="landing-btn landing-btn--primary landing-header__sheet-cta"
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
            >
              <LandingIcon name="whatsapp" className="landing-header__sheet-icon" />
              <span>Quero começar</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
