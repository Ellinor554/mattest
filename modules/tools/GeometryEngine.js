// ═══════════════════════════════════════════════════════════════════════════
// modules/tools/GeometryEngine.js
// Stage 3 — adds per-shape dimensions, showFormulas flag, unit.
// ═══════════════════════════════════════════════════════════════════════════

import { DEFAULT_DIMS_CM, MULTI_DIM_2D_SHAPES } from './GeometryFormulas.js';

export const SHAPE_DEFS_2D = Object.freeze({
    circle:        { label: 'Cirkel',        dims: ['r'] },
    triangle:      { label: 'Triangel',      dims: ['b', 'h'] },
    square:        { label: 'Kvadrat',       dims: ['a'] },
    rectangle:     { label: 'Rektangel',     dims: ['b', 'h'] },
    pentagon:      { label: 'Pentagon',      dims: ['a'] },
    hexagon:       { label: 'Hexagon',       dims: ['a'] },
    rhombus:       { label: 'Romb',          dims: ['d1', 'd2'] },
    parallelogram: { label: 'Parallellogram', dims: ['b', 'h'] },
});

export const SHAPE_DEFS_3D = Object.freeze({
    cylinder: { label: 'Cylinder', dims: ['r', 'h'] },
    cube:     { label: 'Kub',      dims: ['a'] },
    cuboid:   { label: 'Rätblock', dims: ['l', 'w', 'h'] },
    sphere:   { label: 'Klot',     dims: ['r'] },
    pyramid:  { label: 'Pyramid',  dims: ['a', 'h'] },
    cone:     { label: 'Kon',      dims: ['r', 'h'] },
});

const VALID_2D_TYPES = Object.keys(SHAPE_DEFS_2D);
const VALID_3D_TYPES = Object.keys(SHAPE_DEFS_3D);
const ROT_STEP_DEG = 15;
const MIN_SCALE_2D = 0.3;
const MAX_SCALE_2D = 5;
const MIN_SCALE_3D = 0.4;
const MAX_SCALE_3D = 4;
const VALID_UNITS = Object.freeze(['mm', 'cm', 'm']);

let nextId = 1;

export class GeometryEngine {
    #shapes = [];
    #selectedId = null;
    #autoRotate3D = true;
    #showFormulas = false;
    #unit = 'cm';
    #presentationOpen = false;
    #listeners = new Set();

    add2DShape(type, x = 100, y = 100) {
        if (!VALID_2D_TYPES.includes(type)) return null;
        return this.#addShape({ kind: '2d', type, x, y });
    }

    add3DShape(type, x = 100, y = 100) {
        if (!VALID_3D_TYPES.includes(type)) return null;
        return this.#addShape({ kind: '3d', type, x, y });
    }

