import { RGBA } from "@opentui/core";

export type Theme = "dark" | "light";

/**
 * fx's indexed roles plus smolmux's surface carve-out, exactly as smolmux paints them
 * (`~/code/smolmux/src/host-palette.ts`) and as agentmux's Screen does. The
 * canvas is always the terminal's own background; no hue is ever spent on
 * state. The theme itself comes from agentmux: AGENTMUX_THEME at spawn, then
 * `theme.changed`.
 */
export type Ramp = {
  background: RGBA;
  surface: RGBA;
  divider: RGBA;
  dim: RGBA;
  secondary: RGBA;
  accent: RGBA;
  foreground: RGBA;
};

const RAMPS: Readonly<Record<Theme, Ramp>> = {
  dark: {
    background: RGBA.defaultBackground(),
    surface: RGBA.fromIndex(236),
    divider: RGBA.fromIndex(240),
    dim: RGBA.fromIndex(245),
    secondary: RGBA.fromIndex(250),
    accent: RGBA.fromIndex(252),
    foreground: RGBA.fromIndex(255),
  },
  light: {
    background: RGBA.defaultBackground(),
    surface: RGBA.fromIndex(254),
    divider: RGBA.fromIndex(250),
    dim: RGBA.fromIndex(247),
    secondary: RGBA.fromIndex(241),
    accent: RGBA.fromIndex(238),
    foreground: RGBA.fromIndex(235),
  },
};

export function fxnkRamp(theme: Theme): Ramp {
  return RAMPS[theme];
}
