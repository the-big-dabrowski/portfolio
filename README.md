# portfolio
Portfolio that aims at showcasing my skills in mainly frontend development but also UX design.

## Kom igång

```bash
npm install
npm run dev      # bygger om CSS vid varje sparning
npm run build    # kontrollerar tokens och bygger komprimerad CSS
```

SCSS-filerna ligger i `scss/` och följer 7-1-mönstret med BEM-namngivning.

## Design tokens från Figma

Figma ([Frontend → portfolio](https://www.figma.com/design/OyHcWR2OqbFhKriD3fOpIv/Frontend?node-id=252-28)) är källan för
palett, avstånd, radier, brytpunkter, temafärger (ljust/mörkt), textstilar och skuggor.

```
Figma  →  design-tokens/figma-tokens.json  →  scss/abstracts/_figma-tokens.scss
        (export)                       (npm run tokens)
```

1. **Exportera från Figma** – på något av två sätt:
   - Be Claude "synka tokens från Figma", eller
   - kör det lokala pluginet: `npm run figma-plugin:build`, sedan i Figma desktop
     *Plugins → Development → Import plugin from manifest…* och välj `figma-plugin/manifest.json`.
     Kör *Portfolio – Exportera tokens* och spara filen som `design-tokens/figma-tokens.json`.
2. **Generera SCSS:** `npm run tokens`
3. **Bygg:** `npm run build` (avbryter om SCSS-filen inte matchar exporten)

Redigera aldrig `_figma-tokens.scss` för hand. Det som inte finns i Figma (typsnittsstack,
z-index, animationer) ligger i `scss/abstracts/_tokens.scss`.

**Namnregler i Figma** som skriptet förlitar sig på:

| Figma | SCSS |
| --- | --- |
| Variabler `color/<färg>/<nyans>` i *Primitives* | `$colors`, `palette('blue', 500)` |
| `space/*`, `radius/*`, `layout/*` | `$spacing`, `$radii`, `$breakpoints`, `$container-max-width` |
| Samlingarna *Theme Light* / *Theme Dark* | `$theme-light` / `$theme-dark` → `--color-*` |
| Textstilar `Mobile/<Grupp>/<Namn>` + `Desktop/…` | `@include text-style('grupp-namn')` |
| Effektstilar `shadow/*` | `shadow('sm')` |
