import { KoordinatEngine } from './KoordinatEngine.js';

const PAD = 52;
const SVG_W = 600;
const SVG_H = 600;

function koordToSvg(v, min, max) {
    const range = max - min;
    return PAD + ((v - min) / range) * (SVG_W - 2 * PAD);
}

function svgToKoord(px, min, max) {
    const range = max - min;
    return min + ((px - PAD) / (SVG_W - 2 * PAD)) * range;
}

export class KoordinatView {
    #engine;
    #root = null;
    #svg = null;
    #labelInput = null;
    #ptList = null;
    #coordDisplay = null;
    #dragging = null;

    constructor(engine) {
        this.#engine = engine;
    }

    mount(parentEl) {
        this.#root = document.createElement('section');
        this.#root.className = 'tool-view flex flex-row h-full overflow-hidden';

        this.#root.innerHTML = `
            <aside class="tool-sidebar flex flex-col gap-3 p-3 overflow-y-auto" style="min-width:210px;max-width:210px;">
                <div class="text-xs font-bold text-muted uppercase tracking-wide">Läge</div>
                <div class="flex gap-2">
                    <button data-mode="q1" class="flex-1 px-2 py-1 rounded font-bold text-sm border-2 border-blue-400 bg-blue-50 text-blue-700">Kv. I (0–10)</button>
                    <button data-mode="all" class="flex-1 px-2 py-1 rounded font-bold text-sm border-2 border-gray-300 text-gray-600 bg-white">Alla (±10)</button>
                </div>
                <hr/>
                <div class="text-xs font-bold text-muted uppercase tracking-wide">Lägg till punkt</div>
                <div class="flex flex-col gap-1">
                    <div class="flex gap-1 items-center text-sm">
                        <span class="w-6 text-right text-gray-500">x</span>
                        <input id="koord-x" type="number" step="1" class="tool-input w-full px-2 py-1 rounded border text-sm" placeholder="0"/>
                    </div>
                    <div class="flex gap-1 items-center text-sm">
                        <span class="w-6 text-right text-gray-500">y</span>
                        <input id="koord-y" type="number" step="1" class="tool-input w-full px-2 py-1 rounded border text-sm" placeholder="0"/>
                    </div>
                    <div class="flex gap-1 items-center text-sm">
                        <span class="w-6 text-right text-gray-500">P</span>
                        <input id="koord-label" type="text" maxlength="3" class="tool-input w-full px-2 py-1 rounded border text-sm" placeholder="A"/>
                    </div>
                    <button id="koord-add" class="tool-btn mt-1">Lägg till</button>
                </div>
                <hr/>
                <div class="flex gap-2 flex-wrap text-xs">
                    <label class="flex items-center gap-1 cursor-pointer"><input id="koord-show-grid" type="checkbox" checked class="mr-1"/>Rutnät</label>
                    <label class="flex items-center gap-1 cursor-pointer"><input id="koord-show-labels" type="checkbox" checked class="mr-1"/>Etiketter</label>
                </div>
                <hr/>
                <div class="text-xs font-bold text-muted uppercase tracking-wide">Punkter</div>
                <div id="koord-pt-list" class="flex flex-col gap-1 overflow-y-auto" style="max-height:160px;"></div>
                <button id="koord-clear" class="tool-btn-danger mt-auto">Rensa alla</button>
                <div id="koord-coord-display" class="text-xs text-gray-500 text-center min-h-4"></div>
                <div class="text-xs text-muted bg-blue-50 rounded p-2 mt-1">
                    💡 Klicka i koordinatsystemet för att lägga till en punkt. Dra en punkt för att flytta den.
                </div>
            </aside>
            <div class="flex-1 flex items-center justify-center overflow-hidden bg-gray-50 p-2">
                <svg id="koord-svg" viewBox="0 0 ${SVG_W} ${SVG_H}"
                     style="width:100%;height:100%;max-width:${SVG_W}px;max-height:${SVG_H}px;touch-action:none;"
                     xmlns="http://www.w3.org/2000/svg"></svg>
            </div>`;

        this.#svg = this.#root.querySelector('#koord-svg');
        this.#labelInput = this.#root.querySelector('#koord-label');
        this.#ptList = this.#root.querySelector('#koord-pt-list');
        this.#coordDisplay = this.#root.querySelector('#koord-coord-display');

        this.#bindSidebarEvents();
        this.#bindSvgEvents();

        this.#engine.subscribe(() => this.#render());
        this.#render();

        parentEl.appendChild(this.#root);
        return this.#root;
    }

    #bindSidebarEvents() {
        this.#root.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => this.#engine.setMode(btn.dataset.mode));
        });

        this.#root.querySelector('#koord-add').addEventListener('click', () => {
            const xInput = this.#root.querySelector('#koord-x');
            const yInput = this.#root.querySelector('#koord-y');
            const x = parseFloat(xInput.value);
            const y = parseFloat(yInput.value);
            const label = this.#labelInput.value.trim() || this.#engine.nextAutoLabel();
            if (isNaN(x) || isNaN(y)) return;
            const pt = this.#engine.addPoint(x, y, label);
            if (pt) {
                xInput.value = '';
                yInput.value = '';
                this.#labelInput.value = '';
            }
        });

        this.#root.querySelector('#koord-clear').addEventListener('click', () => this.#engine.clearPoints());
        this.#root.querySelector('#koord-show-grid').addEventListener('change', e => this.#engine.setShowGrid(e.target.checked));
        this.#root.querySelector('#koord-show-labels').addEventListener('change', e => this.#engine.setShowLabels(e.target.checked));
    }

    #bindSvgEvents() {
        const svg = this.#svg;

        svg.addEventListener('pointerdown', e => {
            const pt = this.#hitTest(e);
            if (pt) {
                this.#dragging = { id: pt.id, startX: e.clientX, startY: e.clientY };
                svg.setPointerCapture(e.pointerId);
                e.preventDefault();
            } else {
                const [kx, ky] = this.#svgEventToKoord(e);
                if (kx !== null) {
                    const { min, max } = this.#engine.getRange();
                    const rx = Math.round(Math.max(min, Math.min(max, kx)));
                    const ry = Math.round(Math.max(min, Math.min(max, ky)));
                    const label = this.#labelInput.value.trim() || this.#engine.nextAutoLabel();
                    const added = this.#engine.addPoint(rx, ry, label);
                    if (added) this.#labelInput.value = '';
                }
            }
        });

        svg.addEventListener('pointermove', e => {
            if (this.#dragging) {
                const [kx, ky] = this.#svgEventToKoord(e);
                if (kx !== null) {
                    const { min, max } = this.#engine.getRange();
                    const rx = Math.round(Math.max(min, Math.min(max, kx)));
                    const ry = Math.round(Math.max(min, Math.min(max, ky)));
                    this.#engine.movePoint(this.#dragging.id, rx, ry);
                }
            } else {
                const [kx, ky] = this.#svgEventToKoord(e);
                if (kx !== null) {
                    const rx = Math.round(kx * 10) / 10;
                    const ry = Math.round(ky * 10) / 10;
                    this.#coordDisplay.textContent = `(${rx}, ${ry})`;
                } else {
                    this.#coordDisplay.textContent = '';
                }
            }
        });

        svg.addEventListener('pointerup', () => { this.#dragging = null; });
        svg.addEventListener('pointercancel', () => { this.#dragging = null; });
    }

    #svgEventToKoord(e) {
        const rect = this.#svg.getBoundingClientRect();
        if (!rect.width) return [null, null];
        const scaleX = SVG_W / rect.width;
        const scaleY = SVG_H / rect.height;
        const px = (e.clientX - rect.left) * scaleX;
        const py = (e.clientY - rect.top) * scaleY;
        const { min, max } = this.#engine.getRange();
        const kx = svgToKoord(px, min, max);
        const ky = svgToKoord(SVG_H - py, min, max);
        return [kx, ky];
    }

    #hitTest(e) {
        const [kx, ky] = this.#svgEventToKoord(e);
        if (kx === null) return null;
        const { min, max } = this.#engine.getRange();
        const state = this.#engine.getState();
        for (const pt of [...state.points].reverse()) {
            const dx = kx - pt.x;
            const dy = ky - pt.y;
            const range = max - min;
            const threshold = 12 * range / (SVG_W - 2 * PAD);
            if (Math.abs(dx) <= threshold && Math.abs(dy) <= threshold) return pt;
        }
        return null;
    }

    #render() {
        const state = this.#engine.getState();
        const { min, max } = this.#engine.getRange();

        this.#root.querySelectorAll('[data-mode]').forEach(btn => {
            const active = btn.dataset.mode === state.mode;
            btn.className = `flex-1 px-2 py-1 rounded font-bold text-sm border-2 ${active ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 bg-white'}`;
        });

