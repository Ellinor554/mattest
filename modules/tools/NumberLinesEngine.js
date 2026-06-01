export class NumberLinesEngine {
    #min           = 0;
    #max           = 10;
    #step          = 1;
    #decimalPlaces = 0;
    #currentValue  = 0;
    #listeners     = new Set();

    /**
     * Set number line range and reset current value to min.
     * Accepts legacy boolean for decimalPlaces (true → 1, false → 0).
     */
    setRange(min, max, step, decimalPlaces = 0) {
        if (decimalPlaces === true)  decimalPlaces = 1;
        if (decimalPlaces === false) decimalPlaces = 0;
        this.#min           = min;
        this.#max           = max;
        this.#step          = step;
        this.#decimalPlaces = decimalPlaces;
        this.#currentValue  = min;
        this.#emit();
    }

    /** Snap val to the nearest grid point and store it. */
    setValue(val) {
        const numTicks  = Math.round((this.#max - this.#min) / this.#step);
        const tickIndex = Math.round((val - this.#min) / this.#step);
        const clamped   = Math.max(0, Math.min(numTicks, tickIndex));
        this.#currentValue = parseFloat((this.#min + clamped * this.#step).toFixed(10));
        this.#emit();
    }

    /** Return a frozen snapshot of the current state. */
    getState() {
        return Object.freeze({
            min:           this.#min,
            max:           this.#max,
            step:          this.#step,
            decimalPlaces: this.#decimalPlaces,
            currentValue:  this.#currentValue,
        });
    }

    /**
     * Subscribe to state changes. Listener is called immediately.
     * @returns {() => void} unsubscribe function
     */
    subscribe(listener) {
        this.#listeners.add(listener);
        listener(this.getState());
        return () => this.#listeners.delete(listener);
    }

    #emit() {
        const s = this.getState();
        for (const l of this.#listeners) l(s);
    }
}
