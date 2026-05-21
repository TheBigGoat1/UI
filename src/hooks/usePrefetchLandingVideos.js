import { useEffect } from 'react';
import { LANDING_VIDEOS } from '../config/landingVideos';

/** Warm browser cache for all landing clips after first paint. */
export function usePrefetchLandingVideos() {
  useEffect(() => {
    const links = [];
    const unique = [...new Set(Object.values(LANDING_VIDEOS))];

    unique.forEach((href) => {
      if (document.querySelector(`link[rel="preload"][href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = href;
      link.type = 'video/mp4';
      document.head.appendChild(link);
      links.push(link);
    });

    return () => links.forEach((l) => l.remove());
  }, []);
}

export default usePrefetchLandingVideos;
