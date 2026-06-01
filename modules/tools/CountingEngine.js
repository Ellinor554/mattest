// ═══════════════════════════════════════════════════════════════════════════
// modules/tools/CountingEngine.js
// Pure model for the Räkning (Counting) tool.
// ═══════════════════════════════════════════════════════════════════════════

const NUM_BALLS = 10;
const MODES = Object.freeze(['friends', 'multiplication', 'division']);

export class CountingEngine {
    #mode = 'friends';
    #ballZones;
    #listeners = new Set();

    constructor() {
        this.#ballZones = this.#initialFriendsLayout();
    }

    setMode(mode) {
        if (!MODES.includes(mode)) {
            throw new Error(`Unknown counting mode: "${mode}"`);
        }
        if (mode === this.#mode) return;
        this.#mode = mode;
        if (mode === 'friends') {
            this.#ballZones = this.#initialFriendsLayout();
        }
        this.#emit();
    }

    setBallZone(ballIndex, zone) {
        if (ballIndex < 0 || ballIndex >= NUM_BALLS) return;
        if (zone !== 1 && zone !== 2) return;
        if (this.#ballZones[ballIndex] === zone) return;
        this.#ballZones[ballIndex] = zone;
        this.#emit();
    }

    getReading() {
        const zone1Count = this.#ballZones.filter(z => z === 1).length;
        const zone2Count = NUM_BALLS - zone1Count;
        return Object.freeze({
            mode:        this.#mode,
            ballZones:   Object.freeze([...this.#ballZones]),
            zone1Count,
            zone2Count,
            isMultiplication: this.#mode === 'multiplication',
            isDivision:       this.#mode === 'division',
            isFriends:        this.#mode === 'friends',
        });
    }

    static gridCells(isMultiplication) {
        const cells = [];
        for (let i = 0; i <= 10; i++) {
            const row = [];
            for (let j = 0; j <= 10; j++) {
                if (i === 0 && j === 0) row.push({ kind: 'corner', text: isMultiplication ? '×' : '÷' });
                else if (i === 0)       row.push({ kind: 'header', text: String(j), col: j });
                else if (j === 0)       row.push({ kind: 'header', text: String(i), row: i });
                else {
                    const product = i * j;
                    row.push({
                        kind: 'cell',
                        row: i, col: j, product,
                        text: String(product),
                        equationHTML: isMultiplication
                            ? `${i} <span class="text-soft-muted">×</span> ${j} <span class="text-soft-muted">=</span> <span class="text-2xl">${product}</span>`
                            : `${product} <span class="text-soft-muted">÷</span> ${i} <span class="text-soft-muted">=</span> <span class="text-2xl">${j}</span>`,
                    });
                }
            }
            cells.push(row);
        }
        return cells;
    }

    subscribe(listener) {
        this.#listeners.add(listener);
        listener(this.getReading());
        return () => this.#listeners.delete(listener);
    }

    #emit() {
        const reading = this.getReading();
        for (const listener of this.#listeners) {
            try { listener(reading); }
            catch (err) { console.error('[CountingEngine] listener threw:', err); }
        }
    }

    #initialFriendsLayout() {
        return Array.from({ length: NUM_BALLS }, (_, i) => i < 5 ? 1 : 2);
    }
}

export const COUNTING_CONSTANTS = Object.freeze({ NUM_BALLS, MODES });
