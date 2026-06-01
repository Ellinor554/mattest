// ═══════════════════════════════════════════════════════════════════════════
// modules/tools/PosSystemTool.js
// Lazy assembly. Engine/view created on first mount() (inside DOMContentLoaded).
// ═══════════════════════════════════════════════════════════════════════════

import { PosSystemEngine } from './PosSystemEngine.js';
import { PosSystemView }   from './PosSystemView.js';

let engine = null;
let view   = null;

function ensureBuilt() {
    if (!engine) {
        engine = new PosSystemEngine();
        view   = new PosSystemView(engine);
    }
}

export const PosSystemTool = {
    id:    'positionssystem',
    title: '<i class="fas fa-cubes text-soft-blue mr-2"></i>Positionssystemet',

    mount(parent) {
        ensureBuilt();
        return view.mount(parent);
    },
    onEnter() { view?.onEnter(); },
    onLeave() { view?.onLeave(); },
};
