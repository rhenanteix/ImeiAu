"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Progressive enhancement: content stays readable without JavaScript. */
export function LandingMotion({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    let observer: IntersectionObserver | undefined;
    const stop = () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    };
    const start = () => {
      stop();
      if (preference.matches) return;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const target = entry.target as HTMLElement;
            observer?.unobserve(target);
            if (target.dataset.presented) continue;
            target.dataset.presented = "true";
            const animation = target.animate(
              [
                { opacity: 0, translate: "0 28px" },
                { opacity: 1, translate: "0 0" },
              ],
              {
                duration: 750,
                delay: Number(target.dataset.delay || 0),
                easing: "cubic-bezier(.22,1,.36,1)",
                fill: "backwards",
              },
            );
            animations.add(animation);
            animation.onfinish = () => animations.delete(animation);
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -24px 0px" },
      );
      element
        .querySelectorAll("[data-reveal]")
        .forEach((target) => observer?.observe(target));
    };
    // Keyboard navigation should never wait for a presentation transition.
    const revealFocus = () =>
      animations.forEach((animation) => animation.finish());
    start();
    preference.addEventListener("change", start);
    element.addEventListener("focusin", revealFocus);
    return () => {
      stop();
      preference.removeEventListener("change", start);
      element.removeEventListener("focusin", revealFocus);
    };
  }, []);
  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
