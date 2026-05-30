import React, { useRef, useEffect, useState } from 'react';

/**
 * Section video — mounts immediately, buffers early, plays in view.
 * @param {boolean} eager — start loading on page load (next section after hero)
 */
const LazySectionVideo = ({
  src,
  className = '',
  playbackRate = 0.75,
  dimLevel = 'medium',
  objectPosition = 'center',
  eager = false,
}) => {
  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const [inView, setInView] = useState(eager);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (eager) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '50% 0px', threshold: 0.01 }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [eager]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;

    const onReady = () => setReady(true);
    el.addEventListener('loadeddata', onReady);
    el.addEventListener('canplay', onReady);

    if (inView) {
      el.preload = 'auto';
      el.playbackRate = playbackRate;
      if (el.readyState < 2) el.load();
      el.play().catch(() => {});
    } else {
      el.pause();
    }

    return () => {
      el.removeEventListener('loadeddata', onReady);
      el.removeEventListener('canplay', onReady);
    };
  }, [inView, playbackRate]);

  const dimClass =
    dimLevel === 'none'
      ? 'landing-video-dim--none'
      : dimLevel === 'light'
        ? 'landing-video-dim--light'
        : dimLevel === 'heavy'
          ? 'landing-video-dim--heavy'
          : dimLevel === 'cinematic'
            ? 'landing-video-dim--cinematic'
            : dimLevel === 'platform'
              ? 'landing-video-dim--platform'
              : dimLevel === 'signals'
                ? 'landing-video-dim--signals'
                : dimLevel === 'capabilities'
                  ? 'landing-video-dim--capabilities'
                  : 'landing-video-dim--medium';

  return (
    <div ref={rootRef} className={`landing-video-panel ${className}`} aria-hidden="true">
      <div className="landing-video-panel__placeholder" aria-hidden="true" />
      <video
        ref={videoRef}
        className={`landing-video-panel__media landing-video-panel__media--fade ${
          ready ? 'landing-video-panel__media--ready' : ''
        } ${dimLevel === 'cinematic' ? 'landing-video-panel__media--wide' : ''}`}
        style={{ objectPosition }}
        src={src}
        muted
        loop
        playsInline
        preload="auto"
      />
      <div className={`landing-video-panel__scrim ${dimClass}`} />
    </div>
  );
};

export default LazySectionVideo;
