import { FractionsEngine } from './FractionsEngine.js';
import { FractionsView }   from './FractionsView.js';

export function createFractionsTool() {
    const engine = new FractionsEngine();
    const view   = new FractionsView(engine);

    return {
        id:    'fractions',
        title: '<i class="fas fa-circle-notch mr-2"></i> Bråk',

        mount(parentEl) {
            return view.mount(parentEl);
        },

        onLeave() {
            view.unmount();
        },
    };
}
