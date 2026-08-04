import React, { useState, useEffect } from 'react';
import { getFallbackSvg } from '../../utils/imageUtils';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
  ...props
}) => {
  const fallback = () => getFallbackSvg(fallbackTitle || alt);
  const validSource = typeof src === 'string' && src.trim().length > 0;
  const [imgSrc, setImgSrc] = useState<string>(validSource ? src : fallback());
  const [hasError, setHasError] = useState<boolean>(!validSource);

  // Sync imgSrc state when src prop changes (e.g. selecting a new destination)
  useEffect(() => {
    const nextIsValid = typeof src === 'string' && src.trim().length > 0;
    setImgSrc(nextIsValid ? src : fallback());
    setHasError(!nextIsValid);
  }, [src, alt, fallbackTitle]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallback());
    }
  };

  return (
    <img
      {...props}
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={`${className} ${hasError ? 'opacity-90' : ''}`}
    />
  );
};
