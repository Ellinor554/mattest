# Refactor Notes – Matematikutforskaren Modular ES-Module Structure

## Tool Status

| Tool | ID | Status | Notes |
|------|----|--------|-------|
| Home | `home` | ✅ Migrated | 11 cards, exact Swedish text/icons preserved |
| Volym | `volym` | ✅ Migrated | VolumeEngine (pure) + VolumeView, beaker fill, digit repr boxes |
| Klockan | `clock` | ✅ Migrated | ClockEngine + ClockView; drag init deferred to onEnter |
| Tallinjer | `numberlines` | ✅ Migrated | NumberLinesEngine + NumberLinesView; preset + custom range |
| Bråk | `fractions` | ✅ Migrated | FractionsEngine + FractionsView; slice pull-out drag preserved |
| Geometri | `geometry` | ✅ Migrated | GeometryEngine + GeometryView; Three.js via window.THREE global |
| Räkning | `counting` | ✅ Migrated | CountingEngine + CountingView; ten-friends balls on document.body |
| Statistik | `statistics` | ✅ Migrated | StatisticsEngine (localStorage) + StatisticsView; bar/line/pie |
| Koordinatsystem | `koordinat` | ✅ Migrated | KoordinatEngine + KoordinatView; click-to-add, drag points |
| Positionssystemet | `positionssystem` | ✅ Migrated | PosSystemEngine + PosSystemView; place-value drag blocks |
| Decimaltal | `decimaltal` | ✅ Migrated | DecimaltalEngine + DecimaltalView; animated tokens, number line |
| Skala och mått | `scale` | ✅ Migrated | ScaleEngine + ScaleView; canvas drawing, dimension lines |

## Architecture

```
index.html                  ← lean shell (header, <main id="tool-mount">, one module script)
styles.css                  ← all custom CSS extracted from original <style> block
modules/
  main.js                   ← entry point: instantiate registry, register tools
  core/
    EventBus.js             ← pub/sub with error-isolated handlers
    AppState.js             ← single source of truth for active tool
    ToolRegistry.js         ← mounts/unmounts tool views; manages header chrome
    ToolContract.js         ← JSDoc typedef for ToolModule shape
  tools/
    HomeTool.js             ← landing screen (11 cards)
    VolumeEngine.js / VolumeView.js / VolumeTool.js
    ClockEngine.js / ClockView.js / ClockTool.js
    NumberLinesEngine.js / NumberLinesView.js / NumberLinesTool.js
    FractionsEngine.js / FractionsView.js / FractionsTool.js
    GeometryEngine.js / GeometryView.js / GeometryTool.js
    CountingEngine.js / CountingView.js / CountingTool.js
    StatisticsEngine.js / StatisticsView.js / StatisticsTool.js
    KoordinatEngine.js / KoordinatView.js / KoordinatTool.js
    PosSystemEngine.js / PosSystemView.js / PosSystemTool.js
    DecimaltalEngine.js / DecimaltalView.js / DecimaltalTool.js
    ScaleEngine.js / ScaleView.js / ScaleTool.js
```

## Judgment Calls

1. **DecimaltalTool / KoordinatTool / ScaleTool / PosSystemTool** — exported as singleton objects (`export const Xxx = { id, mount, ... }`) rather than factory functions to avoid re-creating engine state on every mount. The view and engine are created fresh each time `mount()` is called.

2. **Counting ten-friends balls** — balls still append to `document.body` (same as original) since they use absolute viewport-relative positioning. Cleanup is handled in `CountingView.cleanup()` tracked via `this.#balls` array.

3. **Three.js** — accessed via `window.THREE` global (CDN loaded in index.html as a classic script before the module script). No import statement used for THREE.

4. **Clock drag init** — deferred to `onEnter()` because `svg.getScreenCTM()` requires the SVG to be laid out and visible.

5. **Statistics localStorage key** — preserved as `'matematikutforskaren_stats'` exactly.

6. **Fullscreen** — the "Helskärm" button in the header (built by ToolRegistry) calls `document.documentElement.requestFullscreen()`. The original per-view floating float panels for fullscreen/sidebar toggle are not included in this refactor (they were presentation-mode helpers in the original).

## Known Issues / Limitations

- The presentation/float-panel mode (the floating sidebar-toggle button that appeared in fullscreen) is not carried over — each tool's view includes its sidebar as a normal sidebar layout.
- The geometry formula "presentation overlay" (geoEdu_ expand mode) may need testing after modularisation.
- LocalStorage for statistics is preserved; no other tools used localStorage in the original.

## Original preserved as

`index-old.html` — the complete original 6021-line monolithic file, accessible via GitHub Pages at `/index-old.html`.
