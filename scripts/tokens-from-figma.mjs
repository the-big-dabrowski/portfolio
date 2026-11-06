#!/usr/bin/env node
// =============================================================================
// Figma → SCSS
// Läser design-tokens/figma-tokens.json (exporterad från Figma) och skriver
// scss/abstracts/_figma-tokens.scss.
//
//   npm run tokens          generera SCSS-filen
//   npm run tokens:check    avbryt med fel om SCSS-filen inte matchar JSON
// =============================================================================
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(root, 'design-tokens/figma-tokens.json');
const TARGET = resolve(root, 'scss/abstracts/_figma-tokens.scss');
const BASE_FONT_SIZE = 16;
const checkOnly = process.argv.includes('--check');

const fail = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};

if (!existsSync(SOURCE)) fail(`Hittar inte ${relative(root, SOURCE)}. Exportera tokens från Figma först.`);
const tokens = JSON.parse(readFileSync(SOURCE, 'utf8'));

// --- Hjälpfunktioner ----------------------------------------------------------
const num = (n) => String(Math.round(n * 10000) / 10000);
const rem = (px) => (px === 0 ? '0' : `${num(px / BASE_FONT_SIZE)}rem`);
const em = (px) => `${num(px / BASE_FONT_SIZE)}em`;
const key = (k) => (/^\d+$/.test(k) ? k : `'${k}'`);
const entries = (group, name) => {
  if (!group || typeof group !== 'object') fail(`Gruppen "${name}" saknas i JSON-filen.`);
  return Object.entries(group).filter(([k]) => !k.startsWith('$'));
};
// Sorterar numeriska nycklar (0, 50, 100 …) i stigande ordning.
const sorted = (list) =>
  list.sort(([a], [b]) => (/^\d+$/.test(a) && /^\d+$/.test(b) ? a - b : 0));

/** Löser upp alias som "{color.neutral.0}" till sitt slutvärde. */
const resolveRef = (value, seen = new Set()) => {
  const m = typeof value === 'string' && value.match(/^\{(.+)\}$/);
  if (!m) return value;
  if (seen.has(m[1])) fail(`Cirkulärt alias: ${m[1]}`);
  seen.add(m[1]);
  const token = m[1].split('.').reduce((o, k) => o?.[k], tokens);
  if (!token || !('$value' in token)) fail(`Alias pekar på något som inte finns: ${value}`);
  return resolveRef(token.$value, seen);
};

