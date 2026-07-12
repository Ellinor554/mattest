// ═══════════════════════════════════════════════════════════════════════════
// modules/tools/GeometryView.js
// Stage 4 — adds Presentationsläge overlay (floats in top-right of viewport,
// renders the selected shape's formulas at large size for projection).
// ═══════════════════════════════════════════════════════════════════════════

import { GeometryEngine, SHAPE_DEFS_2D, SHAPE_DEFS_3D } from './GeometryEngine.js';
import {
    getFormulaSpec, cmToUnit, unitToCm,
    MULTI_DIM_2D_SHAPES, DEFAULT_DIMS_CM,
} from './GeometryFormulas.js';

const SHAPE_BUTTONS_2D = [
    { type: 'circle',        label: 'Cirkel',
      svg: '<circle cx="20" cy="20" r="16" fill="#ffffff" stroke="#000000" stroke-width="2"/>' },
    { type: 'triangle',      label: 'Triangel',
      svg: '<polygon points="20,5 37,35 3,35" fill="#ffffff" stroke="#000000" stroke-width="2" stroke-linejoin="round"/>' },
    { type: 'square',        label: 'Kvadrat',
      svg: '<rect x="5" y="5" width="30" height="30" fill="#ffffff" stroke="#000000" stroke-width="2"/>' },
    { type: 'rectangle',     label: 'Rektangel',
      svg: '<rect x="2" y="11" width="36" height="20" fill="#ffffff" stroke="#000000" stroke-width="2"/>' },
    { type: 'pentagon',      label: 'Pentagon',
      svg: '<polygon points="20,3 37,15 31,35 9,35 3,15" fill="#ffffff" stroke="#000000" stroke-width="2"/>' },
    { type: 'hexagon',       label: 'Hexagon',
      svg: '<polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="#ffffff" stroke="#000000" stroke-width="2"/>' },
    { type: 'rhombus',       label: 'Romb',
      svg: '<polygon points="20,3 37,20 20,37 3,20" fill="#ffffff" stroke="#000000" stroke-width="2"/>' },
    { type: 'parallelogram', label: 'Parallellogram',
      svg: '<polygon points="10,32 4,8 30,8 36,32" fill="#ffffff" stroke="#000000" stroke-width="2"/>' },
];

const SHAPE_BUTTONS_3D = [
    { type: 'cylinder', label: 'Cylinder', iconClass: 'fa-database',  color: '#5b80a5' },
    { type: 'cube',     label: 'Kub',      iconClass: 'fa-cube',      color: '#4f7c75' },
    { type: 'cuboid',   label: 'Rätblock', iconClass: 'fa-box',       color: '#5b80a5' },
    { type: 'sphere',   label: 'Klot',     iconClass: 'fa-globe',     color: '#a85c72' },
    { type: 'pyramid',  label: 'Pyramid',  iconClass: 'fa-caret-up',  color: '#dec894' },
    { type: 'cone',     label: 'Kon',      iconClass: 'fa-caret-up',  color: '#938db3' },
];

const SHAPE_SIZE_PX = 200;
const SVG_VIEWBOX  = 120;
const CARD_3D_SIZE = 240;
const CARD_3D_HEADER_H = 24;
const PRES_OVERLAY_ID = 'geometry-presentation-overlay';

const TYPE_LABELS_3D = {
    cylinder: 'Cylinder', cube: 'Kub', cuboid: 'Rätblock',
    sphere: 'Klot', pyramid: 'Pyramid', cone: 'Kon',
};

export class GeometryView {
    #engine;
    #unsubscribe;
    #root;
    #els = {};
    #shapeEls = new Map();
    #threeStates = new Map();
    #zCounter = 100;
    #autoRotateCache = true;
    #lastDimsForShape = new Map();
    #presentationEl = null;
    #angleEls = [];

