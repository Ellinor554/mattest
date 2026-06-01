const KOORD_COLORS = ['#5b80a5','#a85c72','#4f7c75','#b8a36e','#938db3','#d58b99','#3d8a8a','#8db1d1'];

export class KoordinatEngine {
    #mode = 'q1';
    #points = [];
    #showGrid = true;
    #showLabels = true;
    #nextId = 1;
    #listeners = [];

    getRange() {
        return this.#mode === 'q1' ? { min: 0, max: 10 } : { min: -10, max: 10 };
    }

    getMode() { return this.#mode; }

    setMode(mode) {
        this.#mode = mode;
        const { min, max } = this.getRange();
        this.#points = this.#points.filter(p => p.x >= min && p.x <= max && p.y >= min && p.y <= max);
        this.#notify();
    }

    addPoint(x, y, label) {
        const { min, max } = this.getRange();
        if (x < min || x > max || y < min || y > max) return null;
        const idx = this.#points.length;
        const color = KOORD_COLORS[idx % KOORD_COLORS.length];
        const pt = { x, y, label, id: this.#nextId++, color };
        this.#points.push(pt);
        this.#notify();
        return pt;
    }

    removePoint(id) {
        this.#points = this.#points.filter(p => p.id !== id);
        this.#notify();
    }

    movePoint(id, x, y) {
        const pt = this.#points.find(p => p.id === id);
        if (pt && (pt.x !== x || pt.y !== y)) { pt.x = x; pt.y = y; this.#notify(); }
    }

    clearPoints() {
        this.#points = [];
        this.#nextId = 1;
        this.#notify();
    }

    setShowGrid(bool) { this.#showGrid = bool; this.#notify(); }
    setShowLabels(bool) { this.#showLabels = bool; this.#notify(); }

    getState() {
        return {
            mode: this.#mode,
            points: this.#points.map(p => ({ ...p })),
            showGrid: this.#showGrid,
            showLabels: this.#showLabels,
        };
    }

    nextAutoLabel() {
        const used = new Set(this.#points.map(p => p.label));
        for (let i = 0; i < 26; i++) {
            const lbl = String.fromCharCode(65 + (this.#nextId - 1 + i) % 26);
            if (!used.has(lbl)) return lbl;
        }
        let n = 1;
        while (used.has(`P${n}`)) n++;
        return `P${n}`;
    }

    subscribe(listener) {
        this.#listeners.push(listener);
        return () => { this.#listeners = this.#listeners.filter(l => l !== listener); };
    }

    #notify() { this.#listeners.forEach(l => l()); }
}
