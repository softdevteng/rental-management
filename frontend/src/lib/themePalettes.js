// Palette definitions for ThemeSwitcher
export const palettes = {
  vivid: {
    name: 'Vivid Blue-Green',
    dark: {
      '--bg': '#06132a',
      '--bg-soft': '#071a2a',
      '--panel': '#071726',
      '--panel-2': '#0a2430',
      '--border': 'rgba(14,165,255,0.12)',
      '--accent': '#0ea5ff',
      '--accent-2': '#10b981',
      '--text': '#e8fbff',
      '--muted': '#9fd3df'
    },
    light: {
      '--bg': '#ffffff',
      '--bg-soft': '#fbfdff',
      '--panel': '#ffffff',
      '--panel-2': '#f8fafc',
      '--border': 'rgba(2,6,23,0.06)',
      '--accent': '#0ea5ff',
      '--accent-2': '#10b981',
      '--text': '#071330',
      '--muted': '#374151'
    }
  },
  softer: {
    name: 'Softer Ocean',
    dark: {
      '--bg': '#071826',
      '--bg-soft': '#0a2430',
      '--panel': '#091624',
      '--panel-2': '#0c2a36',
      '--border': 'rgba(16,185,129,0.06)',
      '--accent': '#38bdf8',
      '--accent-2': '#34d399',
      '--text': '#e8f9fb',
      '--muted': '#9fd3df'
    },
    light: {
      '--bg': '#ffffff',
      '--bg-soft': '#fbfdff',
      '--panel': '#ffffff',
      '--panel-2': '#f7fbfb',
      '--border': 'rgba(2,6,23,0.06)',
      '--accent': '#38bdf8',
      '--accent-2': '#34d399',
      '--text': '#071330',
      '--muted': '#475569'
    }
  },
  muted: {
    name: 'Muted Teal-Blue',
    dark: {
      '--bg': '#051424',
      '--bg-soft': '#071a26',
      '--panel': '#061226',
      '--panel-2': '#081a2a',
      '--border': 'rgba(14,165,255,0.06)',
      '--accent': '#60a5fa',
      '--accent-2': '#34d399',
      '--text': '#e6f7fb',
      '--muted': '#8fbfcf'
    },
    light: {
      '--bg': '#ffffff',
      '--bg-soft': '#fbfdff',
      '--panel': '#ffffff',
      '--panel-2': '#f8fafc',
      '--border': 'rgba(2,6,23,0.06)',
      '--accent': '#60a5fa',
      '--accent-2': '#34d399',
      '--text': '#071330',
      '--muted': '#465a66'
    }
  }
};

export const defaultPalette = 'vivid';
