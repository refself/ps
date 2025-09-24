export const editorTheme = {
  fonts: {
    sans: '"Albert Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", SFMono-Regular, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  colors: {
    foreground: '#0A1A23',
    shaded: '#657782',
    borderSubtle: 'rgba(10, 26, 35, 0.08)',
    borderStrong: 'rgba(10, 26, 35, 0.16)',
    borderMuted: 'rgba(10, 26, 35, 0.06)',
    action: '#3A5AE5',
    actionHover: '#2D4BD4',
    actionBox: '#D8DEFA',
    positive: '#32AA81',
    positiveBox: '#32AA8133',
    negative: '#CD3A50',
    negativeBox: '#CD3A5033',
    warning: '#E2A636',
    warningBox: '#E2A63633',
    infoBox: 'rgba(10, 26, 35, 0.06)',
    backgroundDefault: '#FFFFFF',
    backgroundSoft: '#F5F6F9',
    backgroundTint: '#EEF2FF',
    accentMuted: '#9AA7B4',
  },
  gradients: {
    container: 'linear-gradient(0deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.15) 100%), linear-gradient(176deg, #EDEEF6 2.52%, #F2F0F9 38.43%, #F0F1F7 98.27%)',
    box: 'linear-gradient(334deg, rgba(255, 255, 255, 0.20) 2.57%, rgba(255, 255, 255, 0.50) 71.91%), linear-gradient(233deg, rgba(151, 216, 200, 0.00) 16.93%, rgba(232, 197, 209, 0.10) 91.51%), #F0F0FA',
    selected: 'linear-gradient(87deg, rgba(255, 255, 255, 0.30) 0.44%, rgba(255, 255, 255, 0.15) 99.61%), rgba(169, 175, 218, 0.30)',
  },
  identifier: [
    { chip: '#D8DEFA', border: 'rgba(58,90,229,0.33)', text: '#3A5AE5' },
    { chip: '#CFEADF', border: 'rgba(50,170,129,0.35)', text: '#267E61' },
    { chip: '#F3E5C6', border: 'rgba(226,166,54,0.35)', text: '#B58027' },
    { chip: '#EAD4F0', border: 'rgba(175,84,190,0.35)', text: '#8A4096' },
    { chip: '#D6E4F6', border: 'rgba(87,139,201,0.35)', text: '#3B689C' },
    { chip: '#D1F0E3', border: 'rgba(51,158,128,0.35)', text: '#28765D' },
    { chip: '#F4D2DA', border: 'rgba(205,58,80,0.35)', text: '#A22D3E' },
    { chip: '#E1E6F2', border: 'rgba(101,119,130,0.35)', text: '#465764' },
  ],
  category: {
    program: '#3A5AE5',
    control: '#AF54BE',
    variables: '#E2A636',
    functions: '#32AA81',
    expressions: '#578BC9',
    ai: '#AF54BE',
    automation: '#32AA81',
    utility: '#3A5AE5',
    io: '#578BC9',
    raw: '#CD3A50',
  },
  surfaces: {
    glass: 'rgba(255, 255, 255, 0.82)',
    card: 'rgba(255, 255, 255, 0.92)',
    soft: 'rgba(245, 246, 249, 0.92)',
    accent: '#EEF2FF',
  },
};

export const statusTone = {
  online: {
    label: 'Connected',
    dot: '#32AA81',
    background: '#32AA8110',
    border: 'rgba(50, 170, 129, 0.35)',
    text: '#32AA81',
  },
  offline: {
    label: 'Offline',
    dot: '#CD3A50',
    background: '#CD3A5010',
    border: 'rgba(205, 58, 80, 0.35)',
    text: '#CD3A50',
  },
  checking: {
    label: 'Checking…',
    dot: '#9AA7B4',
    background: '#FFFFFF',
    border: 'rgba(154, 167, 180, 0.4)',
    text: '#9AA7B4',
  },
};

export type EditorTheme = typeof editorTheme;

export const getCategoryAccent = (category: string) => {
  return editorTheme.category[category as keyof typeof editorTheme.category] ?? editorTheme.colors.action;
};
