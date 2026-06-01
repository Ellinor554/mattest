export class ClockEngine {
    #totalMinutes = 10 * 60 + 10; // default 10:10
    #listeners = new Set();

    /** Add or subtract minutes (can be fractional during drag). */
    adjustTime(deltaMins) {
        this.#totalMinutes += deltaMins;
        this.#emit();
    }

    /** Set time from integer hours (0–23) and minutes (0–59). */
    setTime(hours, mins) {
        this.#totalMinutes = hours * 60 + mins;
        this.#emit();
    }

    /** Set raw floating-point total minutes (used during drag for smooth rotation). */
    setTotalMinutesFloat(v) {
        this.#totalMinutes = v;
        this.#emit();
    }

    /** Return the current raw float value (needed by drag logic). */
    getTotalMinutesFloat() {
        return this.#totalMinutes;
    }

    /** Round totalMinutes to nearest whole minute and emit. */
    snapToMinutes() {
        this.#totalMinutes = Math.round(this.#totalMinutes);
        this.#emit();
    }

    /** Return a frozen reading snapshot. hours24 is 0–23, hours12 is 1–12. */
    getReading() {
        const total    = ((Math.round(this.#totalMinutes) % 1440) + 1440) % 1440;
        const hours24  = Math.floor(total / 60);
        const minutes  = total % 60;
        return Object.freeze({
            hours24,
            hours12: hours24 % 12 || 12,
            minutes,
            isAm: hours24 < 12,
            isPm: hours24 >= 12,
        });
    }

    /**
     * Subscribe to clock changes. Listener is called immediately with the current reading.
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
