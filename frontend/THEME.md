# Theme variables and customization

This project exposes a set of CSS custom properties (variables) used to control the app theme.

Primary variables
- `--bg` — page background
- `--bg-soft` — subtle section backgrounds / overlays
- `--panel` — main surface background (cards, panels)
- `--panel-2` — secondary surface background (inputs, small panels)
- `--border` — border color for panels/inputs
- `--accent` — primary accent color (used for buttons, highlights)
- `--accent-2` — secondary accent color (used for gradients)
- `--text` — primary text color
- `--muted` — secondary text / placeholder color

Other semantic variables
- `--success`, `--warn`, `--error` — colors for status badges and alerts

How to customize
1. The app reads `data-theme` on the document element (`<html data-theme="dark">`) and has separate defaults for dark and light modes in `src/components/styles.css`.
2. To create or apply palettes at runtime, see `src/lib/themePalettes.js` and the `ThemeSwitcher` component in `src/components/ThemeSwitcher.jsx`.
3. Palettes are defined with `dark` and `light` variants. The switcher will set the CSS variables for the currently active `data-theme`.

Adding a new palette
1. Open `src/lib/themePalettes.js` and add a new key in `palettes` with `name`, `dark` and `light` objects mapping the custom properties above to hex/rgba values.
2. The `ThemeSwitcher` will automatically show entries from `palettes`.

Notes
- Inline variable overrides (set via `document.documentElement.style.setProperty`) take precedence over stylesheet defaults.
- If you want a palette that changes both light and dark defaults regardless of current theme, modify both `dark` and `light` objects in the palette and the switcher will apply the appropriate one when the `data-theme` value changes.
