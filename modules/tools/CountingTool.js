import { CountingEngine } from './CountingEngine.js';
import { CountingView }   from './CountingView.js';

export function createCountingTool() {
    const engine = new CountingEngine();
    const view   = new CountingView(engine);

    return {
        id:    'counting',
        title: '<i class="fas fa-calculator text-soft-yellowDark mr-2"></i>Räkning',

        mount(parent) { return view.mount(parent); },
        onEnter()     { view.onEnter(); },
        onLeave()     { view.onLeave(); },

        _engine: engine,
        _view:   view,
    };
}
