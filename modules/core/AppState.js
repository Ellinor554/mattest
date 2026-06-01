import { bus } from './EventBus.js';
export class AppState {
    #activeTool = null;
    getActiveTool() { return this.#activeTool; }
    setActiveTool(id) {
        const prev = this.#activeTool;
        if (prev === id) return;
        bus.emit('tool:deactivated', { id: prev });
        this.#activeTool = id;
        bus.emit('tool:activated', { id });
    }
}
export const appState = new AppState();
