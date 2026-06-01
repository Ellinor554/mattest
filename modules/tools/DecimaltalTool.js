import { DecimaltalEngine } from './DecimaltalEngine.js';
import { DecimaltalView } from './DecimaltalView.js';

export const DecimaltalTool = {
    id: 'decimaltal',
    title: 'Decimaltal',
    mount(parentEl) {
        const engine = new DecimaltalEngine();
        const view = new DecimaltalView(engine);
        const root = view.mount(parentEl);
        this._view = view;
        return root;
    },
    onEnter() { this._view?.onEnter(); },
};
