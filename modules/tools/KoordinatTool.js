import { KoordinatEngine } from './KoordinatEngine.js';
import { KoordinatView } from './KoordinatView.js';

export const KoordinatTool = {
    id: 'koordinat',
    title: 'Koordinatsystem',
    mount(parentEl) {
        const engine = new KoordinatEngine();
        const view = new KoordinatView(engine);
        const root = view.mount(parentEl);
        this._view = view;
        return root;
    },
    onEnter() { this._view?.render(); },
    onResize() { this._view?.render(); },
};
