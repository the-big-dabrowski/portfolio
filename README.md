# portfolio
Landningssida för mina projekt inom frontend och UX. Varje projekt får ett kort med bild,
beskrivning, tekniker och länk. Första projektet är Hissläget.

## Lägg till ett projekt

1. Lägg projektets bild i `resources/projects/`.
2. Kopiera ett `<li class="grid__item">` med en `project-card` i `index.html` och byt
   bild, titel, text, taggar och länk.

## Kom igång

```bash
npm install
npm run dev      # bygger om CSS vid varje sparning
npm run build    # kontrollerar tokens och bygger komprimerad CSS
```

SCSS-filerna ligger i `scss/` och följer 7-1-mönstret med BEM-namngivning.

## Design tokens från Figma

Figma ([Frontend → Portfolio (landningssida)](https://www.figma.com/design/OyHcWR2OqbFhKriD3fOpIv/Frontend?node-id=318-28)) är källan för
palett, avstånd, radier, brytpunkter, temafärger (ljust/mörkt), textstilar och skuggor.

Figma-filen delas med Hissläget. Portfolions variabler och stilar har därför prefixet
`Portfolio` (samlingarna *Portfolio Primitives*, *Portfolio Theme Light* och
*Portfolio Theme Dark*, stilarna `Portfolio/…`). Exporten läser bara dem.

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
| Variabler `color/<färg>/<nyans>` i *Portfolio Primitives* | `$colors`, `palette('brand', 500)` |
| `space/*`, `radius/*`, `layout/*` | `$spacing`, `$radii`, `$breakpoints`, `$container-max-width` |
| Samlingarna *Portfolio Theme Light* / *Portfolio Theme Dark* | `$theme-light` / `$theme-dark` → `--color-*` |
| Textstilar `Portfolio/Mobile/<Grupp>/<Namn>` + `Portfolio/Desktop/…` | `@include text-style('grupp-namn')` |
| Effektstilar `Portfolio/shadow/*` | `shadow('sm')` |