    #addShape({ kind, type, x, y }) {
        const defaults = DEFAULT_DIMS_CM[type] || {};
        const shape = {
            id: nextId++, kind, type, x, y,
            rotation: 0, scale: 1,
            dimensions: { ...defaults },
        };
        this.#shapes.push(shape);
        this.#selectedId = shape.id;
        this.#emit();
        return shape.id;
    }

    setPosition(id, x, y) {
        const s = this.#findById(id);
        if (!s) return;
        s.x = x; s.y = y;
        this.#emit();
    }

    setScale(id, scale) {
        const s = this.#findById(id);
        if (!s) return;
        const [lo, hi] = s.kind === '3d'
            ? [MIN_SCALE_3D, MAX_SCALE_3D]
            : [MIN_SCALE_2D, MAX_SCALE_2D];
        const oldScale = s.scale;
        const newScale = Math.max(lo, Math.min(hi, scale));
        s.scale = newScale;
        const isMultiDim2D = s.kind === '2d' && MULTI_DIM_2D_SHAPES.includes(s.type);
        if (!isMultiDim2D && oldScale > 0 && newScale !== oldScale) {
            const ratio = newScale / oldScale;
            const updated = {};
            for (const [k, v] of Object.entries(s.dimensions)) {
                updated[k] = v * ratio;
            }
            s.dimensions = updated;
        }
        this.#emit();
    }

    setRotation(id, deg) {
        const s = this.#findById(id);
        if (!s) return;
        s.rotation = deg;
        this.#emit();
    }

    setDimension(id, key, valueCm) {
        const s = this.#findById(id);
        if (!s) return;
        const v = Number(valueCm);
        if (!Number.isFinite(v) || v <= 0) return;
        if (!(key in s.dimensions)) return;
        const isMultiDim2D = s.kind === '2d' && MULTI_DIM_2D_SHAPES.includes(s.type);
        if (isMultiDim2D) {
            s.dimensions = { ...s.dimensions, [key]: v };
        } else {
            const defaults = DEFAULT_DIMS_CM[s.type] || {};
            const baseVal = defaults[key];
            if (!baseVal || baseVal <= 0) return;
            const newScale = Math.max(0.05, Math.min(20, v / baseVal));
            const ratio = newScale / (s.scale || 1);
            s.scale = newScale;
            const updated = {};
            for (const [k, val] of Object.entries(s.dimensions)) {
                updated[k] = k === key ? v : val * ratio;
            }
            s.dimensions = updated;
        }
        this.#emit();
    }

    select(id) {
        if (id === this.#selectedId) return;
        if (id !== null && !this.#findById(id)) return;
        this.#selectedId = id;
        this.#emit();
    }

    rotateSelected(deltaDeg = ROT_STEP_DEG) {
        if (this.#selectedId == null) return;
        const s = this.#findById(this.#selectedId);
        if (!s) return;
        if (s.kind !== '2d') return;
        s.rotation = (s.rotation || 0) + deltaDeg;
        this.#emit();
    }

    deleteSelected() {
        if (this.#selectedId == null) return;
        const before = this.#shapes.length;
        this.#shapes = this.#shapes.filter(s => s.id !== this.#selectedId);
        if (this.#shapes.length === before) return;
        this.#selectedId = null;
        this.#emit();
    }

    clear() {
        if (this.#shapes.length === 0 && this.#selectedId == null) return;
        this.#shapes = [];
        this.#selectedId = null;
        this.#emit();
    }

    setAutoRotate3D(on) {
        const v = !!on;
        if (this.#autoRotate3D === v) return;
        this.#autoRotate3D = v;
        this.#emit();
    }

    toggleAutoRotate3D() {
        this.#autoRotate3D = !this.#autoRotate3D;
        this.#emit();
    }

    setShowFormulas(on) {
        const v = !!on;
        if (this.#showFormulas === v) return;
        this.#showFormulas = v;
        this.#emit();
    }

    setUnit(unit) {
        if (!VALID_UNITS.includes(unit)) return;
        if (this.#unit === unit) return;
        this.#unit = unit;
        this.#emit();
    }
setPresentationOpen(on) {
        const v = !!on;
        if (this.#presentationOpen === v) return;
        this.#presentationOpen = v;
        this.#emit();
    }

    togglePresentationOpen() {
        this.#presentationOpen = !this.#presentationOpen;
        this.#emit();
    }
    getReading() {
        const selected = this.#selectedId == null
            ? null
            : this.#findById(this.#selectedId);
        return Object.freeze({
            shapes:       Object.freeze(this.#shapes.map(s => ({
                ...s,
                dimensions: { ...s.dimensions },
            }))),
            selectedId:   this.#selectedId,
            selectedType: selected ? selected.type : null,
            selectedKind: selected ? selected.kind : null,
            hasSelection: selected != null,
            autoRotate3D: this.#autoRotate3D,
           showFormulas: this.#showFormulas,
            unit:         this.#unit,
            presentationOpen: this.#presentationOpen,
        });
    }

    getState() { return this.getReading(); }

    subscribe(listener) {
        this.#listeners.add(listener);
        listener(this.getReading());
        return () => this.#listeners.delete(listener);
    }

    #emit() {
        const reading = this.getReading();
        for (const l of this.#listeners) {
            try { l(reading); }
            catch (err) { console.error('[GeometryEngine] listener threw:', err); }
        }
    }

    #findById(id) {
        return this.#shapes.find(s => s.id === id) || null;
    }
}
