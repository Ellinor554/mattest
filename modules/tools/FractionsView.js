// ─── Constants ────────────────────────────────────────────────────────────────

const FRAC_DEFS = [
    { d: 1,  color: '#6a6281', label: 'Hel (1/1)' },
    { d: 2,  color: '#a85c72', label: 'Halvor (1/2)' },
    { d: 3,  color: '#5b80a5', label: 'Tredjedelar (1/3)' },
    { d: 4,  color: '#4f7c75', label: 'Fjärdedelar (1/4)' },
    { d: 5,  color: '#dec894', label: 'Femtedelar (1/5)' },
    { d: 6,  color: '#8db1d1', label: 'Sjättedelar (1/6)' },
    { d: 8,  color: '#8bb39c', label: 'Åttondelar (1/8)' },
    { d: 10, color: '#d58b99', label: 'Tiondelar (1/10)' },
    { d: 12, color: '#938db3', label: 'Tolftedelar (1/12)' },
];

const FRAC_R           = 72;
const FRAC_SVG         = FRAC_R * 2 + 8;   // 152
const FRAC_BOARD_SCALE = 1.5;

// ─── Pure module-level helpers ────────────────────────────────────────────────

function fracPolarXY(cx, cy, r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function formatFracDecimal(d) {
    const val = 1 / d;
    let str = val.toFixed(3);
    str = str.replace(/(\.\d*[1-9])0+$/, '$1').replace(/\.(0+)$/, '.0');
    return str.replace('.', ',');
}

function formatFracPercent(d) {
    const pct = 100 / d;
    if (Number.isInteger(pct)) return pct + '%';
    return pct.toFixed(1).replace('.', ',') + '%';
}

function getFracLabels(d, showDecimal, showPercent) {
    const labels = [];
    if (d === 1) {
        labels.push('1');
        if (showDecimal) labels.push('1,0');
        if (showPercent) labels.push('100%');
    } else {
        labels.push('1/' + d);
        if (showDecimal) labels.push(formatFracDecimal(d));
        if (showPercent) labels.push(formatFracPercent(d));
    }
    return labels;
}

function buildStackedLabels(px, py, labels, fs, textColor) {
    if (labels.length === 0) return '';
    const spacing = fs * 1.3;
    let result = '';
    for (let i = 0; i < labels.length; i++) {
        const centerY = py - (labels.length - 1) / 2 * spacing + i * spacing;
        const y = centerY + fs * 0.35;
        result += `<text x="${px}" y="${y}" text-anchor="middle" font-family="Nunito,sans-serif" font-size="${fs}" font-weight="800" fill="${textColor}" pointer-events="none">${labels[i]}</text>`;
    }
    return result;
}

function buildCircleSVG(d, color, showDecimal, showPercent, n = d) {
    const cx = FRAC_R + 4, cy = FRAC_R + 4, r = FRAC_R;
    const textColor  = color === '#dec894' ? '#5a4a1a' : '#ffffff';
    const angleStep  = 360 / d;
    const labels     = getFracLabels(d, showDecimal, showPercent);
    let paths = '';
    if (d === 1) {
        const filled = n >= 1;
        paths  = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="${filled ? 1 : 0.15}" stroke="${filled ? 'white' : '#d6d4d0'}" stroke-width="2.5"/>`;
        if (filled) {
            const fs = labels.length <= 1 ? 22 : labels.length === 2 ? 18 : 14;
            paths += buildStackedLabels(cx, cy, labels, fs, textColor);
        }
    } else {
        for (let i = 0; i < d; i++) {
            const filled = i < n;
            const startA = i * angleStep, endA = startA + angleStep;
            const p1 = fracPolarXY(cx, cy, r, startA);
            const p2 = fracPolarXY(cx, cy, r, endA);
            const lg = angleStep > 180 ? 1 : 0;
            paths += `<path d="M${cx},${cy} L${p1.x},${p1.y} A${r},${r},0,${lg},1,${p2.x},${p2.y}Z" fill="${color}" fill-opacity="${filled ? 1 : 0.15}" stroke="${filled ? 'white' : '#d6d4d0'}" stroke-width="2.5" data-slice="${i}" class="frac-slice"/>`;
            if (filled) {
                const lp = fracPolarXY(cx, cy, r * 0.62, startA + angleStep / 2);
                const fsBase = d <= 4 ? 16 : d <= 8 ? 13 : 11;
                const fs = labels.length >= 3 ? Math.max(8, fsBase - 2) : fsBase;
                paths += buildStackedLabels(lp.x, lp.y, labels, fs, textColor);
            }
        }
    }
    return `<svg width="${FRAC_SVG}" height="${FRAC_SVG}" viewBox="0 0 ${FRAC_SVG} ${FRAC_SVG}" style="overflow:visible;display:block;">${paths}</svg>`;
}

function buildLooseSliceSVG(d, sliceIndex, color, showDecimal, showPercent) {
    const cx = FRAC_R + 4, cy = FRAC_R + 4, r = FRAC_R;
    const textColor = color === '#dec894' ? '#5a4a1a' : '#ffffff';
    const angleStep = 360 / d;
    const startA    = sliceIndex * angleStep;
    const p1        = fracPolarXY(cx, cy, r, startA);
    const p2        = fracPolarXY(cx, cy, r, startA + angleStep);
    const lg        = angleStep > 180 ? 1 : 0;
    const lp        = fracPolarXY(cx, cy, r * 0.62, startA + angleStep / 2);
    const labels    = getFracLabels(d, showDecimal, showPercent);
    const fsBase    = d <= 4 ? 16 : d <= 8 ? 13 : 11;
    const fs        = labels.length >= 3 ? Math.max(8, fsBase - 2) : fsBase;
    const path      = `<path d="M${cx},${cy} L${p1.x},${p1.y} A${r},${r},0,${lg},1,${p2.x},${p2.y}Z" fill="${color}" stroke="white" stroke-width="2.5"/>`;
    return `<svg width="${FRAC_SVG}" height="${FRAC_SVG}" viewBox="0 0 ${FRAC_SVG} ${FRAC_SVG}" style="overflow:visible;display:block;">${path}${buildStackedLabels(lp.x, lp.y, labels, fs, textColor)}</svg>`;
}

// ─── FractionsView ────────────────────────────────────────────────────────────

export class FractionsView {
    #engine;
    #unsubscribe  = null;
    #root         = null;
    #workspace    = null;

    // Display state (kept in sync with engine)
    #showDecimal  = false;
    #showPercent  = false;

    // Drag state
    #fracDrag        = null;
    #zIndexCounter   = 100;

    // Bound handler references kept for cleanup
    #boundOnMove;
    #boundOnUp;

    constructor(engine) {
        this.#engine      = engine;
        this.#boundOnMove = (e) => this.#fracOnMove(e);
        this.#boundOnUp   = (e) => this.#fracOnUp(e);
    }

    mount(parentEl) {
        this.#root = this.#buildDOM();
        parentEl.appendChild(this.#root);

        // Global pointer handlers — catch drags that escape the workspace
        document.addEventListener('pointermove',   this.#boundOnMove);
        document.addEventListener('pointerup',     this.#boundOnUp);
        document.addEventListener('pointercancel', this.#boundOnUp);

        this.#unsubscribe = this.#engine.subscribe(opts => this.#onOptionsChange(opts));
        return this.#root;
    }

    unmount() {
        this.#unsubscribe?.();
        document.removeEventListener('pointermove',   this.#boundOnMove);
        document.removeEventListener('pointerup',     this.#boundOnUp);
        document.removeEventListener('pointercancel', this.#boundOnUp);
        this.#root?.remove();
        this.#root      = null;
        this.#workspace = null;
        this.#fracDrag  = null;
    }

    // ─── Engine subscription ─────────────────────────────────────────────────

    #onOptionsChange({ showDecimal, showPercent }) {
        this.#showDecimal = showDecimal;
        this.#showPercent = showPercent;
        this.#rerenderPieces();
    }

    // ─── DOM construction ─────────────────────────────────────────────────────

    #buildDOM() {
        const section = document.createElement('section');
        section.className = 'view-section flex h-full bg-soft-surface overflow-hidden';

        // Left sidebar
        section.appendChild(this.#buildSidebar());

        // Main workspace area
        const mainWrap = document.createElement('div');
        mainWrap.className = 'flex-1 flex flex-col overflow-hidden';
        mainWrap.appendChild(this.#buildWorkspaceTopBar());
        mainWrap.appendChild(this.#buildWorkspace());
        section.appendChild(mainWrap);

        return section;
    }

    #buildSidebar() {
        const aside = document.createElement('aside');
        aside.className = 'w-56 shrink-0 flex flex-col bg-white border-r border-soft-border overflow-y-auto';

        // Header
        const hdr = document.createElement('div');
        hdr.className = 'px-4 pt-4 pb-2 text-sm font-extrabold uppercase tracking-wider text-soft-muted';
        hdr.textContent = 'Bråkbitar';
        aside.appendChild(hdr);

        // Fraction buttons container
        const btnContainer = document.createElement('div');
        btnContainer.className = 'flex-1 flex flex-col gap-1 px-2 pb-3';

        FRAC_DEFS.forEach(f => {
            const btn = document.createElement('button');
            btn.className = 'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-soft-border bg-soft-bg hover:bg-white hover:shadow-sm transition-all text-left';
            const ps = 28, pr = ps / 2 - 2;
            let preview = '';
            if (f.d === 1) {
                preview = `<circle cx="${ps/2}" cy="${ps/2}" r="${pr}" fill="${f.color}"/>`;
            } else {
                const a = 360 / f.d;
                preview = `<circle cx="${ps/2}" cy="${ps/2}" r="${pr}" fill="${f.color}" opacity="0.25"/>`;
                for (let i = 0; i < f.d; i++) {
                    const p1 = fracPolarXY(ps / 2, ps / 2, pr, i * a);
                    const p2 = fracPolarXY(ps / 2, ps / 2, pr, (i + 1) * a);
                    preview += `<path d="M${ps/2},${ps/2} L${p1.x},${p1.y} A${pr},${pr},0,${a > 180 ? 1 : 0},1,${p2.x},${p2.y}Z" fill="${f.color}" stroke="white" stroke-width="0.8"/>`;
                }
            }
            btn.innerHTML = `
                <svg width="${ps}" height="${ps}" viewBox="0 0 ${ps} ${ps}" class="shrink-0 drop-shadow-sm">${preview}</svg>
                <div>
                    <div class="text-sm font-bold text-soft-text">${f.label}</div>
                    <div class="text-xs text-soft-muted">Klicka för att lägga till</div>
                </div>`;
            btn.addEventListener('click', () => this.#addFractionCircle(f.d, f.color));
            btnContainer.appendChild(btn);
        });
        aside.appendChild(btnContainer);

        // Display options
        const optDiv = document.createElement('div');
        optDiv.className = 'px-4 pt-3 pb-4 border-t border-soft-border space-y-2 shrink-0';
        optDiv.innerHTML = `<div class="text-xs font-bold uppercase tracking-wider text-soft-muted mb-2">Visa också</div>`;

        const decLbl = document.createElement('label');
        decLbl.className = 'flex items-center gap-2 text-sm font-semibold text-soft-text cursor-pointer select-none';
        const decCb  = document.createElement('input');
        decCb.type   = 'checkbox';
        decCb.className = 'w-4 h-4 accent-soft-blue';
        decCb.addEventListener('change', () => this.#engine.setShowDecimal(decCb.checked));
        decLbl.appendChild(decCb);
        decLbl.appendChild(document.createTextNode('Decimaltal'));
        optDiv.appendChild(decLbl);

        const pctLbl = document.createElement('label');
        pctLbl.className = 'flex items-center gap-2 text-sm font-semibold text-soft-text cursor-pointer select-none';
        const pctCb  = document.createElement('input');
        pctCb.type   = 'checkbox';
        pctCb.className = 'w-4 h-4 accent-soft-blue';
        pctCb.addEventListener('change', () => this.#engine.setShowPercent(pctCb.checked));
        pctLbl.appendChild(pctCb);
        pctLbl.appendChild(document.createTextNode('Procent'));
        optDiv.appendChild(pctLbl);

        aside.appendChild(optDiv);
        return aside;
    }

    #buildWorkspaceTopBar() {
        const bar = document.createElement('div');
        bar.className = 'flex items-center gap-3 px-4 py-2 bg-white border-b border-soft-border shrink-0';

        const clearBtn = document.createElement('button');
        clearBtn.className = 'ml-auto px-4 py-1.5 bg-soft-pink/20 text-soft-pink font-bold rounded-full hover:bg-soft-pink/40 transition-colors text-sm flex items-center gap-2';
        clearBtn.innerHTML = '<i class="fas fa-trash-alt text-xs"></i>Rensa';
        clearBtn.addEventListener('click', () => this.#clearWorkspace());
        bar.appendChild(clearBtn);

        return bar;
    }

    #buildWorkspace() {
        const ws = document.createElement('div');
        ws.className = 'flex-1 relative overflow-hidden';
        ws.style.cssText =
            'position:relative;overflow:hidden;' +
            'background-color:#f4f3ef;' +
            "background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%23b8d4f0' stroke-width='0.8'/%3E%3C/svg%3E\");" +
            'background-size:40px 40px;';
        this.#workspace = ws;
        return ws;
    }

    // ─── Fraction piece creation ──────────────────────────────────────────────

    #addFractionCircle(d, color) {
        const ws  = this.#workspace;
        const x   = ws.clientWidth  / 2 - FRAC_SVG * FRAC_BOARD_SCALE / 2 + (Math.random() * 80 - 40);
        const y   = ws.clientHeight - FRAC_SVG * FRAC_BOARD_SCALE - 24      + (Math.random() * 30 - 15);

        const wrapper = this.#makeFracElement(x, y);
        wrapper.dataset.scale = FRAC_BOARD_SCALE;
        wrapper.dataset.d     = d;
        wrapper.dataset.color = color;
        wrapper.dataset.n     = String(d);
        wrapper.innerHTML     = buildCircleSVG(d, color, this.#showDecimal, this.#showPercent, d);
        ws.appendChild(wrapper);
        this.#applyFracTransform(wrapper);
        this.#addMoveHandle(wrapper);
        if (d > 1) wrapper.appendChild(this.#makeNumeratorStepper(wrapper, d));
        this.#addResizeHandle(wrapper);

        if (d === 1) {
            this.#addFracDragListener(wrapper);
        } else {
            // Drag on non-slice area moves the whole circle
            wrapper.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                if (e.target.classList.contains('frac-slice')) return;
                e.preventDefault();
                e.stopPropagation();
                this.#fracStartDrag(wrapper, e);
            });
            this.#attachSliceListeners(wrapper, d, color);
        }
    }

    #makeNumeratorStepper(wrapper, d) {
        const stepper = document.createElement('div');
        stepper.style.cssText =
            'position:absolute;bottom:-40px;left:50%;transform:translateX(-50%);' +
            'display:flex;align-items:center;gap:5px;background:white;' +
            'border:1.5px solid #d6d4d0;border-radius:20px;padding:3px 10px;' +
            'box-shadow:0 2px 8px rgba(0,0,0,0.10);white-space:nowrap;' +
            'user-select:none;touch-action:none;z-index:5;';
        stepper.addEventListener('pointerdown', e => e.stopPropagation());

        const mkBtn = txt => {
            const b = document.createElement('button');
            b.textContent = txt;
            b.style.cssText =
                'width:22px;height:22px;border-radius:50%;border:1.5px solid #d6d4d0;' +
                'background:#f4f3ef;font-size:16px;font-weight:700;color:#4a4b50;' +
                'cursor:pointer;line-height:1;padding:0;flex-shrink:0;';
            return b;
        };

        const minusBtn = mkBtn('−');
        const label    = document.createElement('span');
        label.style.cssText =
            'font-size:14px;font-weight:800;color:#4a4b50;min-width:36px;' +
            'text-align:center;font-family:Nunito,sans-serif;';
        const plusBtn = mkBtn('+');

        const sync = () => {
            const n = parseInt(wrapper.dataset.n, 10);
            label.textContent    = `${n}⁄${d}`;
            minusBtn.disabled    = n <= 0;
            plusBtn.disabled     = n >= d;
            minusBtn.style.opacity = n <= 0 ? '0.3' : '1';
            plusBtn.style.opacity  = n >= d ? '0.3' : '1';
        };

        const rebuild = n => {
            wrapper.dataset.n = String(n);
            const color = wrapper.dataset.color;
            const oldSvg = wrapper.querySelector('svg');
            const tmp = document.createElement('div');
            tmp.innerHTML = buildCircleSVG(d, color, this.#showDecimal, this.#showPercent, n);
            if (oldSvg) oldSvg.replaceWith(tmp.firstElementChild);
            this.#attachSliceListeners(wrapper, d, color);
            sync();
        };

        minusBtn.addEventListener('click', () => {
            const n = parseInt(wrapper.dataset.n, 10);
            if (n > 0) rebuild(n - 1);
        });
        plusBtn.addEventListener('click', () => {
            const n = parseInt(wrapper.dataset.n, 10);
            if (n < d) rebuild(n + 1);
        });

        stepper.appendChild(minusBtn);
        stepper.appendChild(label);
        stepper.appendChild(plusBtn);
        sync();
        return stepper;
    }

    #makeFracElement(x, y) {
        const el = document.createElement('div');
        el.className  = 'frac-piece';
        el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${FRAC_SVG}px;height:${FRAC_SVG}px;cursor:grab;user-select:none;touch-action:none;filter:drop-shadow(0 4px 10px rgba(74,75,80,0.2));z-index:${++this.#zIndexCounter};transform-origin:top left;`;
        el.dataset.x     = x;
        el.dataset.y     = y;
        el.dataset.scale = 1;
        return el;
    }

    #applyFracTransform(el) {
        const x = parseFloat(el.dataset.x)     || 0;
        const y = parseFloat(el.dataset.y)     || 0;
        const s = parseFloat(el.dataset.scale) || 1;
        el.style.left            = x + 'px';
        el.style.top             = y + 'px';
        el.style.transform       = 'scale(' + s + ')';
        el.style.transformOrigin = 'top left';
    }

    #addMoveHandle(el) {
        const handle = document.createElement('div');
        handle.style.cssText = 'position:absolute;top:-28px;left:50%;transform:translateX(-50%);height:22px;padding:0 12px;background:white;border:1.5px solid #c8c9ce;border-radius:8px;cursor:grab;display:flex;align-items:center;justify-content:center;font-size:14px;color:#6a6b70;user-select:none;touch-action:none;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.12);';
        handle.setAttribute('role',       'button');
        handle.setAttribute('aria-label', 'Flytta hela cirkeln');
        handle.textContent = '\u28bf';
        handle.title       = 'Dra för att flytta hela cirkeln';
        handle.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            this.#fracStartDrag(el, e);
        });
        el.appendChild(handle);
    }

    #addResizeHandle(el) {
        const handle = document.createElement('div');
        handle.style.cssText = 'position:absolute;bottom:-4px;right:-4px;width:22px;height:22px;background:white;border:2px solid #8c8d92;border-radius:5px;cursor:nwse-resize;display:flex;align-items:center;justify-content:center;font-size:15px;color:#4a4b50;user-select:none;touch-action:none;z-index:10;opacity:0.9;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,0.15);';
        handle.textContent = '\u231f';
        handle.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            el.style.zIndex = ++this.#zIndexCounter;
            this.#fracDrag = {
                el, mode: 'resize',
                startScale: parseFloat(el.dataset.scale) || 1,
                sx: e.clientX, sy: e.clientY,
                pointerId: e.pointerId,
            };
        });
        el.appendChild(handle);
    }

    #addFracDragListener(el) {
        el.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            this.#fracStartDrag(el, e);
        });
    }

    #fracStartDrag(el, e) {
        el.style.zIndex = ++this.#zIndexCounter;
        el.style.cursor = 'grabbing';
        this.#fracDrag = {
            el, mode: 'move',
            ox: parseFloat(el.dataset.x) || 0,
            oy: parseFloat(el.dataset.y) || 0,
            sx: e.clientX, sy: e.clientY,
            pointerId: e.pointerId,
        };
    }

    #fracOnMove(e) {
        if (!this.#fracDrag || this.#fracDrag.pointerId !== e.pointerId) return;
        const drag = this.#fracDrag;
        if (drag.mode === 'resize') {
            const dx    = e.clientX - drag.sx;
            const dy    = e.clientY - drag.sy;
            const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
            const ns    = Math.max(0.4, Math.min(4, drag.startScale + delta / FRAC_SVG));
            drag.el.dataset.scale = ns;
            this.#applyFracTransform(drag.el);
        } else {
            const nx = drag.ox + (e.clientX - drag.sx);
            const ny = drag.oy + (e.clientY - drag.sy);
            drag.el.dataset.x = nx;
            drag.el.dataset.y = ny;
            this.#applyFracTransform(drag.el);
        }
    }

    #fracOnUp(e) {
        if (!this.#fracDrag || this.#fracDrag.pointerId !== e.pointerId) return;
        if (this.#fracDrag.mode !== 'resize') this.#fracDrag.el.style.cursor = 'grab';
        this.#fracDrag = null;
    }

    // ─── Slice pull-out ───────────────────────────────────────────────────────

    #attachSliceListeners(wrapper, d, color) {
        const slices = wrapper.querySelectorAll('.frac-slice');
        slices.forEach((slice, i) => {
            let sliceDownX, sliceDownY, pulled = false;

            slice.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                sliceDownX = e.clientX;
                sliceDownY = e.clientY;
                pulled     = false;

                const onSliceMove = (ev) => {
                    if (ev.pointerId !== e.pointerId) return;
                    const dx   = ev.clientX - sliceDownX;
                    const dy   = ev.clientY - sliceDownY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (!pulled && dist > 10) {
                        pulled = true;
                        const looseEl = this.#spawnLooseSlice(d, i, color, ev.clientX, ev.clientY, parseFloat(wrapper.dataset.scale));
                        this.#fracStartDrag(looseEl, ev);
                    }
                };

                const onSliceUp = (ev) => {
                    if (ev.pointerId !== e.pointerId) return;
                    document.removeEventListener('pointermove',   onSliceMove);
                    document.removeEventListener('pointerup',     onSliceUp);
                    document.removeEventListener('pointercancel', onSliceUp);
                    if (!pulled) this.#fracDrag = null;
                };

                document.addEventListener('pointermove',   onSliceMove);
                document.addEventListener('pointerup',     onSliceUp);
                document.addEventListener('pointercancel', onSliceUp);
            });
        });
    }

    #spawnLooseSlice(d, sliceIndex, color, clientX, clientY, scale) {
        const ws     = this.#workspace;
        const wsRect = ws.getBoundingClientRect();
        const s      = scale || 1;
        const nx     = clientX - wsRect.left - FRAC_SVG * s / 2;
        const ny     = clientY - wsRect.top  - FRAC_SVG * s / 2;

        const el = this.#makeFracElement(nx, ny);
        el.dataset.scale      = s;
        el.dataset.isLoose    = 'true';
        el.dataset.looseD     = d;
        el.dataset.looseSlice = sliceIndex;
        el.dataset.looseColor = color;
        el.innerHTML          = buildLooseSliceSVG(d, sliceIndex, color, this.#showDecimal, this.#showPercent);
        ws.appendChild(el);
        this.#applyFracTransform(el);
        this.#addFracDragListener(el);
        this.#addResizeHandle(el);
        return el;
    }

    // ─── Re-render on display-option change ──────────────────────────────────

    #rerenderPieces() {
        if (!this.#workspace) return;
        this.#workspace.querySelectorAll('.frac-piece').forEach(el => {
            const d     = parseInt(el.dataset.d);
            const color = el.dataset.color;

            if (d && color) {
                // Full circle
                const oldSvg = el.querySelector('svg');
                if (oldSvg) {
                    const n = parseInt(el.dataset.n ?? String(d), 10);
                    const tmp = document.createElement('div');
                    tmp.innerHTML = buildCircleSVG(d, color, this.#showDecimal, this.#showPercent, n);
                    oldSvg.replaceWith(tmp.firstElementChild);
                    if (d > 1) this.#attachSliceListeners(el, d, color);
                }
            } else if (el.dataset.isLoose === 'true') {
                // Loose slice
                const ld     = parseInt(el.dataset.looseD);
                const li     = parseInt(el.dataset.looseSlice);
                const lcolor = el.dataset.looseColor;
                if (!isNaN(ld) && !isNaN(li) && lcolor) {
                    const oldSvg = el.querySelector('svg');
                    if (oldSvg) {
                        const tmp = document.createElement('div');
                        tmp.innerHTML = buildLooseSliceSVG(ld, li, lcolor, this.#showDecimal, this.#showPercent);
                        oldSvg.replaceWith(tmp.firstElementChild);
                    }
                }
            }
        });
    }

    // ─── Clear workspace ─────────────────────────────────────────────────────

    #clearWorkspace() {
        if (!this.#workspace) return;
        this.#workspace.querySelectorAll('.frac-piece').forEach(el => el.remove());
        this.#fracDrag = null;
    }
}
