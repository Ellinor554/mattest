// ═══════════════════════════════════════════════════════════════════════════
// modules/tools/PosSystemEngine.js
// Pure model for Positionssystemet — pieces with type+mode, auto-exchange,
// column visibility, and a total value.
// ═══════════════════════════════════════════════════════════════════════════

export const POS_COL_DEFS = Object.freeze([
    { key: 'tusental',  label: 'Tusental',  value: 1000,
      color: '#1565C0', bg: 'rgba(30,136,229,0.06)', border: 'rgba(21,101,192,0.25)' },
    { key: 'hundratal', label: 'Hundratal', value: 100,
      color: '#2E7D32', bg: 'rgba(56,142,60,0.06)',  border: 'rgba(46,125,50,0.25)' },
    { key: 'tiotal',    label: 'Tiotal',    value: 10,
      color: '#92700A', bg: 'rgba(249,168,37,0.06)', border: 'rgba(146,112,10,0.25)' },
    { key: 'ental',     label: 'Ental',     value: 1,
      color: '#C62828', bg: 'rgba(229,57,53,0.06)',  border: 'rgba(198,40,40,0.25)' },
]);

const VALID_TYPES = POS_COL_DEFS.map(c => c.key);
const VALID_MODES = Object.freeze(['block', 'pengar']);

let nextId = 1;

export class PosSystemEngine {
    #pieces = [];
    #visibleCols = { tusental: true, hundratal: true, tiotal: true, ental: true };
    #showColumns = true;
    #autoExchange = true;
    #listeners = new Set();

    addPiece(type, mode = 'block') {
        if (!VALID_TYPES.includes(type)) return null;
        if (!VALID_MODES.includes(mode)) mode = 'block';
        const piece = { id: nextId++, type, mode };
        this.#pieces.push(piece);
        this.#maybeAutoExchange();
        this.#emit();
        return piece;
    }

    removePiece(id) {
        const before = this.#pieces.length;
        this.#pieces = this.#pieces.filter(p => p.id !== id);
        if (this.#pieces.length !== before) {
            this.#maybeAutoExchange();
            this.#emit();
        }
    }

    clear() {
        if (this.#pieces.length === 0) return;
        this.#pieces = [];
        this.#emit();
    }

    setColumnVisible(colKey, visible) {
        if (!VALID_TYPES.includes(colKey)) return;
        const v = !!visible;
        if (this.#visibleCols[colKey] === v) return;
        this.#visibleCols = { ...this.#visibleCols, [colKey]: v };
        if (!v) {
            this.#pieces = this.#pieces.filter(p => p.type !== colKey);
        }
        this.#emit();
    }

    setShowColumns(show) {
        const v = !!show;
        if (this.#showColumns === v) return;
        this.#showColumns = v;
        this.#emit();
    }

    setAutoExchange(on) {
        const v = !!on;
        if (this.#autoExchange === v) return;
        this.#autoExchange = v;
        if (v) this.#maybeAutoExchange();
        this.#emit();
    }

    countOfType(type) {
        return this.#pieces.filter(p => p.type === type).length;
    }

    getReading() {
        const counts = { tusental: 0, hundratal: 0, tiotal: 0, ental: 0 };
        for (const p of this.#pieces) {
            if (counts[p.type] != null) counts[p.type]++;
        }
        const total =
              counts.tusental  * 1000
            + counts.hundratal * 100
            + counts.tiotal    * 10
            + counts.ental;

        return Object.freeze({
            pieces:        Object.freeze([...this.#pieces.map(p => ({ ...p }))]),
            counts:        Object.freeze({ ...counts }),
            total,
            visibleCols:   Object.freeze({ ...this.#visibleCols }),
            showColumns:   this.#showColumns,
            autoExchange:  this.#autoExchange,
            visibleColKeys: Object.freeze(
                POS_COL_DEFS.filter(c => this.#visibleCols[c.key]).map(c => c.key)
            ),
        });
    }

    subscribe(listener) {
        this.#listeners.add(listener);
        listener(this.getReading());
        return () => this.#listeners.delete(listener);
    }

    #emit() {
        const reading = this.getReading();
        for (const l of this.#listeners) {
            try { l(reading); }
            catch (err) { console.error('[PosSystemEngine] listener threw:', err); }
        }
    }

    #maybeAutoExchange() {
        if (!this.#autoExchange) return;
        let changed = true;
        let safety = 50;
        while (changed && safety-- > 0) {
            changed = false;
            for (const [smallKey, bigKey] of [
                ['ental',     'tiotal'],
                ['tiotal',    'hundratal'],
                ['hundratal', 'tusental'],
            ]) {
                const smalls = this.#pieces.filter(p => p.type === smallKey);
                if (smalls.length >= 10) {
                    const consumed = smalls.slice(0, 10);
                    const mode = consumed.some(p => p.mode === 'pengar') ? 'pengar' : 'block';
                    const consumedIds = new Set(consumed.map(p => p.id));
                    this.#pieces = this.#pieces.filter(p => !consumedIds.has(p.id));
                    this.#pieces.push({ id: nextId++, type: bigKey, mode });
                    changed = true;
                }
            }
        }
    }
}
