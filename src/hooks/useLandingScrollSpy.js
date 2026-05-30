import { useEffect, useState } from 'react';

const DEFAULT_SECTIONS = [
  'top',
  'stats',
  'platform',
  'features',
  'intelligence',
  'showcase',
  'capabilities',
  'pricing',
  'testimonials',
];

/**
 * Tracks which landing section is in view for progress UI and nav affordances.
 */
export function useLandingScrollSpy(sectionIds = DEFAULT_SECTIONS) {
  const [activeId, setActiveId] = useState(sectionIds[0] || 'top');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!elements.length) return undefined;

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, scrollTop / max) : 0);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.12, 0.35] }
    );

    elements.forEach((el) => observer.observe(el));
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [sectionIds]);

  return { activeId, progress };
}

export default useLandingScrollSpy;
