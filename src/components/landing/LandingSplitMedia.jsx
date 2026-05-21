import React from 'react';
import LazySectionVideo from '../visual/LazySectionVideo';

/**
 * Editorial split: video panel + content column (signals, features proof).
 */
const LandingSplitMedia = ({
  src,
  children,
  reverse = false,
  label = 'Live preview',
  objectPosition = 'center center',
  playbackRate = 0.75,
}) => (
  <div className={`landing-split ${reverse ? 'landing-split--reverse' : ''}`}>
    <div className="landing-split__media">
      <span className="landing-split__label">{label}</span>
      <LazySectionVideo
        src={src}
        className="landing-split__video"
        dimLevel="medium"
        objectPosition={objectPosition}
        playbackRate={playbackRate}
      />
    </div>
    <div className="landing-split__body">{children}</div>
  </div>
);

export default LandingSplitMedia;
