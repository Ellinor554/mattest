const STORAGE_KEY = 'matematikutforskaren_stats';

const DEFAULT_ROWS = [
    { label: 'Röd',  value: 4 },
    { label: 'Grön', value: 7 },
    { label: 'Blå',  value: 3 },
    { label: 'Gul',  value: 5 },
];

const DEFAULT_COLORS = ['#5b80a5','#a85c72','#4f7c75','#dec894','#938db3','#d58b99','#8bb39c','#8db1d1'];

export class StatisticsEngine {
    #data        = [];
    #chartType   = 'bar';
    #title       = 'Mitt diagram';
    #pieDisplay  = 'procent';   // 'antal' | 'andel' | 'procent'
    #listeners   = [];

    constructor() {
        this.#load();
    }

    // ── public API ────────────────────────────────────────────────────────────
    getData()                { return this.#data.map(r => ({ ...r })); }
    getChartType()           { return this.#chartType; }
    getTitle()               { return this.#title; }
    getPieDisplay()          { return this.#pieDisplay; }

    setChartType(type) {
        this.#chartType = type;
        this.#save();
        this.#notify();
    }

    setTitle(t) {
        this.#title = t;
        this.#save();
        this.#notify();
    }

    setPieDisplay(mode) {
        if (!['antal', 'andel', 'procent'].includes(mode)) return;
        this.#pieDisplay = mode;
        this.#save();
        this.#notify();
    }

    setRow(index, partial) {
        if (index < 0 || index >= this.#data.length) return;
        Object.assign(this.#data[index], partial);
        this.#save();
        this.#notify();
    }

    addRow() {
        const idx   = this.#data.length;
        this.#data.push({
            label: `Kategori ${idx + 1}`,
            value: Math.floor(Math.random() * 8) + 1,
            color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
        });
        this.#save();
        this.#notify();
    }

    removeRow(index) {
        if (this.#data.length <= 1) return;
        this.#data.splice(index, 1);
        this.#save();
        this.#notify();
    }

    subscribe(listener) {
        this.#listeners.push(listener);
        return () => { this.#listeners = this.#listeners.filter(l => l !== listener); };
    }

    // ── persistence ───────────────────────────────────────────────────────────
    #save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                data:       this.#data,
                chartType:  this.#chartType,
                title:      this.#title,
                pieDisplay: this.#pieDisplay,
            }));
        } catch (_) { /* ignore */ }
    }

    #load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.#data       = parsed.data       || this.#makeDefaults();
                this.#chartType  = parsed.chartType  || 'bar';
                this.#title      = parsed.title      || 'Mitt diagram';
                this.#pieDisplay = parsed.pieDisplay || 'procent';
                return;
            }
        } catch (_) { /* ignore */ }
        this.#data = this.#makeDefaults();
    }

    #makeDefaults() {
        return DEFAULT_ROWS.map((r, i) => ({
            ...r,
            color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        }));
    }

    #notify() { this.#listeners.forEach(l => l()); }
}
