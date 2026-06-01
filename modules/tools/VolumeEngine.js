export class VolumeEngine {
    #totalMl = 0;
    #listeners = new Set();

    /** Add millilitres (capped at 9 999 ml total). */
    addLiquid(amountMl) {
        this.#totalMl = Math.min(9999, this.#totalMl + amountMl);
        this.#emit();
    }

    /** Empty the container. */
    empty() {
        this.#totalMl = 0;
        this.#emit();
    }

    /** Return a frozen snapshot of the current reading. */
    getReading() {
        const t = this.#totalMl;
        return Object.freeze({
            totalMl:     t,
            liters:      Math.floor(t / 1000),
            deciliters:  Math.floor((t % 1000) / 100),
            centiliters: Math.floor((t % 100) / 10),
            milliliters: t % 10,
            isEmpty:     t === 0,
        });
    }

    /**
     * Subscribe to reading changes.
     * The listener is called immediately with the current reading.
     * @param {(reading: ReturnType<VolumeEngine['getReading']>) => void} listener
     * @returns {() => void} unsubscribe function
     */
    subscribe(listener) {
        this.#listeners.add(listener);
        listener(this.getReading());
        return () => this.#listeners.delete(listener);
    }

    #emit() {
        const r = this.getReading();
        for (const l of this.#listeners) l(r);
    }
}
