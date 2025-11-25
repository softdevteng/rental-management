import React, { useEffect, useState } from 'react';
import { palettes, defaultPalette } from '../lib/themePalettes';

function applyVars(vars) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

export default function ThemeSwitcher() {
  const [selected, setSelected] = useState(() => {
    try { return localStorage.getItem('palette') || defaultPalette; } catch { return defaultPalette; }
  });

  useEffect(() => {
    const apply = () => {
      const theme = document.documentElement.getAttribute('data-theme') || 'dark';
      const p = palettes[selected] || palettes[defaultPalette];
      applyVars(theme === 'light' ? p.light : p.dark);
      try { localStorage.setItem('palette', selected); } catch {}
    };
    apply();
    // also apply when theme attribute changes
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, [selected]);

  return (
    <label style={{ display:'inline-flex', alignItems:'center', gap:8 }} title="Theme palette">
      <select value={selected} onChange={e => setSelected(e.target.value)} style={{ padding:'6px 8px', borderRadius:6 }}>
        {Object.keys(palettes).map(k => (
          <option key={k} value={k}>{palettes[k].name}</option>
        ))}
      </select>
    </label>
  );
}
