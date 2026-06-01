// ═══════════════════════════════════════════════════════════════════════════
// modules/tools/ScaleEngine.js
// Pure domain model for the Skala och mått tool.
// ═══════════════════════════════════════════════════════════════════════════

const ROUND = 1000;

export const SCALE_OBJECTS = Object.freeze({
    skruv:        { label: 'Skruv',        w: 0.5, h: 4.0, type: 'skruv' },
    insekt:       { label: 'Insekt',       w: 1.4, h: 2.0, type: 'insekt' },
    gem:          { label: 'Gem',          w: 0.8, h: 3.0, type: 'gem' },
    blyertspenna: { label: 'Blyertspenna', w: 0.6, h: 7.0, type: 'blyertspenna' },
    rektangel:    { label: 'Rektangel',    w: 4.0, h: 2.5, type: 'rektangel' },
    kvadrat:      { label: 'Kvadrat',      w: 3.0, h: 3.0, type: 'kvadrat' },
});

export const SCALE_RATIOS = Object.freeze({
    reductions: [{ n: 1, d: 100 }, { n: 1, d: 10 }, { n: 1, d: 5 }, { n: 1, d: 2 }],
    original:    { n: 1, d: 1 },
    enlargements: [{ n: 2, d: 1 }, { n: 5, d: 1 }, { n: 10, d: 1 }],
});

const DEFAULT_OBJECT_KEY = 'gem';

export class ScaleEngine {
    #activeObject;
    #objWCm;
    #objHCm;
    #lockProp = false;
    #numerator = 1;
    #denominator = 1;
    #hovering = false;
    #listeners = new Set();

    constructor() {
        this.setObject(DEFAULT_OBJECT_KEY);
    }

    setObject(key) {
        const def = SCALE_OBJECTS[key];
        if (!def) return;
        this.#activeObject = key;
        this.#objWCm = def.w;
        this.#objHCm = def.h;
        this.#emit();
    }

    setScale(numerator, denominator) {
        if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return;
        if (numerator <= 0 || denominator <= 0) return;
        this.#numerator = numerator;
        this.#denominator = denominator;
        this.#emit();
    }

    setLockProportion(locked) {
        this.#lockProp = !!locked;
        this.#emit();
    }

    setWidthCm(newWCm) {
        if (!Number.isFinite(newWCm) || newWCm <= 0) return;
        if (this.#lockProp && this.#objWCm > 0) {
            const r = newWCm / this.#objWCm;
            this.#objHCm = roundTo3(this.#objHCm * r);
        }
        this.#objWCm = newWCm;
        this.#emit();
    }

    setHeightCm(newHCm) {
        if (!Number.isFinite(newHCm) || newHCm <= 0) return;
        if (this.#lockProp && this.#objHCm > 0) {
            const r = newHCm / this.#objHCm;
            this.#objWCm = roundTo3(this.#objWCm * r);
        }
        this.#objHCm = newHCm;
        this.#emit();
    }

    setHovering(isHovering) {
        const v = !!isHovering;
        if (v === this.#hovering) return;
        this.#hovering = v;
        this.#emit();
    }

    getReading() {
        const factor = this.#numerator / this.#denominator;
        const def = SCALE_OBJECTS[this.#activeObject] || SCALE_OBJECTS.gem;
        const drawingWCm = this.#objWCm * factor;
        const drawingHCm = this.#objHCm * factor;
        const ratioKind =
              this.#numerator < this.#denominator ? 'reduction'
            : this.#numerator > this.#denominator ? 'enlargement'
            : 'original';

        return Object.freeze({
            activeObject: this.#activeObject,
            objectLabel:  def.label,
            objectType:   def.type,
            realWCm:      this.#objWCm,
            realHCm:      this.#objHCm,
            drawingWCm,
            drawingHCm,
            numerator:    this.#numerator,
            denominator:  this.#denominator,
            factor,
            ratioKind,
            ratioLabel:   `${this.#numerator}:${this.#denominator}`,
            ratioTypeText:
                  ratioKind === 'reduction'   ? '(Förminskning)'
                : ratioKind === 'enlargement' ? '(Förstoring)'
                :                                '(Original)',
            lockProp:  this.#lockProp,
            hovering:  this.#hovering,
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
            catch (err) { console.error('[ScaleEngine] listener threw:', err); }
        }
    }
}

function roundTo3(v) {
    return Math.round(v * ROUND) / ROUND;
}

export function fmtCmVal(cm) {
    const r = roundTo3(cm);
    if (r % 1 === 0) return String(r);
    return r.toFixed(3).replace('.', ',');
}

export function fmtCm(cm) {
    return `${fmtCmVal(cm)} cm`;
}