    constructor(engine = new GeometryEngine()) { this.#engine = engine; }
    get engine() { return this.#engine; }

    mount(parent) {
        this.#root = document.createElement('section');
        this.#root.id = 'view-geometry';
        this.#root.className = 'view-section flex-row h-full';
        this.#root.innerHTML = this.#template();
        parent.appendChild(this.#root);
        this.#cacheRefs();
        this.#wireEvents();
        this.#unsubscribe = this.#engine.subscribe(reading => this.#render(reading));
        return this.#root;
    }

    onEnter() {
        if (this.#engine.getReading().presentationOpen) this.#showPresentation();
    }
    onLeave() {
        this.#hidePresentation();
    }
    destroy() {
        this.#removePresentationOverlay();
        this.#disposeAllThree();
        this.#unsubscribe?.();
        this.#root?.remove();
    }

    #template() {
        const btns2d = SHAPE_BUTTONS_2D.map(b => `
            <button data-add-shape="${b.type}" data-shape-kind="2d" class="geo-btn">
                <svg viewBox="0 0 40 40" width="28" height="28">${b.svg}</svg>${b.label}
            </button>`).join('');
        const btns3d = SHAPE_BUTTONS_3D.map(b => `
            <button data-add-shape="${b.type}" data-shape-kind="3d" class="geo-btn">
                <i class="fas ${b.iconClass} text-xl" style="color:${b.color}"></i>${b.label}
            </button>`).join('');

        return `
        <div id="geometry-sidebar"
             class="w-64 bg-soft-surface shadow-md z-10 p-4 flex flex-col gap-3
                    overflow-y-auto border-r border-soft-border shrink-0">
            <h3 class="font-bold text-xs uppercase tracking-wider text-soft-muted">2D-former</h3>
            <div class="grid grid-cols-2 gap-1.5">${btns2d}</div>
            <hr class="border-soft-border my-1"/>
            <h3 class="font-bold text-xs uppercase tracking-wider text-soft-muted">3D-objekt</h3>
            <div class="grid grid-cols-2 gap-1.5">${btns3d}</div>
            <hr class="border-soft-border my-1"/>
            <h3 class="font-bold text-xs uppercase tracking-wider text-soft-muted">Vinklar</h3>
            <button data-action="add-angle" class="geo-btn w-full">
                <i class="fas fa-drafting-compass text-xl" style="color:#a85c72;"></i>Vinkel
            </button>
            <hr class="border-soft-border my-1"/>
            <div class="flex gap-2">
                <button data-action="rotate-ccw" class="flex-1 bg-soft-bg p-2 rounded text-soft-text hover:bg-[#eae8e3] text-sm border border-soft-border" title="Rotera moturs (2D)"><i class="fas fa-undo"></i></button>
                <button data-action="rotate-cw"  class="flex-1 bg-soft-bg p-2 rounded text-soft-text hover:bg-[#eae8e3] text-sm border border-soft-border" title="Rotera medurs (2D)"><i class="fas fa-redo"></i></button>
                <button data-action="delete" class="flex-1 bg-soft-pinkLight/20 text-soft-pink p-2 rounded hover:bg-soft-pinkLight/40 text-sm border border-soft-pinkLight/30" title="Ta bort markerad"><i class="fas fa-trash"></i></button>
            </div>
            <button data-action="toggle-spin"
                    class="bg-soft-bg p-2 rounded-lg text-soft-text hover:bg-[#eae8e3]
                           text-sm border border-soft-border flex items-center gap-2 w-full justify-center">
                <i class="fas fa-sync-alt"></i>
                <span data-role="spin-label">Rotation: PÅ</span>
            </button>
            <hr class="border-soft-border my-1"/>
            <label class="flex items-center gap-2 font-semibold text-soft-text text-sm cursor-pointer select-none">
                <input type="checkbox" data-role="show-formulas-cb" class="w-4 h-4 accent-soft-blue"/>
                Visa formler
            </label>
            <div data-role="formula-panel" style="display:none;flex-direction:column;gap:6px;">
                <div class="flex items-center gap-2">
                    <span class="text-xs text-soft-muted font-semibold">Enhet:</span>
                    <select data-role="unit-select" class="text-xs border border-soft-border rounded px-1 py-0.5 bg-white text-soft-text">
                        <option value="mm">mm</option>
                        <option value="cm" selected>cm</option>
                        <option value="m">m</option>
                    </select>
                </div>
                <div data-role="formula-area" class="bg-soft-bg rounded-xl p-3 border border-soft-border min-h-[56px]">
                    <span style="color:#8c8d92;font-style:italic;font-size:11px;">
                        Välj en form för att se formler.
                    </span>
                </div>
                <button data-action="toggle-presentation"
                        class="w-full bg-soft-blueLight/20 text-soft-blue border border-soft-blueLight/30
                               rounded-lg px-2 py-1 text-xs font-bold hover:bg-soft-blueLight/40
                               transition-colors flex items-center justify-center gap-1">
                    <i class="fas fa-expand-alt text-xs" data-role="pres-btn-icon"></i>
                    <span data-role="pres-btn-label">Expandera formel</span>
                </button>
            </div>
            <div class="p-2.5 bg-soft-blueLight/15 rounded-xl text-xs text-soft-blue border border-soft-blueLight/30 leading-relaxed">
                <i class="fas fa-search-plus mr-1"></i>
                <strong>Dra ⌟-hörnet</strong> för att ändra storlek.<br/>
                <i class="fas fa-hand-paper mr-1 mt-1"></i>
                Dra på 3D-objektet för att vrida det.<br/>
                <i class="fas fa-arrows-alt mr-1 mt-1"></i>
                Dra i namnlistan för att flytta.
            </div>
            <button data-action="clear" class="bg-soft-text hover:bg-soft-muted text-white p-2 rounded mt-auto text-sm font-semibold">
                Rensa allt
            </button>
        </div>
        <div class="flex-1 workspace relative" data-role="workspace" id="workspace-geometry"></div>`;
    }

    #cacheRefs() {
        const $ = sel => this.#root.querySelector(sel);
        this.#els = {
            workspace:     $('[data-role="workspace"]'),
            spinLabel:     $('[data-role="spin-label"]'),
            showFormulas:  $('[data-role="show-formulas-cb"]'),
            formulaPanel:  $('[data-role="formula-panel"]'),
            unitSelect:    $('[data-role="unit-select"]'),
            formulaArea:   $('[data-role="formula-area"]'),
            presBtnIcon:   $('[data-role="pres-btn-icon"]'),
            presBtnLabel:  $('[data-role="pres-btn-label"]'),
        };
    }

    #wireEvents() {
        this.#root.addEventListener('click', evt => {
            const addBtn = evt.target.closest('[data-add-shape]');
            if (addBtn) {
                const kind = addBtn.dataset.shapeKind;
                const type = addBtn.dataset.addShape;
                const ws = this.#els.workspace;
                const wsW = ws.clientWidth, wsH = ws.clientHeight;
                const sizeForKind = kind === '3d' ? CARD_3D_SIZE + CARD_3D_HEADER_H : SHAPE_SIZE_PX;
                const x = (wsW / 2) - (sizeForKind / 2) + (Math.random() * 80 - 40);
                const y = wsH - sizeForKind - 20 + (Math.random() * 30 - 15);
                if (kind === '3d') {
                    if (!window.THREE) { alert('Three.js är inte laddad.'); return; }
                    this.#engine.add3DShape(type, Math.max(10, x), Math.max(10, y));
                } else {
                    this.#engine.add2DShape(type, Math.max(10, x), Math.max(10, y));
                }
                return;
            }
            const action = evt.target.closest('[data-action]')?.dataset.action;
            if (action === 'rotate-ccw') this.#engine.rotateSelected(-15);
            if (action === 'rotate-cw')  this.#engine.rotateSelected(15);
            if (action === 'delete')     this.#engine.deleteSelected();
            if (action === 'clear') {
                this.#engine.clear();
                for (const el of this.#angleEls) el.remove();
                this.#angleEls = [];
            }
            if (action === 'add-angle')  { this.#addAngleCard(); return; }
            if (action === 'toggle-spin') this.#engine.toggleAutoRotate3D();
            if (action === 'toggle-presentation') this.#engine.togglePresentationOpen();
        });
        this.#els.workspace.addEventListener('pointerdown', evt => {
            if (evt.target === this.#els.workspace) this.#engine.select(null);
        });
        this.#els.showFormulas.addEventListener('change', e =>
            this.#engine.setShowFormulas(e.target.checked));
        this.#els.unitSelect.addEventListener('change', e =>
            this.#engine.setUnit(e.target.value));
    }

    #render(reading) {
        this.#autoRotateCache = reading.autoRotate3D;
        this.#els.spinLabel.textContent = `Rotation: ${reading.autoRotate3D ? 'PÅ' : 'AV'}`;
        if (this.#els.showFormulas.checked !== reading.showFormulas) {
            this.#els.showFormulas.checked = reading.showFormulas;
        }
        this.#els.formulaPanel.style.display = reading.showFormulas ? 'flex' : 'none';
        if (this.#els.unitSelect.value !== reading.unit) {
            this.#els.unitSelect.value = reading.unit;
        }

        const liveIds = new Set(reading.shapes.map(s => s.id));
        for (const [id, el] of this.#shapeEls) {
            if (!liveIds.has(id)) {
                this.#disposeThreeFor(id);
                el.remove();
                this.#shapeEls.delete(id);
                this.#lastDimsForShape.delete(id);
            }
        }
        for (const shape of reading.shapes) {
            let el = this.#shapeEls.get(shape.id);
            if (!el) {
                el = shape.kind === '3d'
                    ? this.#create3DCardElement(shape)
                    : this.#create2DShapeElement(shape);
                this.#shapeEls.set(shape.id, el);
                this.#els.workspace.appendChild(el);
                this.#lastDimsForShape.set(shape.id, { ...shape.dimensions });
            } else if (shape.kind === '2d' && MULTI_DIM_2D_SHAPES.includes(shape.type)) {
                const prev = this.#lastDimsForShape.get(shape.id) || {};
                const cur  = shape.dimensions || {};
                const changed = Object.keys(cur).some(k => prev[k] !== cur[k]);
                if (changed) {
                    this.#redraw2DShape(el, shape);
                    this.#lastDimsForShape.set(shape.id, { ...cur });
                }
            }
            this.#applyTransform(el, shape);
            el.classList.toggle('selected', shape.id === reading.selectedId);
        }

        if (reading.showFormulas) this.#renderFormulaPanel(reading);

        // Stage 4: keep presentation overlay in sync
        this.#syncPresentationButtonLabel(reading.presentationOpen);
        if (reading.presentationOpen) {
            this.#showPresentation();
            this.#renderPresentationContent(reading);
        } else {
            this.#hidePresentation();
        }
    }

    #applyTransform(el, shape) {
        el.style.left = shape.x + 'px';
        el.style.top  = shape.y + 'px';
        if (shape.kind === '3d') {
            el.style.transform = `scale(${shape.scale})`;
        } else {
            el.style.transform = `rotate(${shape.rotation}deg) scale(${shape.scale})`;
        }
    }

    #create2DShapeElement(shape) {
        const wrapper = document.createElement('div');
        wrapper.className = 'draggable-item';
        wrapper.dataset.shapeType = shape.type;
        wrapper.dataset.shapeCat = '2d';
        wrapper.dataset.id = String(shape.id);
        wrapper.style.cssText =
            `position:absolute;width:${SHAPE_SIZE_PX}px;height:${SHAPE_SIZE_PX}px;` +
            `transform-origin:center center;`;
        wrapper.innerHTML = this.#build2DSvg(shape);

        const handle = document.createElement('div');
        handle.className = 'geo-resize-handle';
        handle.textContent = '⌟';
        wrapper.appendChild(handle);

        this.#wire2DShapeEvents(wrapper, shape.id, handle);
        return wrapper;
    }

    #redraw2DShape(wrapper, shape) {
        const oldSvg = wrapper.querySelector('svg');
        if (oldSvg) oldSvg.remove();
        const tmp = document.createElement('div');
        tmp.innerHTML = this.#build2DSvg(shape);
        const newSvg = tmp.querySelector('svg');
        if (newSvg) {
            const handle = wrapper.querySelector('.geo-resize-handle');
            if (handle) wrapper.insertBefore(newSvg, handle);
            else        wrapper.appendChild(newSvg);
        }
    }

    #build2DSvg(shape) {
        return `<svg width="${SHAPE_SIZE_PX}" height="${SHAPE_SIZE_PX}" viewBox="0 0 ${SVG_VIEWBOX} ${SVG_VIEWBOX}">` +
               shape2dSvg(shape.type, shape.dimensions) +
               '</svg>';
    }

    #wire2DShapeEvents(wrapper, shapeId, handle) {
        let dragging = false;
        let pStartX = 0, pStartY = 0, sStartX = 0, sStartY = 0;
        wrapper.addEventListener('pointerdown', e => {
            if (e.target === handle) return;
            if (e.button !== 0) return;
            e.preventDefault();
            const shape = this.#engine.getReading().shapes.find(s => s.id === shapeId);
            if (!shape) return;
            this.#engine.select(shapeId);
            this.#zCounter += 1;
            wrapper.style.zIndex = String(this.#zCounter);
            dragging = true;
            pStartX = e.clientX; pStartY = e.clientY;
            sStartX = shape.x;   sStartY = shape.y;
            wrapper.setPointerCapture(e.pointerId);
        });
        wrapper.addEventListener('pointermove', e => {
            if (!dragging) return;
            this.#engine.setPosition(shapeId,
                sStartX + (e.clientX - pStartX),
                sStartY + (e.clientY - pStartY));
        });
        const endDrag = e => {
            if (!dragging) return;
            dragging = false;
            try { wrapper.releasePointerCapture(e.pointerId); } catch {}
        };
        wrapper.addEventListener('pointerup', endDrag);
        wrapper.addEventListener('pointercancel', endDrag);

        let resizing = false, rStartX = 0, rStartScale = 1;
        handle.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            const shape = this.#engine.getReading().shapes.find(s => s.id === shapeId);
            if (!shape) return;
            resizing = true;
            rStartX = e.clientX;
            rStartScale = shape.scale;
            handle.setPointerCapture(e.pointerId);
        });
        handle.addEventListener('pointermove', e => {
            if (!resizing) return;
            this.#engine.setScale(shapeId,
                rStartScale + (e.clientX - rStartX) / SHAPE_SIZE_PX);
        });
        const endResize = e => {
            if (!resizing) return;
            resizing = false;
            try { handle.releasePointerCapture(e.pointerId); } catch {}
        };
        handle.addEventListener('pointerup', endResize);
        handle.addEventListener('pointercancel', endResize);
    }

    #create3DCardElement(shape) {
        const card = document.createElement('div');
        card.className = 'geo-3d-card draggable-item';
        card.dataset.shapeType = shape.type;
        card.dataset.shapeCat = '3d';
        card.dataset.id = String(shape.id);
        card.style.cssText =
            `position:absolute;width:${CARD_3D_SIZE}px;` +
            `height:${CARD_3D_SIZE + CARD_3D_HEADER_H}px;` +
            `transform-origin:top left;`;
        const header = document.createElement('div');
        header.style.cssText =
            `width:100%;height:${CARD_3D_HEADER_H}px;display:flex;` +
            `align-items:center;justify-content:center;font-size:10px;` +
            `font-weight:700;color:#6a6b70;user-select:none;cursor:move;` +
            `background:rgba(100,110,130,0.12);border-radius:10px 10px 0 0;`;
        header.textContent = `⠿ ${TYPE_LABELS_3D[shape.type] || shape.type}`;
        card.appendChild(header);
        const threeState = this.#initThreeScene(card, shape.type, CARD_3D_SIZE);
        if (threeState) this.#threeStates.set(shape.id, threeState);
        const overlay = document.createElement('div');
        overlay.style.cssText =
            `position:absolute;top:${CARD_3D_HEADER_H}px;left:0;` +
            `width:100%;height:${CARD_3D_SIZE}px;z-index:5;cursor:grab;`;
        card.appendChild(overlay);
        const handle = document.createElement('div');
        handle.className = 'geo-resize-handle';
        handle.textContent = '⌟';
        card.appendChild(handle);
        this.#wire3DCardEvents(card, shape.id, header, overlay, handle, threeState);
        return card;
    }

    #wire3DCardEvents(card, shapeId, header, overlay, handle, threeState) {
        let dragging = false;
        let pStartX = 0, pStartY = 0, sStartX = 0, sStartY = 0;
        header.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            const shape = this.#engine.getReading().shapes.find(s => s.id === shapeId);
            if (!shape) return;
            this.#engine.select(shapeId);
            this.#zCounter += 1;
            card.style.zIndex = String(this.#zCounter);
            dragging = true;
            pStartX = e.clientX; pStartY = e.clientY;
            sStartX = shape.x;   sStartY = shape.y;
            header.setPointerCapture(e.pointerId);
        });
        header.addEventListener('pointermove', e => {
            if (!dragging) return;
            this.#engine.setPosition(shapeId,
                sStartX + (e.clientX - pStartX),
                sStartY + (e.clientY - pStartY));
        });
        const endDrag = e => {
            if (!dragging) return;
            dragging = false;
            try { header.releasePointerCapture(e.pointerId); } catch {}
        };
        header.addEventListener('pointerup', endDrag);
        header.addEventListener('pointercancel', endDrag);

        let rotating = false, prevX = 0, prevY = 0;
        overlay.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            this.#engine.select(shapeId);
            this.#zCounter += 1;
            card.style.zIndex = String(this.#zCounter);
            overlay.setPointerCapture(e.pointerId);
            rotating = true;
            if (threeState) threeState.manualRotating = true;
            prevX = e.clientX; prevY = e.clientY;
            overlay.style.cursor = 'grabbing';
        });
        overlay.addEventListener('pointermove', e => {
            if (!rotating || !threeState) return;
            const dx = e.clientX - prevX, dy = e.clientY - prevY;
            threeState.mesh.rotation.y += dx * 0.01;
            threeState.mesh.rotation.x += dy * 0.01;
            prevX = e.clientX; prevY = e.clientY;
        });
        const endRotate = e => {
            if (!rotating) return;
            rotating = false;
            if (threeState) threeState.manualRotating = false;
            overlay.style.cursor = 'grab';
            try { overlay.releasePointerCapture(e.pointerId); } catch {}
        };
        overlay.addEventListener('pointerup', endRotate);
        overlay.addEventListener('pointercancel', endRotate);

        let resizing = false, rStartX = 0, rStartScale = 1;
        handle.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            const shape = this.#engine.getReading().shapes.find(s => s.id === shapeId);
            if (!shape) return;
            resizing = true;
            rStartX = e.clientX;
            rStartScale = shape.scale;
            handle.setPointerCapture(e.pointerId);
        });
        handle.addEventListener('pointermove', e => {
            if (!resizing) return;
            this.#engine.setScale(shapeId,
                rStartScale + (e.clientX - rStartX) / CARD_3D_SIZE);
        });
        const endResize = e => {
            if (!resizing) return;
            resizing = false;
            try { handle.releasePointerCapture(e.pointerId); } catch {}
        };
        handle.addEventListener('pointerup', endResize);
        handle.addEventListener('pointercancel', endResize);
    }

    #initThreeScene(card, type, size) {
        const THREE = window.THREE;
        if (!THREE) return null;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        camera.position.z = 5;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(size, size);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);
        const canvas = renderer.domElement;
        canvas.style.cssText = `display:block;width:${size}px;height:${size}px;pointer-events:none;`;
        card.appendChild(canvas);
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dl = new THREE.DirectionalLight(0xffffff, 0.8);
        dl.position.set(5,5,5); scene.add(dl);
        const dl2 = new THREE.DirectionalLight(0xffffff, 0.3);
        dl2.position.set(-5,-3,5); scene.add(dl2);
        const shapeMap = {
            cube:     [new THREE.BoxGeometry(2,2,2),         0x4f7c75, false],
            cuboid:   [new THREE.BoxGeometry(2.8,1.8,1.6),   0x5b80a5, false],
            sphere:   [new THREE.SphereGeometry(1.5,32,32),  0xa85c72, false],
            pyramid:  [new THREE.ConeGeometry(1.5,2,4),      0xdec894, true],
            cylinder: [new THREE.CylinderGeometry(1,1,2.5,32), 0x5b80a5, false],
            cone:     [new THREE.ConeGeometry(1,2.5,32),     0x938db3, false],
        };
        const [geo, color, flat] = shapeMap[type] || shapeMap.cube;
        const mat = new THREE.MeshPhongMaterial({
            color, flatShading: flat,
            polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        if (type === 'cube' || type === 'cuboid' || type === 'pyramid') {
            mesh.add(new THREE.LineSegments(
                new THREE.EdgesGeometry(geo),
                new THREE.LineBasicMaterial({ color:0x333333, transparent:true, opacity:0.6 })));
        }
        mesh.rotation.x = 0.4; mesh.rotation.y = 0.5;
        scene.add(mesh);
        const state = { scene, camera, renderer, mesh, canvas, geo, mat,
                        animId: null, manualRotating: false, type };
        const view = this;
        function animate() {
            state.animId = requestAnimationFrame(animate);
            if (view.#autoRotateCache && !state.manualRotating) {
                mesh.rotation.y += 0.006; mesh.rotation.x += 0.002;
            }
            renderer.render(scene, camera);
        }
        animate();
        return state;
    }

    #disposeThreeFor(shapeId) {
        const state = this.#threeStates.get(shapeId);
        if (!state) return;
        if (state.animId) cancelAnimationFrame(state.animId);
        try { state.geo?.dispose(); } catch {}
        try { state.mat?.dispose(); } catch {}
        try { state.renderer?.dispose(); } catch {}
        if (state.canvas && state.canvas.parentNode) {
            state.canvas.parentNode.removeChild(state.canvas);
        }
        this.#threeStates.delete(shapeId);
    }

    #addAngleCard() {
        const ws = this.#els.workspace;
        const cardW = 260, cardH = 258, headerH = 28, svgH = 170;
        const initX = Math.max(10, ws.clientWidth  / 2 - cardW / 2 + (Math.random() * 60 - 30));
        const initY = Math.max(10, ws.clientHeight - cardH - 20     + (Math.random() * 30 - 15));

        const card = document.createElement('div');
        card.className = 'angle-card';
        card.style.cssText =
            `width:${cardW}px;height:${cardH}px;left:${initX}px;top:${initY}px;` +
            `transform-origin:top left;position:absolute;z-index:${++this.#zCounter};`;

        let cardScale = 1;

        // Header
        const header = document.createElement('div');
        header.style.cssText =
            `width:100%;height:${headerH}px;display:flex;align-items:center;` +
            `justify-content:center;font-size:11px;font-weight:700;color:#6a6b70;` +
            `user-select:none;cursor:move;background:rgba(91,128,165,0.12);` +
            `border-bottom:1px solid #d6d4d0;border-radius:14px 14px 0 0;box-sizing:border-box;`;
        header.textContent = '⠿ Vinkel';
        card.appendChild(header);

        // SVG
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('width',   String(cardW));
        svg.setAttribute('height',  String(svgH));
        svg.setAttribute('viewBox', '-10 0 270 170');
        svg.style.cssText = 'display:block;overflow:visible;';
        card.appendChild(svg);

        const vx = 115, vy = 155, rayLen = 120, fixedLen = 128, arcR = 40, sq = 15;

        const mk = (tag, attrs) => {
            const el = document.createElementNS(NS, tag);
            for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
            return el;
        };

        svg.appendChild(mk('line', {
            x1: vx, y1: vy, x2: vx + fixedLen, y2: vy,
            stroke: '#4f7c75', 'stroke-width': '3', 'stroke-linecap': 'round',
        }));
        svg.appendChild(mk('circle', { cx: vx, cy: vy, r: '4', fill: '#4a4b50' }));

        const arcPath = mk('path', {
            fill: 'none', stroke: '#5b80a5', 'stroke-width': '2.5', 'stroke-linecap': 'round',
        });
        svg.appendChild(arcPath);

        const movableRay = mk('line', { stroke: '#a85c72', 'stroke-width': '3', 'stroke-linecap': 'round' });
        svg.appendChild(movableRay);

        const degLabel = mk('text', {
            'text-anchor': 'middle', fill: '#5b80a5', 'font-size': '13',
            'font-weight': '700', 'font-family': 'Nunito,sans-serif', 'pointer-events': 'none',
        });
        svg.appendChild(degLabel);

        const tip = mk('circle', {
            r: '10', fill: '#a85c72', 'fill-opacity': '0.2',
            stroke: '#a85c72', 'stroke-width': '2',
        });
        tip.style.cssText = 'cursor:grab;touch-action:none;';
        svg.appendChild(tip);

        // UI row (input + category label)
        const uiArea = document.createElement('div');
        uiArea.style.cssText =
            'padding:8px 12px;display:flex;flex-direction:column;gap:5px;' +
            'background:white;border-top:1px solid #f0f0ee;border-radius:0 0 14px 14px;';
        uiArea.addEventListener('pointerdown', e => e.stopPropagation());
        card.appendChild(uiArea);

        const inputRow = document.createElement('div');
        inputRow.style.cssText = 'display:flex;align-items:center;gap:8px;';

        const lbl = document.createElement('label');
        lbl.textContent = 'Grader:';
        lbl.style.cssText = 'font-size:12px;font-weight:700;color:#4a4b50;white-space:nowrap;';
        inputRow.appendChild(lbl);

        const inp = document.createElement('input');
        inp.type = 'number'; inp.min = '1'; inp.max = '180'; inp.step = '1';
        inp.style.cssText =
            'width:56px;border:1.5px solid #d6d4d0;border-radius:8px;padding:3px 6px;' +
            'font-size:13px;font-weight:700;color:#4a4b50;text-align:center;' +
            'outline:none;font-family:Nunito,sans-serif;';
        inputRow.appendChild(inp);

        const deg$ = document.createElement('span');
        deg$.textContent = '°';
        deg$.style.cssText = 'font-size:13px;font-weight:700;color:#4a4b50;';
        inputRow.appendChild(deg$);
        uiArea.appendChild(inputRow);

        const catLbl = document.createElement('div');
        catLbl.style.cssText =
            'font-size:12px;font-weight:700;text-align:center;padding:3px 8px;border-radius:8px;';
        uiArea.appendChild(catLbl);

        // Snap + category helpers
        const SNAP = [30, 45, 60, 90, 120, 135, 150];
        const snapDeg = d => { for (const s of SNAP) if (Math.abs(d - s) <= 4) return s; return Math.round(d); };
        const category = d => {
            if (d === 90)  return { text: 'Rät vinkel ∟',  color: '#4f7c75', bg: 'rgba(139,179,156,0.22)' };
            if (d === 180) return { text: 'Rät linje —',   color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };
            if (d < 90)    return { text: 'Spetsig vinkel', color: '#5b80a5', bg: 'rgba(141,177,209,0.22)' };
            return                 { text: 'Trubbig vinkel', color: '#a85c72', bg: 'rgba(213,139,153,0.22)' };
        };

        const update = (deg, skipInput = false) => {
            deg = Math.max(1, Math.min(180, Math.round(deg)));
            const rad = deg * Math.PI / 180;
            const ex = vx + rayLen * Math.cos(rad);
            const ey = vy - rayLen * Math.sin(rad);
            movableRay.setAttribute('x1', vx); movableRay.setAttribute('y1', vy);
            movableRay.setAttribute('x2', ex); movableRay.setAttribute('y2', ey);
            tip.setAttribute('cx', ex); tip.setAttribute('cy', ey);
            if (deg === 90) {
                arcPath.setAttribute('d', `M ${vx+sq},${vy} L ${vx+sq},${vy-sq} L ${vx},${vy-sq}`);
            } else {
                const bx = vx + arcR * Math.cos(rad);
                const by = vy - arcR * Math.sin(rad);
                arcPath.setAttribute('d',
                    `M ${vx+arcR},${vy} A ${arcR},${arcR},0,0,0,${bx.toFixed(2)},${by.toFixed(2)}`);
            }
            const lr = arcR + 18, hr2 = (deg / 2) * Math.PI / 180;
            degLabel.setAttribute('x', (vx + lr * Math.cos(hr2)).toFixed(2));
            degLabel.setAttribute('y', (vy - lr * Math.sin(hr2) + 5).toFixed(2));
            degLabel.textContent = deg + '°';
            const cat = category(deg);
            catLbl.textContent = cat.text;
            catLbl.style.color = cat.color;
            catLbl.style.background = cat.bg;
            if (!skipInput) inp.value = deg;
        };

        inp.addEventListener('input', () => {
            const v = parseInt(inp.value, 10);
            if (!isNaN(v) && v >= 1 && v <= 180) update(v, true);
        });
        inp.addEventListener('blur', () => {
            let v = parseInt(inp.value, 10);
            update(isNaN(v) ? 1 : v);
            inp.style.borderColor = '#d6d4d0';
        });
        inp.addEventListener('focus', () => { inp.style.borderColor = '#5b80a5'; });

        // Tip drag — adjusts the angle
        tip.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            e.preventDefault(); e.stopPropagation();
            tip.setPointerCapture(e.pointerId);
            tip.style.cursor = 'grabbing';
            const onMove = ev => {
                const rect = svg.getBoundingClientRect();
                const mx = (ev.clientX - rect.left) / rect.width * 270 - 10;
                const my = (ev.clientY - rect.top)  / rect.height * 170;
                const raw = Math.atan2(vy - my, mx - vx) * 180 / Math.PI;
                update(snapDeg(Math.max(1, Math.min(180, raw))));
            };
            const onUp = () => { tip.style.cursor = 'grab'; };
            tip.addEventListener('pointermove', onMove);
            tip.addEventListener('pointerup',     onUp, { once: true });
            tip.addEventListener('pointercancel', onUp, { once: true });
        });

        // Resize handle
        const rh = document.createElement('div');
        rh.className = 'geo-resize-handle';
        rh.textContent = '⌟';
        let rhStartX = 0, rhScale0 = 1;
        rh.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            e.preventDefault(); e.stopPropagation();
            rhStartX = e.clientX; rhScale0 = cardScale;
            rh.setPointerCapture(e.pointerId);
        });
        rh.addEventListener('pointermove', e => {
            cardScale = Math.max(0.4, Math.min(4, rhScale0 + (e.clientX - rhStartX) / cardW));
            card.style.transform = `scale(${cardScale})`;
        });
        rh.addEventListener('pointerup', () => {});
        card.appendChild(rh);

        // Card drag via header
        let cdDrag = false, cdSX = 0, cdSY = 0, cdEX = initX, cdEY = initY;
        header.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            cdDrag = true;
            cdSX = e.clientX; cdSY = e.clientY;
            cdEX = parseFloat(card.style.left) || 0;
            cdEY = parseFloat(card.style.top)  || 0;
            this.#zCounter += 1;
            card.style.zIndex = String(this.#zCounter);
            header.setPointerCapture(e.pointerId);
        });
        header.addEventListener('pointermove', e => {
            if (!cdDrag) return;
            card.style.left = (cdEX + e.clientX - cdSX) + 'px';
            card.style.top  = (cdEY + e.clientY - cdSY) + 'px';
        });
        const endDrag = e => {
            if (!cdDrag) return;
            cdDrag = false;
            try { header.releasePointerCapture(e.pointerId); } catch {}
        };
        header.addEventListener('pointerup',     endDrag);
        header.addEventListener('pointercancel', endDrag);

        ws.appendChild(card);
        this.#angleEls.push(card);
        update(45);
    }

    #disposeAllThree() {
        for (const id of [...this.#threeStates.keys()]) this.#disposeThreeFor(id);
    }

    #renderFormulaPanel(reading) {
        const area = this.#els.formulaArea;
        const selected = reading.selectedId == null
            ? null
            : reading.shapes.find(s => s.id === reading.selectedId);
        area.innerHTML = '';
        if (!selected) {
            area.innerHTML = '<span style="color:#8c8d92;font-style:italic;font-size:11px;">Välj en form för att se formler.</span>';
            return;
        }
        const spec = getFormulaSpec(selected, reading.unit);
        if (!spec.hasContent) {
            area.innerHTML = '<span style="color:#8c8d92;font-style:italic;font-size:11px;">Inga formler tillgängliga.</span>';
            return;
        }
        for (const row of spec.rows) {
            const rowEl = document.createElement('div');
            rowEl.className = 'calcGeo_row';
            const lbl = document.createElement('div');
            lbl.className = 'calcGeo_lbl';
            lbl.textContent = row.label;
            rowEl.appendChild(lbl);
            const line = document.createElement('div');
            line.className = 'calcGeo_line';
            for (const part of row.parts) {
                if (part.type === 'text') {
                    line.appendChild(document.createTextNode(part.value));
                } else if (part.type === 'var') {
                    const span = document.createElement('span');
                    span.className = 'calcGeo_var';
                    span.textContent = part.text;
                    span.style.color = part.color || '#5b80a5';
                    span.dataset.dimKey = part.key;
                    span.addEventListener('mouseenter', () => {
                        span.style.color = '#dc2626';
                        this.#highlightDim(selected.id, part.key, true);
                    });
                    span.addEventListener('mouseleave', () => {
                        span.style.color = part.color || '#5b80a5';
                        this.#highlightDim(selected.id, part.key, false);
                    });
                    line.appendChild(span);
                }
            }
            rowEl.appendChild(line);
            area.appendChild(rowEl);
        }
        if (spec.inputs.length > 0) {
            const inpRow = document.createElement('div');
            inpRow.className = 'calcGeo_inprow';
            for (const inp of spec.inputs) {
                const lblEl = document.createElement('span');
                lblEl.className = 'calcGeo_dimLbl';
                lblEl.textContent = inp.label;
                inpRow.appendChild(lblEl);
                const input = document.createElement('input');
                input.type = 'number';
                input.value = inp.value;
                input.min = '0.01';
                input.step = '0.1';
                input.className = 'calcGeo_inp';
                input.title = reading.unit;
                input.addEventListener('change', () => {
                    const raw = parseFloat(input.value);
                    if (!Number.isFinite(raw) || raw <= 0) return;
                    let vcm = unitToCm(raw, reading.unit);
                    if (inp.specialKey === 'd_circle') vcm = vcm / 2;
                    this.#engine.setDimension(selected.id, inp.key, vcm);
                });
                inpRow.appendChild(input);
            }
            area.appendChild(inpRow);
        }
    }

    #highlightDim(shapeId, dimKey, on) {
        const wrapper = this.#shapeEls.get(shapeId);
        if (!wrapper) return;
        const svg = wrapper.querySelector('svg');
        if (!svg) return;
        const dimLine = svg.querySelector(`[data-dim="${dimKey}"]`);
        if (dimLine) {
            dimLine.style.stroke = on ? '#dc2626' : '';
            dimLine.style.strokeWidth = on ? '5' : '';
            return;
        }
        const shapeEl = svg.querySelector('circle, rect, polygon');
        if (!shapeEl) return;
        if (on) {
            if (!shapeEl.dataset.origStroke)
                shapeEl.dataset.origStroke = shapeEl.getAttribute('stroke') || '#000000';
            shapeEl.setAttribute('stroke', '#dc2626');
            shapeEl.setAttribute('stroke-width', '5');
        } else {
            if (shapeEl.dataset.origStroke)
                shapeEl.setAttribute('stroke', shapeEl.dataset.origStroke);
            shapeEl.setAttribute('stroke-width', '2');
        }
    }

    // ─── Stage 4: presentation overlay ──────────────────────────────────

    #showPresentation() {
        if (this.#presentationEl) return;
        const el = document.createElement('div');
        el.id = PRES_OVERLAY_ID;
        el.style.cssText =
            'position:fixed;top:16px;right:16px;z-index:9000;background:#fff;' +
            'border:3px solid #5b80a5;border-radius:16px;padding:24px 28px 18px;' +
            'min-width:300px;max-width:520px;box-shadow:0 8px 36px rgba(0,0,0,0.20);';
        el.innerHTML =
            '<button data-role="pres-close" style="position:absolute;top:10px;right:14px;' +
            'background:none;border:none;font-size:22px;cursor:pointer;color:#8c8d92;' +
            'line-height:1;" title="Stäng">✕</button>' +
            '<div style="font-size:11px;font-weight:800;color:#5b80a5;text-transform:uppercase;' +
            'letter-spacing:.08em;margin-bottom:14px;">📐 Presentationsläge</div>' +
            '<div data-role="pres-content"></div>';
        document.body.appendChild(el);
        this.#presentationEl = el;
        el.querySelector('[data-role="pres-close"]').addEventListener('click', () => {
            this.#engine.setPresentationOpen(false);
        });
    }

    #hidePresentation() {
        this.#removePresentationOverlay();
    }

    #removePresentationOverlay() {
        if (this.#presentationEl) {
            this.#presentationEl.remove();
            this.#presentationEl = null;
        }
    }

    #syncPresentationButtonLabel(isOpen) {
        if (this.#els.presBtnIcon) {
            this.#els.presBtnIcon.className = isOpen
                ? 'fas fa-compress-alt text-xs'
                : 'fas fa-expand-alt text-xs';
        }
        if (this.#els.presBtnLabel) {
            this.#els.presBtnLabel.textContent = isOpen ? 'Minimera' : 'Expandera formel';
        }
    }

    #renderPresentationContent(reading) {
        if (!this.#presentationEl) return;
        const content = this.#presentationEl.querySelector('[data-role="pres-content"]');
        if (!content) return;
        const selected = reading.selectedId == null
            ? null
            : reading.shapes.find(s => s.id === reading.selectedId);
        if (!selected || !reading.showFormulas) {
            content.innerHTML =
                '<em style="color:#8c8d92;font-size:16px;">Välj en form och aktivera "Visa formler".</em>';
            return;
        }
        const spec = getFormulaSpec(selected, reading.unit);
        if (!spec.hasContent) {
            content.innerHTML =
                '<em style="color:#8c8d92;font-size:16px;">Inga formler tillgängliga.</em>';
            return;
        }
        content.innerHTML = '';
        for (const row of spec.rows) {
            const rowEl = document.createElement('div');
            rowEl.style.cssText =
                'border-bottom:2px solid #eeece8;padding-bottom:10px;margin-bottom:10px;';
            const lbl = document.createElement('div');
            lbl.style.cssText =
                'font-size:13px;font-weight:800;color:#8c8d92;' +
                'text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;';
            lbl.textContent = row.label;
            rowEl.appendChild(lbl);
            const line = document.createElement('div');
            line.style.cssText =
                'font-size:30px;font-weight:800;color:#4a4b50;line-height:1.4;' +
                'display:flex;flex-wrap:wrap;align-items:center;gap:3px;';
            for (const part of row.parts) {
                if (part.type === 'text') {
                    line.appendChild(document.createTextNode(part.value));
                } else if (part.type === 'var') {
                    const span = document.createElement('span');
                    span.textContent = part.text;
                    span.style.color = part.color || '#5b80a5';
                    span.style.fontSize = '30px';
                    span.style.cursor = 'default';
                    span.addEventListener('mouseenter', () => {
                        span.style.color = '#dc2626';
                        this.#highlightDim(selected.id, part.key, true);
                    });
                    span.addEventListener('mouseleave', () => {
                        span.style.color = part.color || '#5b80a5';
                        this.#highlightDim(selected.id, part.key, false);
                    });
                    line.appendChild(span);
                }
            }
            rowEl.appendChild(line);
            content.appendChild(rowEl);
        }
        if (content.lastElementChild) {
            content.lastElementChild.style.borderBottom = 'none';
        }
    }
}

