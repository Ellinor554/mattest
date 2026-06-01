// ═══════════════════════════════════════════════════════════════════════════
// modules/tools/GeometryTool.js
// Stage 1 — factory export matching main.js's createGeometryTool() style.
// ═══════════════════════════════════════════════════════════════════════════

import { GeometryEngine } from './GeometryEngine.js';
import { GeometryView }   from './GeometryView.js';

export function createGeometryTool() {
    const engine = new GeometryEngine();
    const view   = new GeometryView(engine);

    return {
        id:    'geometry',
        title: '<i class="fas fa-draw-polygon text-soft-green mr-2"></i>Geometri',

        mount(parent) { return view.mount(parent); },
        onEnter()     { view.onEnter(); },
        onLeave()     { view.onLeave(); },

        _engine: engine,
        _view:   view,
    };
}
