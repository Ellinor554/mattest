export class EventBus {
    #listeners = new Map();
    on(event, handler) {
        if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
        this.#listeners.get(event).add(handler);
        return () => this.#listeners.get(event)?.delete(handler);
    }
    emit(event, data) {
        this.#listeners.get(event)?.forEach(h => {
            try { h(data); } catch (err) { console.error(`EventBus handler error on "${event}":`, err); }
        });
    }
}
export const bus = new EventBus();