function shape2dSvg(type, dimensions) {
    const dl = (dim, x1, y1, x2, y2) =>
        `<line data-dim="${dim}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="2"/>`;
    switch (type) {
        case 'square':
            return `<rect x="10" y="10" width="100" height="100" fill="#ffffff" stroke="#000000" stroke-width="2"/>` +
                   dl('a', 10, 115, 110, 115);
        case 'circle':
            return `<circle cx="60" cy="60" r="50" fill="#ffffff" stroke="#000000" stroke-width="2"/>` +
                   dl('r', 60, 60, 110, 60);
        case 'triangle': {
            const b = (dimensions?.b || 10), h = (dimensions?.h || 9);
            const bU = Math.min(110, b * 10);
            const hU = Math.min(110, h * 10);
            const baseY = 10 + hU;
            const x1 = 60 - bU / 2;
            const x2 = 60 + bU / 2;
            return `<polygon points="60,10 ${x2},${baseY} ${x1},${baseY}" fill="#ffffff" stroke="#000000" stroke-width="2" stroke-linejoin="round"/>` +
                   dl('b', x1, baseY, x2, baseY) +
                   dl('h', 60, 10, 60, baseY);
        }
        case 'rectangle': {
            const b = (dimensions?.b || 11), h = (dimensions?.h || 7);
            const bU = Math.min(110, b * 10);
            const hU = Math.min(90, h * 10);
            const x = 60 - bU / 2;
            const y = 60 - hU / 2;
            return `<rect x="${x}" y="${y}" width="${bU}" height="${hU}" fill="#ffffff" stroke="#000000" stroke-width="2"/>` +
                   dl('b', x, y + hU + 5, x + bU, y + hU + 5) +
                   dl('h', x - 5, y, x - 5, y + hU);
        }
        case 'pentagon': {
            const pts = Array.from({ length: 5 }, (_, i) => {
                const a = (i * 72 - 90) * Math.PI / 180;
                return `${(60 + 50 * Math.cos(a)).toFixed(1)},${(60 + 50 * Math.sin(a)).toFixed(1)}`;
            }).join(' ');
            const p0x = 60 + 50 * Math.cos(-90 * Math.PI / 180);
            const p0y = 60 + 50 * Math.sin(-90 * Math.PI / 180);
            const p1x = 60 + 50 * Math.cos(-18 * Math.PI / 180);
            const p1y = 60 + 50 * Math.sin(-18 * Math.PI / 180);
            return `<polygon points="${pts}" fill="#ffffff" stroke="#000000" stroke-width="2"/>` +
                   dl('a', p0x.toFixed(1), p0y.toFixed(1), p1x.toFixed(1), p1y.toFixed(1));
        }
        case 'hexagon': {
            const pts = Array.from({ length: 6 }, (_, i) => {
                const a = (i * 60 - 90) * Math.PI / 180;
                return `${(60 + 50 * Math.cos(a)).toFixed(1)},${(60 + 50 * Math.sin(a)).toFixed(1)}`;
            }).join(' ');
            const q0x = 60 + 50 * Math.cos(-90 * Math.PI / 180);
            const q0y = 60 + 50 * Math.sin(-90 * Math.PI / 180);
            const q1x = 60 + 50 * Math.cos(-30 * Math.PI / 180);
            const q1y = 60 + 50 * Math.sin(-30 * Math.PI / 180);
            return `<polygon points="${pts}" fill="#ffffff" stroke="#000000" stroke-width="2"/>` +
                   dl('a', q0x.toFixed(1), q0y.toFixed(1), q1x.toFixed(1), q1y.toFixed(1));
        }
        case 'rhombus': {
            const d1 = (dimensions?.d1 || 10.4), d2 = (dimensions?.d2 || 10);
            const d1U = Math.min(110, d1 * 10);
            const d2U = Math.min(110, d2 * 10);
            const top    = 60 - d1U / 2;
            const bot    = 60 + d1U / 2;
            const left   = 60 - d2U / 2;
            const right  = 60 + d2U / 2;
            return `<polygon points="60,${top} ${right},60 60,${bot} ${left},60" fill="#ffffff" stroke="#000000" stroke-width="2"/>` +
                   dl('d1', 60, top, 60, bot) +
                   dl('d2', left, 60, right, 60);
        }
        case 'parallelogram': {
            const b = (dimensions?.b || 9), h = (dimensions?.h || 8);
            const bU = Math.min(95, b * 10);
            const hU = Math.min(85, h * 10);
            const slant = bU * 0.2;
            const yTop = 60 - hU / 2;
            const yBot = 60 + hU / 2;
            const xTL = 60 - bU / 2 + slant;
            const xTR = xTL + bU;
            const xBL = xTL - slant * 2;
            const xBR = xTR - slant * 2;
            return `<polygon points="${xBL},${yBot} ${xTL},${yTop} ${xTR},${yTop} ${xBR},${yBot}" fill="#ffffff" stroke="#000000" stroke-width="2"/>` +
                   dl('b', xBL, yBot + 5, xBR, yBot + 5) +
                   dl('h', xTR + 5, yTop, xTR + 5, yBot);
        }
        default:
            return '';
    }
}
