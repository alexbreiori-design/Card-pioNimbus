'use client';

import { createContext, useContext, useMemo, useRef, useEffect, useState } from 'react';

const DEFAULT_ENTRANCE_DELAY = 60;
const DEFAULT_STAGGER_STEP = 220;

const RevealStaggerContext = createContext(null);

/** Agrupa reveals para entrada em escadinha a partir de um único gatilho. */
export function LandingRevealGroup({ step = DEFAULT_STAGGER_STEP, onLoad = false, children }) {
  const counterRef = useRef(0);
  counterRef.current = 0;
  const [groupVisible, setGroupVisible] = useState(false);
  const observerRef = useRef(null);
  const nodesRef = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setGroupVisible(true);
      return undefined;
    }

    if (onLoad) {
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!cancelled) setGroupVisible(true);
        });
      });
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(frame);
      };
    }

    const arm = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => {
        if (!cancelled) setGroupVisible(true);
      }, DEFAULT_ENTRANCE_DELAY);
      observerRef.current?.disconnect();
      observerRef.current = null;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        arm();
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
    );

    observerRef.current = observer;
    nodesRef.current.forEach((node) => observer.observe(node));

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      observer.disconnect();
      if (observerRef.current === observer) observerRef.current = null;
    };
  }, [onLoad]);

  const value = useMemo(
    () => ({
      step,
      groupVisible,
      watch(node) {
        if (!node || onLoad) return () => {};
        nodesRef.current.add(node);
        observerRef.current?.observe(node);
        return () => {
          nodesRef.current.delete(node);
          observerRef.current?.unobserve(node);
        };
      },
      take() {
        const index = counterRef.current;
        counterRef.current += 1;
        return index;
      },
    }),
    [step, groupVisible, onLoad]
  );

  return <RevealStaggerContext.Provider value={value}>{children}</RevealStaggerContext.Provider>;
}

export default function LandingReveal({
  children,
  className = '',
  delay = 0,
  entranceDelay = DEFAULT_ENTRANCE_DELAY,
  as: Tag = 'div',
  onLoad = false,
  once = true,
  style,
  ...rest
}) {
  const ref = useRef(null);
  const stagger = useContext(RevealStaggerContext);
  const staggerIndexRef = useRef(null);
  const [localVisible, setLocalVisible] = useState(false);

  if (stagger && staggerIndexRef.current === null) {
    staggerIndexRef.current = stagger.take();
  }

  const staggerDelay =
    stagger && staggerIndexRef.current !== null ? staggerIndexRef.current * stagger.step : 0;
  const totalDelay = delay + staggerDelay;
  const visible = stagger ? stagger.groupVisible : localVisible;

  useEffect(() => {
    if (stagger) {
      return stagger.watch(ref.current);
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setLocalVisible(true);
      return undefined;
    }

    if (onLoad) {
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setLocalVisible(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const node = ref.current;
    if (!node) return undefined;

    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        timer = window.setTimeout(() => {
          setLocalVisible(true);
        }, entranceDelay);

        if (once) observer.disconnect();
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [entranceDelay, onLoad, once, stagger]);

  return (
    <Tag
      ref={ref}
      className={`landing-reveal${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--reveal-delay': `${totalDelay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
