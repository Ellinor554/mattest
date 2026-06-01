export class FractionsEngine {
    #showDecimal = false;
    #showPercent = false;
    #listeners   = new Set();

    setShowDecimal(bool) {
        this.#showDecimal = !!bool;
        this.#emit();
    }

    setShowPercent(bool) {
        this.#showPercent = !!bool;
        this.#emit();
    }

    getOptions() {
        return Object.freeze({
            showDecimal: this.#showDecimal,
            showPercent: this.#showPercent,
        });
    }

    /**
     * Subscribe to options changes. Listener is called immediately.
     * @returns {() => void} unsubscribe function
     */
    subscribe(listener) {
        this.#listeners.add(listener);
        listener(this.getOptions());
        return () => this.#listeners.delete(listener);
    }

    #emit() {
        const opts = this.getOptions();
        for (const l of this.#listeners) l(opts);
    }
}
