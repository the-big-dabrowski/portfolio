// =============================================================================
// Exporterar variabler, textstilar och skuggstilar från Figma-filen till JSON.
// Används av pluginet (code.js) och kan köras direkt via Figma MCP (use_figma).
// Formatet följer W3C Design Tokens ($type/$value) med alias som "{color.neutral.0}".
// =============================================================================
async function exportTokens() {
  const WEIGHTS = {
    Thin: 100, Ultralight: 200, 'Extra Light': 200, Light: 300, Regular: 400,
    Medium: 500, Semibold: 600, 'Semi Bold': 600, Bold: 700, Heavy: 800,
    'Extra Bold': 800, Black: 900,
  };
  const hex = ({ r, g, b }) =>
    '#' + [r, g, b].map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
  const round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
  const slug = (s) => s.trim().toLowerCase().replace(/\s+/g, '-');
  const setPath = (obj, path, value) => {
    let o = obj;
    path.slice(0, -1).forEach((k) => (o = o[k] ??= {}));
    o[path.at(-1)] = value;
  };

  let fileKey = null;
  try { fileKey = figma.fileKey ?? null; } catch (e) { /* bara för privata plugins */ }

  const tokens = {
    $meta: { fileKey, fileName: figma.root.name, exportedAt: new Date().toISOString() },
    color: {}, space: {}, radius: {}, layout: {}, theme: {}, typography: {}, shadow: {},
  };

  // --- Variabler ---------------------------------------------------------------
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const vars = {};
  for (const c of collections) {
    for (const id of c.variableIds) vars[id] = await figma.variables.getVariableByIdAsync(id);
  }
  const toValue = (v, raw) => {
    if (raw && raw.type === 'VARIABLE_ALIAS') {
      const target = vars[raw.id];
      return target ? `{${target.name.split('/').join('.')}}` : null;
    }
    if (v.resolvedType === 'COLOR') return hex(raw);
    return raw;
  };
  const typeOf = (v) => (v.resolvedType === 'COLOR' ? 'color' : v.resolvedType === 'FLOAT' ? 'dimension' : 'string');

  for (const c of collections) {
    const isTheme = /^theme/i.test(c.name);
    for (const mode of c.modes) {
      // "Theme Light" (1 läge) → theme.light, "Theme" med lägen Light/Dark → theme.light / theme.dark
      const themeKey = c.modes.length > 1 ? slug(mode.name) : slug(c.name.replace(/^theme\s*/i, '') || mode.name);
      for (const id of c.variableIds) {
        const v = vars[id];
        const token = { $type: typeOf(v), $value: toValue(v, v.valuesByMode[mode.modeId]) };
        if (v.description) token.$description = v.description;
        const parts = v.name.split('/');
        if (isTheme) setPath(tokens.theme, [themeKey, ...parts.slice(parts[0] === 'color' ? 1 : 0)], token);
        else setPath(tokens, parts, token);
      }
    }
  }

  // --- Textstilar: "Mobile/Heading/H1" → typography["heading-h1"].mobile ---------
  for (const s of await figma.getLocalTextStylesAsync()) {
    const [bp, ...rest] = s.name.split('/');
    const name = rest.map(slug).join('-');
    const lh = s.lineHeight;
    const ls = s.letterSpacing;
    setPath(tokens.typography, [name, slug(bp)], {
      $type: 'typography',
      $value: {
        fontFamily: s.fontName.family,
        fontWeight: WEIGHTS[s.fontName.style] ?? 400,
        fontSize: s.fontSize,
        lineHeight: lh.unit === 'PERCENT' ? round(lh.value / 100) : lh.unit === 'PIXELS' ? round(lh.value / s.fontSize) : 'normal',
        letterSpacing: round(ls.unit === 'PERCENT' ? ls.value / 100 : ls.value / s.fontSize), // i em
        textCase: s.textCase === 'UPPER' ? 'uppercase' : s.textCase === 'LOWER' ? 'lowercase' : 'none',
      },
    });
  }

  // --- Skuggstilar: "shadow/sm" → shadow.sm ------------------------------------
  for (const s of await figma.getLocalEffectStylesAsync()) {
    const parts = s.name.split('/');
    const layers = s.effects
      .filter((e) => e.type === 'DROP_SHADOW' && e.visible !== false)
      .map((e) => ({
        offsetX: e.offset.x, offsetY: e.offset.y, blur: e.radius, spread: e.spread ?? 0,
        color: `rgb(${Math.round(e.color.r * 255)} ${Math.round(e.color.g * 255)} ${Math.round(e.color.b * 255)} / ${+e.color.a.toFixed(3)})`,
      }));
    setPath(tokens.shadow, parts.slice(parts[0] === 'shadow' ? 1 : 0), { $type: 'shadow', $value: layers });
  }

  return tokens;
}
