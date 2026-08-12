function CloudSvg({ className, viewBox, path }) {
  return (
    <svg
      className={`kids-cloud ${className}`}
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}

export function CloudLarge({ className = "" }) {
  return (
    <CloudSvg
      className={`kids-cloud-large ${className}`}
      viewBox="0 0 220 92"
      path="M24 78C10 78 2 67 2 54c0-15 12-27 27-27 5 0 10 1 14 4C51 13 68 2 88 2c25 0 45 16 51 39 7-8 17-13 29-13 18 0 33 12 37 29 8 1 13 7 13 15 0 10-8 18-19 18H24Z"
    />
  );
}

export function CloudMedium({ className = "" }) {
  return (
    <CloudSvg
      className={`kids-cloud-medium ${className}`}
      viewBox="0 0 180 78"
      path="M21 67C10 67 2 58 2 47c0-13 10-23 23-23 6 0 11 2 15 6C47 13 62 3 81 3c22 0 40 15 44 36 6-7 15-11 25-11 16 0 29 11 32 26 0 8-7 13-15 13H21Z"
    />
  );
}

export function CloudSmall({ className = "" }) {
  return (
    <CloudSvg
      className={`kids-cloud-small ${className}`}
      viewBox="0 0 132 58"
      path="M16 50C8 50 2 44 2 36c0-9 8-17 17-17 5 0 9 2 12 5C37 10 49 2 64 2c18 0 32 12 35 29 5-5 11-8 19-8 7 0 12 3 12 11 0 9-7 16-16 16H16Z"
    />
  );
}
