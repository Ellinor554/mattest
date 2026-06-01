// ═══════════════════════════════════════════════════════════════════════════
// modules/tools/ScaleTool.js
//
// Lazy assembly — the engine and view are only created the first time
// `mount()` is called (which happens inside DOMContentLoaded), not at
// module-import time. This matches the lifecycle of the agent's other
// factory-built tools and avoids running constructors before the DOM
// is ready.
// ═══════════════════════════════════════════════════════════════════════════

import { ScaleEngine } from './ScaleEngine.js';
import { ScaleView }   from './ScaleView.js';

let engine = null;
let view   = null;

function ensureBuilt() {
    if (!engine) {
        engine = new ScaleEngine();
        view   = new ScaleView(engine);
    }
}

export const ScaleTool = {
    id:    'scale',
    title: '<i class="fas fa-ruler-combined text-soft-blue mr-2"></i>Skala och mått',

    mount(parent) {
        ensureBuilt();
        return view.mount(parent);
    },
    onEnter() { view?.onEnter(); },
    onLeave() { view?.onLeave(); },
};
