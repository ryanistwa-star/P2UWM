import React, { useState } from 'react';
import { Waves } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-teal-900 via-cyan-900 to-slate-900 text-teal-100 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Waves className="w-8 h-8 text-teal-300 mb-2 opacity-80" />
        <span className="text-xs font-medium tracking-tight line-clamp-2 max-w-[220px] opacity-90">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
