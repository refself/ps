import { memo } from "react";

export type IconName =
  | "back"
  | "plus"
  | "trash"
  | "rename"
  | "play"
  | "copy"
  | "upload"
  | "download"
  | "undo"
  | "redo"
  | "workflow"
  | "branch"
  | "variable"
  | "function"
  | "expression"
  | "sparkles"
  | "gear"
  | "wrench"
  | "link"
  | "box"
  | "arrowRight"
  | "check"
  | "alert";

type IconProps = {
  name: IconName;
  title?: string;
  className?: string;
};

type IconRenderer = () => JSX.Element;

const strokeProps = {
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none"
};

const ICONS: Record<IconName, IconRenderer> = {
  back: () => (
    <>
      <path {...strokeProps} d="M19 12H5" />
      <path {...strokeProps} d="M12 19l-7-7 7-7" />
    </>
  ),
  plus: () => (
    <>
      <path {...strokeProps} d="M12 5v14" />
      <path {...strokeProps} d="M5 12h14" />
    </>
  ),
  trash: () => (
    <>
      <path {...strokeProps} d="M3 6h18" />
      <path {...strokeProps} d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path {...strokeProps} d="M10 11v6" />
      <path {...strokeProps} d="M14 11v6" />
      <path {...strokeProps} d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </>
  ),
  rename: () => (
    <>
      <path {...strokeProps} d="M3 21v-3.5a1 1 0 0 1 .293-.707L16.879 3.207a2 2 0 0 1 2.828 0l1.086 1.086a2 2 0 0 1 0 2.828L7.207 21.293A1 1 0 0 1 6.5 21H3z" />
      <path {...strokeProps} d="M15 5l4 4" />
    </>
  ),
  play: () => (
    <polygon
      points="8 5 18 12 8 19 8 5"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  ),
  copy: () => (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" ry="2" {...strokeProps} />
      <rect x="3" y="3" width="12" height="12" rx="2" ry="2" {...strokeProps} />
    </>
  ),
  upload: () => (
    <>
      <path {...strokeProps} d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path {...strokeProps} d="M12 3v12" />
      <path {...strokeProps} d="M7 8l5-5 5 5" />
    </>
  ),
  download: () => (
    <>
      <path {...strokeProps} d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path {...strokeProps} d="M12 21V9" />
      <path {...strokeProps} d="M17 14l-5 5-5-5" />
    </>
  ),
  undo: () => (
    <>
      <path {...strokeProps} d="M9 5L4 10l5 5" />
      <path {...strokeProps} d="M4 10h8a5 5 0 1 1 0 10H9" />
    </>
  ),
  redo: () => (
    <>
      <path {...strokeProps} d="M15 5l5 5-5 5" />
      <path {...strokeProps} d="M20 10h-8a5 5 0 1 0 0 10h3" />
    </>
  ),
  workflow: () => (
    <>
      <rect x="3" y="4" width="6" height="6" rx="1" {...strokeProps} />
      <rect x="15" y="4" width="6" height="6" rx="1" {...strokeProps} />
      <rect x="9" y="14" width="6" height="6" rx="1" {...strokeProps} />
      <path {...strokeProps} d="M9 7h6" />
      <path {...strokeProps} d="M6 10v4a3 3 0 0 0 3 3" />
      <path {...strokeProps} d="M18 10v4a3 3 0 0 1-3 3" />
    </>
  ),
  branch: () => (
    <>
      <circle cx="6" cy="6" r="2" {...strokeProps} />
      <circle cx="18" cy="6" r="2" {...strokeProps} />
      <circle cx="18" cy="18" r="2" {...strokeProps} />
      <path {...strokeProps} d="M8 6h4a4 4 0 0 1 4 4v3" />
      <path {...strokeProps} d="M6 8v8a4 4 0 0 0 4 4h2" />
    </>
  ),
  variable: () => (
    <>
      <path {...strokeProps} d="M6 7l12 10" />
      <path {...strokeProps} d="M6 17l12-10" />
    </>
  ),
  function: () => (
    <>
      <path {...strokeProps} d="M15 4h-4a4 4 0 0 0-4 4v10" />
      <path {...strokeProps} d="M10 12h5" />
    </>
  ),
  expression: () => (
    <path {...strokeProps} d="M17 5H7l6 7-6 7h10" />
  ),
  sparkles: () => (
    <>
      <path {...strokeProps} d="M12 5v3" />
      <path {...strokeProps} d="M12 16v3" />
      <path {...strokeProps} d="M5 12h3" />
      <path {...strokeProps} d="M16 12h3" />
      <path {...strokeProps} d="M7.5 7.5l2 2" />
      <path {...strokeProps} d="M14.5 14.5l2 2" />
      <path {...strokeProps} d="M7.5 16.5l2-2" />
      <path {...strokeProps} d="M14.5 9.5l2-2" />
    </>
  ),
  gear: () => (
    <>
      <circle cx="12" cy="12" r="3" {...strokeProps} />
      <path {...strokeProps} d="M12 5V3" />
      <path {...strokeProps} d="M12 21v-2" />
      <path {...strokeProps} d="M5 12H3" />
      <path {...strokeProps} d="M21 12h-2" />
      <path {...strokeProps} d="M6.8 6.8L5.4 5.4" />
      <path {...strokeProps} d="M18.6 18.6l-1.4-1.4" />
      <path {...strokeProps} d="M18.6 5.4l-1.4 1.4" />
      <path {...strokeProps} d="M6.8 17.2l-1.4 1.4" />
    </>
  ),
  wrench: () => (
    <path
      {...strokeProps}
      d="M14.7 5.3a4 4 0 1 0-1 1L4.9 15a2 2 0 0 0 0 2.8l1.4 1.4a2 2 0 0 0 2.8 0l8.8-8.8a4 4 0 0 0-3.2-5.1Z"
    />
  ),
  link: () => (
    <>
      <path {...strokeProps} d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 1 1 7 7L17 13" />
      <path {...strokeProps} d="M14 11a5 5 0 0 1 0 7l-1.5 1.5a5 5 0 1 1-7-7L7 11" />
    </>
  ),
  box: () => (
    <>
      <path {...strokeProps} d="M12 2l8 4-8 4-8-4 8-4Z" />
      <path {...strokeProps} d="M4 6v10l8 4 8-4V6" />
      <path {...strokeProps} d="M12 10v10" />
    </>
  ),
  arrowRight: () => (
    <>
      <path {...strokeProps} d="M5 12h14" />
      <path {...strokeProps} d="M13 5l7 7-7 7" />
    </>
  ),
  check: () => (
    <>
      <path {...strokeProps} d="M5 13l4 4 10-10" />
    </>
  ),
  alert: () => (
    <>
      <path {...strokeProps} d="M12 9v4" />
      <path {...strokeProps} d="M12 17h.01" />
      <path {...strokeProps} d="M10.29 3.86L2.82 16a2 2 0 0 0 1.71 3h14.94a2 2 0 0 0 1.71-3l-7.47-12.14a2 2 0 0 0-3.42 0Z" />
    </>
  )
};

export const Icon = memo(({ name, title, className }: IconProps) => {
  const Shape = ICONS[name];
  return (
    <svg
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      viewBox="0 0 24 24"
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <Shape />
    </svg>
  );
});
