import type { SVGProps } from "react";

export function BatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M14.5 3.5a2.12 2.12 0 0 1 3 3L9 15l-3 .5.5-3 8-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m6.5 15.5-3 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BallIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8.5 4.7C9.7 7 9.9 9.5 9.5 12s-1.2 4.9-2.6 6.9M15.5 4.7C14.3 7 14.1 9.5 14.5 12s1.2 4.9 2.6 6.9"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeDasharray="0.1 2.4"
      />
    </svg>
  );
}

export function StumpsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M7 8v12M12 8v12M17 8v12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6 7.5h6M12 7.5h6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="9.5" cy="6.6" r="0.9" fill="currentColor" />
      <circle cx="14.5" cy="6.6" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function ShotSenseLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <rect width="32" height="32" rx="9" fill="#059669" />
      <path
        d="M20.5 8.5a1.9 1.9 0 0 1 2.7 2.7l-7.4 7.4-2.7.5.5-2.7 6.9-7.9Z"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="21" r="2.4" stroke="#A7F3D0" strokeWidth="1.5" />
    </svg>
  );
}
