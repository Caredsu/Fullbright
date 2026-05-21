import { useState, useEffect, useRef } from 'react';

export default function LazyImage({ src, alt, className, fallback }) {
  const [imageSrc, setImageSrc] = useState(fallback || null);
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!src) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.src = src;
            img.onload = () => {
              setImageSrc(src);
              setIsLoading(false);
              observer.unobserve(entry.target);
            };
            img.onerror = () => {
              setImageSrc(fallback || null);
              setIsLoading(false);
              observer.unobserve(entry.target);
            };
          }
        });
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, fallback]);

  return (
    <div
      ref={imgRef}
      className={`lazy-image ${isLoading ? 'loading' : ''} ${className || ''}`}
    >
      {imageSrc && <img src={imageSrc} alt={alt} loading="lazy" />}
      {!imageSrc && <div className="lazy-image-placeholder" />}
    </div>
  );
}