        this.#renderSvg(state, min, max);
        this.#renderPointList(state);
    }

    #renderSvg(state, min, max) {
        const { points, showGrid, showLabels } = state;
        const toX = v => koordToSvg(v, min, max);
        const toY = v => SVG_H - koordToSvg(v, min, max);

        let html = '';

        if (showGrid) {
            for (let v = min; v <= max; v++) {
                const isMajor = v % 5 === 0;
                const px = toX(v);
                const py = toY(v);
                html += `<line x1="${px}" y1="${PAD}" x2="${px}" y2="${SVG_H - PAD}" stroke="${isMajor ? '#b0b8c8' : '#dde3ec'}" stroke-width="${isMajor ? 1.2 : 0.7}"/>`;
                html += `<line x1="${PAD}" y1="${py}" x2="${SVG_W - PAD}" y2="${py}" stroke="${isMajor ? '#b0b8c8' : '#dde3ec'}" stroke-width="${isMajor ? 1.2 : 0.7}"/>`;
            }
        }

        // Axes
        const zero = min <= 0 && 0 <= max;
        if (zero) {
            const ax = toX(0);
            const ay = toY(0);
            html += `<line x1="${ax}" y1="${PAD - 10}" x2="${ax}" y2="${SVG_H - PAD + 10}" stroke="#333" stroke-width="2.2"/>`;
            html += `<line x1="${PAD - 10}" y1="${ay}" x2="${SVG_W - PAD + 10}" y2="${ay}" stroke="#333" stroke-width="2.2"/>`;
            html += `<polygon points="${ax},${PAD - 20} ${ax - 6},${PAD - 6} ${ax + 6},${PAD - 6}" fill="#333"/>`;
            html += `<polygon points="${SVG_W - PAD + 20},${ay} ${SVG_W - PAD + 6},${ay - 6} ${SVG_W - PAD + 6},${ay + 6}" fill="#333"/>`;
            html += `<text x="${ax + 10}" y="${PAD - 14}" font-size="15" font-weight="bold" fill="#333">y</text>`;
            html += `<text x="${SVG_W - PAD + 14}" y="${ay - 6}" font-size="15" font-weight="bold" fill="#333">x</text>`;
        } else {
            html += `<line x1="${PAD}" y1="${PAD - 10}" x2="${PAD}" y2="${SVG_H - PAD}" stroke="#333" stroke-width="2.2"/>`;
            html += `<line x1="${PAD}" y1="${SVG_H - PAD}" x2="${SVG_W - PAD + 10}" y2="${SVG_H - PAD}" stroke="#333" stroke-width="2.2"/>`;
            html += `<polygon points="${PAD},${PAD - 20} ${PAD - 6},${PAD - 6} ${PAD + 6},${PAD - 6}" fill="#333"/>`;
            html += `<polygon points="${SVG_W - PAD + 20},${SVG_H - PAD} ${SVG_W - PAD + 6},${SVG_H - PAD - 6} ${SVG_W - PAD + 6},${SVG_H - PAD + 6}" fill="#333"/>`;
            html += `<text x="${PAD + 10}" y="${PAD - 14}" font-size="15" font-weight="bold" fill="#333">y</text>`;
            html += `<text x="${SVG_W - PAD + 14}" y="${SVG_H - PAD - 6}" font-size="15" font-weight="bold" fill="#333">x</text>`;
        }

        // Tick marks and numbers
        for (let v = min; v <= max; v++) {
            const isMajor = v % (max - min > 10 ? 5 : 1) === 0 || (max - min) <= 10;
            if (!isMajor) continue;
            const px = toX(v);
            const py = toY(v);
            const origin = min <= 0 ? 0 : min;
            const ax = toX(origin);
            const ay = toY(origin);
            if (v !== origin) {
                html += `<line x1="${px}" y1="${ay - 5}" x2="${px}" y2="${ay + 5}" stroke="#333" stroke-width="1.5"/>`;
                html += `<text x="${px}" y="${ay + 18}" text-anchor="middle" font-size="11" fill="#555">${v}</text>`;
                html += `<line x1="${ax - 5}" y1="${py}" x2="${ax + 5}" y2="${py}" stroke="#333" stroke-width="1.5"/>`;
                html += `<text x="${ax - 14}" y="${py + 4}" text-anchor="middle" font-size="11" fill="#555">${v}</text>`;
            } else if (min < 0) {
                html += `<text x="${px - 10}" y="${py + 16}" text-anchor="middle" font-size="11" fill="#555">0</text>`;
            }
        }

        // Points
        for (const pt of points) {
            const px = toX(pt.x);
            const py = toY(pt.y);
            html += `<circle cx="${px}" cy="${py}" r="8" fill="${pt.color}" stroke="white" stroke-width="2.5" style="cursor:grab;"/>`;
            if (showLabels) {
                html += `<text x="${px + 12}" y="${py - 8}" font-size="14" font-weight="bold" fill="${pt.color}">${pt.label}</text>`;
            }
        }

        this.#svg.innerHTML = html;
    }

    #renderPointList(state) {
        this.#ptList.innerHTML = '';
        for (const pt of state.points) {
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between gap-1 text-xs rounded px-1 py-0.5 bg-gray-50';
            row.innerHTML = `
                <span class="w-4 h-4 rounded-full inline-block" style="background:${pt.color};"></span>
                <span class="font-bold" style="color:${pt.color};">${pt.label}</span>
                <span class="text-gray-600 flex-1 text-center">(${pt.x}, ${pt.y})</span>
                <button class="text-red-400 hover:text-red-600 font-bold px-1" data-remove="${pt.id}">✕</button>`;
            row.querySelector('[data-remove]').addEventListener('click', () => this.#engine.removePoint(pt.id));
            this.#ptList.appendChild(row);
        }
    }

    render() { this.#render(); }
}
