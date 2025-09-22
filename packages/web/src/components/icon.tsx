import type { SVGProps } from "react";

const ICON_PATHS: Record<string, string> = {
  plus: "M12 5v14m7-7H5",
  trash: "M6 7h12M10 7V5a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2m-8 0 1 12h6l1-12"
};

type IconProps = SVGProps<SVGSVGElement> & {
  name: keyof typeof ICON_PATHS | (string & {});
  title?: string;
};

export const Icon = ({ name, title, ...props }: IconProps) => {
  const path = ICON_PATHS[name];
  if (!path) {
    return null;
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      {title ? <title>{title}</title> : null}
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
};

export default Icon;