const map = (name, rows, comment) => {
  const body = rows.map(([k, v, note]) => `  ${key(k)}: ${v},${note ? ` // ${note}` : ''}`).join('\n');
  return `${comment ? `// ${comment}\n` : ''}$${name}: (\n${body}\n);\n`;
};

// --- Färger -------------------------------------------------------------------
const colorBlocks = entries(tokens.color, 'color').map(([family, scale]) => {
  const shades = sorted(entries(scale, `color.${family}`)).map(([shade, t]) => `    ${shade}: ${t.$value},`);
  return `  '${family}': (\n${shades.join('\n')}\n  ),`;
});
const colors = `// Palett (Figma: Primitives → color/*)\n$colors: (\n${colorBlocks.join('\n')}\n);\n`;

// --- Avstånd, radier, brytpunkter ----------------------------------------------
const spacing = map(
  'spacing',
  sorted(entries(tokens.space, 'space')).map(([k, t]) => [k, rem(t.$value), `${t.$value}px`]),
  'Avstånd (Figma: Primitives → space/*)',
);
const radii = map(
  'radii',
  entries(tokens.radius, 'radius').map(([k, t]) => [k, t.$value >= 999 ? `${t.$value}px` : rem(t.$value), `${t.$value}px`]),
  'Hörnradier (Figma: Primitives → radius/*)',
);
const layout = entries(tokens.layout, 'layout');
const breakpoints = map(
  'breakpoints',
  layout.filter(([k]) => k !== 'container-max').map(([k, t]) => [k, em(t.$value), `${t.$value}px`]),
  'Brytpunkter, mobile first (Figma: Primitives → layout/*)',
);
const containerToken = layout.find(([k]) => k === 'container-max');
if (!containerToken) fail('Saknar layout/container-max i Figma.');
const container = `$container-max-width: ${rem(containerToken[1].$value)}; // ${containerToken[1].$value}px\n`;

// --- Teman --------------------------------------------------------------------
const themes = entries(tokens.theme, 'theme');
if (!themes.some(([k]) => k === 'light')) fail('Saknar tema "light" (Figma-samlingen "Theme Light").');
const themeMaps = themes
  .map(([name, group]) =>
    map(
      `theme-${name}`,
      entries(group, `theme.${name}`).map(([k, t]) => [
        k,
        resolveRef(t.$value),
        typeof t.$value === 'string' && t.$value.startsWith('{') ? t.$value.slice(1, -1).replace(/^color\./, '').replace('.', '/') : '',
      ]),
      `Semantiska färger, tema "${name}" → CSS-variabler --color-*`,
    ),
  )
  .join('\n');

// --- Typografi ----------------------------------------------------------------
const textStyles = entries(tokens.typography, 'typography').map(([name, bps]) => {
  const mobile = bps.mobile?.$value;
  const desktop = bps.desktop?.$value;
  if (!mobile || !desktop) fail(`Textstilen "${name}" behöver både Mobile/ och Desktop/ i Figma.`);
  for (const prop of ['fontWeight', 'lineHeight', 'letterSpacing', 'textCase']) {
    if (mobile[prop] !== desktop[prop]) {
      console.warn(`⚠ ${name}: ${prop} skiljer sig mellan mobil (${mobile[prop]}) och desktop (${desktop[prop]}). Använder mobilens värde.`);
    }
  }
  const props = [
    `'mobile': ${rem(mobile.fontSize)}`,
    `'desktop': ${rem(desktop.fontSize)}`,
    `'weight': ${mobile.fontWeight}`,
    `'line-height': ${typeof mobile.lineHeight === 'number' ? num(mobile.lineHeight) : 'normal'}`,
    `'letter-spacing': ${mobile.letterSpacing ? `${num(mobile.letterSpacing)}em` : 0}`,
    `'text-case': ${mobile.textCase || 'none'}`,
  ];
  return `  '${name}': (${props.join(', ')}),`;
});
const typography = `// Textstilar (Figma: Mobile/* och Desktop/*). Används med @include text-style('namn').\n// Typsnittet styrs av $font-family-* i _tokens.scss, inte av Figma.\n$text-styles: (\n${textStyles.join('\n')}\n);\n`;

// --- Skuggor ------------------------------------------------------------------
const shadows = map(
  'shadows',
  entries(tokens.shadow, 'shadow').map(([k, t]) => [
    k,
    t.$value.map((s) => `${s.offsetX}px ${s.offsetY}px ${s.blur}px${s.spread ? ` ${s.spread}px` : ''} ${s.color}`.replace(/(^|\s)0px/g, '$10')).join(', '),
  ]),
  'Skuggor (Figma: effektstilar shadow/*)',
);

// --- Skriv fil ----------------------------------------------------------------
const meta = tokens.$meta ?? {};
const output = `// =============================================================================
// GENERERAD FIL – redigera inte för hand.
// Källa: Figma${meta.fileKey ? ` (fil ${meta.fileKey})` : ''}, exporterad ${meta.exportedAt ?? 'okänt datum'}.
// Ändra i Figma, exportera till design-tokens/figma-tokens.json och kör \`npm run tokens\`.
// =============================================================================

${colors}
${spacing}
${radii}
${breakpoints}
${container}
${themeMaps}
${typography}
${shadows}`;

const current = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : '';
if (checkOnly) {
  if (current !== output) fail(`${relative(root, TARGET)} är inte i synk med Figma-exporten. Kör \`npm run tokens\`.`);
  console.log('✔ SCSS-tokens är i synk med Figma-exporten.');
} else if (current === output) {
  console.log('✔ Inga ändringar – SCSS-tokens matchar redan Figma.');
} else {
  writeFileSync(TARGET, output);
  console.log(`✔ Skrev ${relative(root, TARGET)} (${themes.length} teman, ${textStyles.length} textstilar).`);
}
