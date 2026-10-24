"use client";

interface LemcorpLogoProps {
  className?: string;
  size?: number;
}

/** Logo de LEMCORP — cuadrícula 3x3 con el centro relleno */
export function LemcorpLogo({ className, size = 24 }: LemcorpLogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 46 46"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="LEMCORP logo"
    >
      <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="17" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="32" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="2" y="17" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="17" y="17" width="12" height="12" fill="currentColor" opacity="0.7" />
      <rect x="32" y="17" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="2" y="32" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="17" y="32" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="32" y="32" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
