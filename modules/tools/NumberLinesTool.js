import { NumberLinesEngine } from './NumberLinesEngine.js';
import { NumberLinesView }   from './NumberLinesView.js';

export function createNumberLinesTool() {
    const engine = new NumberLinesEngine();
    const view   = new NumberLinesView(engine);

    return {
        id:    'numberlines',
        title: '<i class="fas fa-ruler-horizontal mr-2"></i> Tallinjer',

        mount(parentEl) {
            return view.mount(parentEl);
        },

        onLeave() {
            view.unmount();
        },
    };
}
