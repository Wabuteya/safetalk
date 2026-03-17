import { useRef, useState, useEffect } from 'react';
import Lottie from 'lottie-react';

/**
 * Viewport-aware Lottie player using Intersection Observer.
 * Loads and plays animations only when in viewport; pauses when out of view to save CPU and memory.
 */
export const LazyLottie = ({
  path,
  animationData: externalAnimationData,
  loop = true,
  className,
  style,
  ...rest
}) => {
  const containerRef = useRef(null);
  const lottieRef = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const [fetchedData, setFetchedData] = useState(null);

  const animationData = externalAnimationData ?? fetchedData;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { rootMargin: '100px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || !path || externalAnimationData || fetchedData) return;
    fetch(path)
      .then((res) => res.json())
      .then(setFetchedData)
      .catch(() => {});
  }, [isInView, path, externalAnimationData, fetchedData]);

  useEffect(() => {
    if (!lottieRef.current) return;
    if (isInView) {
      lottieRef.current.play();
    } else {
      lottieRef.current.pause();
    }
  }, [isInView]);

  const placeholderStyle = {
    minWidth: 130,
    minHeight: 130,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style
  };

  return (
    <div ref={containerRef} className={className} style={placeholderStyle}>
      {animationData && (
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={loop}
          autoplay={isInView}
          {...rest}
        />
      )}
    </div>
  );
};
