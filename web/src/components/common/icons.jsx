function Svg({ children, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function ChatIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M7 17.5 4 20v-3.2A7.5 7.5 0 1 1 8.2 19" />
      <path d="M8 10h8M8 13h5" />
    </Svg>
  );
}

export function PlayIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M8 6.5v11l9-5.5-9-5.5Z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function MicIcon({ size = 22 }) {
  return (
    <Svg size={size}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6" />
    </Svg>
  );
}

export function SendIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z" />
    </Svg>
  );
}

export function UserIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.2a6.5 6.5 0 0 1 13 0" />
    </Svg>
  );
}

export function LayersIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="m12 4 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 16 8 4 8-4" />
    </Svg>
  );
}

export function GlobeIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.2 2.4 2.2 13.6 0 16M12 4c-2.2 2.4-2.2 13.6 0 16" />
    </Svg>
  );
}

export function CheckIcon({ size = 16 }) {
  return (
    <Svg size={size}>
      <path d="m5 12 5 5 9-10" />
    </Svg>
  );
}

export function LockIcon({ size = 16 }) {
  return (
    <Svg size={size}>
      <rect x="6" y="10" width="12" height="9" rx="2" />
      <path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2" />
    </Svg>
  );
}

export function ThumbIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M8 11v8H5.5A1.5 1.5 0 0 1 4 17.5v-5A1.5 1.5 0 0 1 5.5 11H8Z" />
      <path d="M8 11.5 11 4.8a1.8 1.8 0 0 1 3.3 1.1V10H18a2 2 0 0 1 2 2.3l-1 5.2A2 2 0 0 1 17 19H8" />
    </Svg>
  );
}

export function TargetIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function FlagIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M6 4.5v15" />
      <path d="M6 5h11l-2.2 3.5L17 12H6" />
    </Svg>
  );
}

export function SparkIcon({ size = 14 }) {
  return (
    <Svg size={size}>
      <path d="M12 3.5 13.4 8 18 9.2 13.4 10.6 12 15.2 10.6 10.6 6 9.2 10.6 8 12 3.5Z" />
    </Svg>
  );
}

export function ClockIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" />
    </Svg>
  );
}
