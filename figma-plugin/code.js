// Plugin-ingång. exportTokens() kommer från export-tokens.js (läggs in vid build).
// Portfolions variabler och stilar har prefixet "Portfolio" i Figma-filen.
const TOKEN_PREFIX = 'Portfolio';

figma.showUI(__html__, { width: 440, height: 420, themeColors: true });
exportTokens({ prefix: TOKEN_PREFIX })
  .then((tokens) => figma.ui.postMessage({ type: 'tokens', tokens }))
  .catch((err) => figma.ui.postMessage({ type: 'error', message: String(err) }));
