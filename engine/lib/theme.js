// Per-site stylesheet (docs/DESIGN.md « BrandHUB Omra »): themes/_base/base.css + the site's tokens, pattern and
// dark-mode rules + themes/<domain>/style.css. Built once per site and inlined in every page (no extra request).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exists } from './util.js';

const ENGINE_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Neutral light / dark values (same as the :root blocks of themes/_base/base.css). A theme overrides any of them.
// Every token that base.css sets under :root[data-theme=dark] has a light value here, so the light override of a
// dark-default site resets all of them (tests/theme.test.js checks this against base.css).
export const NEUTRAL = {
  light: {
    bg: '#FFFFFF', surface: '#FFFFFF', 'surface-2': '#F4F4F4', line: '#E6E6E6', ink: '#1A1A1A', 'ink-2': '#444444', 'ink-3': '#767676',
    accent: '#146C3C', 'accent-ink': '#0E4F2C', 'accent-soft': '#E3F1E8', 'on-accent': '#FFFFFF',
    'ok-soft': '#E4F3EA', 'warn-soft': '#FBEFD9', 'danger-soft': '#FBE3E6',
  },
  dark: {
    bg: '#0A0A0A', surface: '#141414', 'surface-2': '#1E1E1E', line: '#2A2A2A', ink: '#F2F2F2', 'ink-2': '#C4C4C4', 'ink-3': '#8A8A8A',
    'on-accent': '#0A0A0A', 'accent-soft': '#1E1E1E', 'ok-soft': '#12291C', 'warn-soft': '#2E2209', 'danger-soft': '#33121A',
  },
};
const TOKEN_NAME = /^[a-z][a-z0-9-]*$/;
const COLOR = /^(#[0-9a-fA-F]{3,8}|[a-z]+|rgba?\([0-9.,\s%]+\))$/;

// themes/_base/base.css of the project root when it has one (a project may restyle the base), else the engine's.
export function baseCss(root) {
  const own = path.join(root, 'themes/_base/base.css');
  return fs.readFileSync(exists(own) ? own : path.join(ENGINE_ROOT, 'themes/_base/base.css'), 'utf8');
}

export const defaultTheme = theme => (theme.tokens?.default === 'dark' ? 'dark' : 'light');

// A theme's inline SVG pattern as a CSS url() value (CSP allows data: images).
export const patternUrl = svg => (svg ? `url("data:image/svg+xml,${encodeURIComponent(String(svg).replace(/\s+/g, ' ').trim())}")` : 'none');

function block(selector, tokens) {
  const decl = Object.entries(tokens).filter(([k, v]) => TOKEN_NAME.test(k) && v != null && COLOR.test(String(v)))
    .map(([k, v]) => `--${k}:${v}`).join(';');
  return decl ? `${selector}{${decl}}` : '';
}

/**
 * tokens: { accent, 'accent-ink', 'accent-soft', 'accent-on-dark', bg, surface, 'surface-2', line, ..., dark: { … }, default: 'light'|'dark' }
 * Light values sit on :root; dark mode uses the neutral dark surfaces, the site's `dark` overrides and accent-on-dark.
 * A dark-default site renders <html data-theme="dark">; readers whose device asks for light get the light tokens
 * (prefers-color-scheme), and the header toggle (/assets/theme-toggle.js) can switch either way.
 * The light override resets EVERY token the dark state sets (its light value, or `initial` for a dark-only token such
 * as `cover-bg`, so `var(--cover-bg, fallback)` falls back) plus color-scheme. A theme's style.css must therefore
 * express dark-only styling through dark tokens, never through `:root[data-theme=dark] <selector>` rules.
 */
export function tokensCss(theme) {
  const { dark = {}, default: _d, ...light } = theme.tokens || {};
  const onDark = light['accent-on-dark'];
  const darkTokens = { ...NEUTRAL.dark, ...(onDark ? { accent: onDark, 'accent-ink': onDark } : {}), ...dark };
  const lightTokens = { ...NEUTRAL.light, ...light };
  const out = [
    block(':root', light),
    `:root{--pattern:${patternUrl(theme.pattern)}}`,
    block(':root[data-theme=dark]', darkTokens),
  ];
  if (defaultTheme(theme) === 'dark') {
    const reset = Object.fromEntries([...new Set([...Object.keys(lightTokens), ...Object.keys(darkTokens)])]
      .map(k => [k, lightTokens[k] ?? 'initial']));
    const decl = block(':root[data-theme=dark]:not([data-theme-lock])', reset).replace(/\}$/, ';color-scheme:light}');
    out.push(`@media (prefers-color-scheme:light){${decl}}`);
  }
  return out.filter(Boolean).join('\n');
}

export function siteCss(root, site) {
  return site._css ??= [baseCss(root), '/* site tokens */', tokensCss(site.theme), site.theme.css ? `/* themes/${site.theme.id}/style.css */\n${site.theme.css}` : ''].filter(Boolean).join('\n');
}

export const TOGGLE_JS = path.join(ENGINE_ROOT, 'engine/templates/theme-toggle.js');
