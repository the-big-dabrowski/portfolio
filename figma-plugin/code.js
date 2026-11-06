// Plugin-ingång. exportTokens() kommer från export-tokens.js (läggs in vid build).
figma.showUI(__html__, { width: 440, height: 420, themeColors: true });
exportTokens()
  .then((tokens) => figma.ui.postMessage({ type: 'tokens', tokens }))
  .catch((err) => figma.ui.postMessage({ type: 'error', message: String(err) }));
