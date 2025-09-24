import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const ICON_PATHS = {
    plus: "M12 5v14m7-7H5",
    trash: "M6 7h12M10 7V5a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2m-8 0 1 12h6l1-12"
};
export const Icon = ({ name, title, ...props }) => {
    const path = ICON_PATHS[name];
    if (!path) {
        return null;
    }
    return (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, ...props, children: [title ? _jsx("title", { children: title }) : null, _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: path })] }));
};
export default Icon;
