// ═══════════════════════════════════════════════════════════════════════════
// modules/tools/ScaleView.js
// View for the Skala och mått tool: two canvases (Verklighet / Ritning),
// sidebar with object & ratio buttons, dimension inputs, and hover ring.
// ═══════════════════════════════════════════════════════════════════════════

import { ScaleEngine, SCALE_OBJECTS, SCALE_RATIOS, fmtCm, fmtCmVal } from './ScaleEngine.js';

const CELL_PX = 40;
const MARGIN_TOP_PX = 70;

const OBJECT_BUTTONS = [
    { key: 'skruv',        emoji: '🔩', label: 'Skruv' },
    { key: 'insekt',       emoji: '🐛', label: 'Insekt' },
    { key: 'gem',          emoji: '📎', label: 'Gem' },
    { key: 'blyertspenna', emoji: '✏️', label: 'Blyertspenna' },
    { key: 'rektangel',    emoji: '▬',  label: 'Rektangel' },
    { key: 'kvadrat',      emoji: '□',  label: 'Kvadrat' },
];

const REAL_COLOR      = '#5b80a5';
const DRAWING_COLOR   = '#b8a36e';
const HIGHLIGHT_COLOR = '#f5a623';

export class ScaleView {
    #engine;
    #unsubscribe;
    #root;
    #els = {};
    #resizeListener = null;
    #lastReading = null;

    constructor(engine = new ScaleEngine()) { this.#engine = engine; }
    get engine() { return this.#engine; }

    mount(parent) {
        this.#root = document.createElement('section');
        this.#root.id = 'view-scale';
       this.#root.className = 'view-section flex-row h-full';
        this.#root.innerHTML = this.#template();
        parent.appendChild(this.#root);

        this.#cacheRefs();
        this.#wireEvents();

        this.#unsubscribe = this.#engine.subscribe(reading => {
            this.#lastReading = reading;
            this.#render(reading);
        });

        this.#resizeListener = () => this.#resizeAndDraw();
        window.addEventListener('resize', this.#resizeListener);

        return this.#root;
    }

    onEnter() { this.#resizeAndDraw(); }
    onLeave() {}
    destroy() {
        if (this.#resizeListener) window.removeEventListener('resize', this.#resizeListener);
        this.#unsubscribe?.();
        this.#root?.remove();
    }

    #template() {
        const objBtns = OBJECT_BUTTONS.map(o => `
            <button data-set-object="${o.key}" class="scale-obj-btn">${o.emoji} ${o.label}</button>`).join('');

        const reductionBtns = SCALE_RATIOS.reductions.map(r => `
            <button data-set-ratio="${r.n}:${r.d}"
                    class="scale-btn bg-soft-blueLight/20 text-soft-blue">${r.n}:${r.d}</button>`).join('');

        const enlargementBtns = SCALE_RATIOS.enlargements.map(r => {
            const span = r.n === 10 ? ' col-span-2' : '';
            return `<button data-set-ratio="${r.n}:${r.d}"
                            class="scale-btn bg-soft-greenLight/20 text-soft-green${span}">${r.n}:${r.d}</button>`;
        }).join('');

        return `
        <aside id="scale-sidebar"
               class="w-56 bg-soft-surface shadow-md z-10 p-3 flex flex-col gap-2
                      overflow-y-auto border-r border-soft-border shrink-0">

            <p class="text-xs font-800 text-soft-muted uppercase tracking-widest mt-1">Välj objekt</p>
            <div class="grid grid-cols-2 gap-1.5">${objBtns}</div>

            <hr class="border-soft-border my-0.5">

            <p class="text-xs font-800 text-soft-muted uppercase tracking-widest">Förminskning</p>
            <div class="grid grid-cols-2 gap-1.5">${reductionBtns}</div>

            <p class="text-xs font-800 text-soft-muted uppercase tracking-widest">Original</p>
            <button data-set-ratio="1:1"
                    class="scale-btn bg-soft-yellow/30 text-soft-yellowDark border border-soft-yellow">
                1:1 (Original)
            </button>

            <p class="text-xs font-800 text-soft-muted uppercase tracking-widest">Förstoring</p>
            <div class="grid grid-cols-2 gap-1.5">${enlargementBtns}</div>

            <div class="scale-tips-box mt-1">
                <i class="fas fa-info-circle"></i> <strong>Tips:</strong>
                Håll muspekaren över ritningen till höger för att se sambandet med originalet.
            </div>

            <div id="scale-matt-section" class="mt-auto flex flex-col gap-1.5">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-800 text-soft-muted uppercase tracking-widest">Mått</span>
                    <label class="flex items-center gap-1 text-xs font-700 text-soft-muted cursor-pointer">
                        <input type="checkbox" data-role="lock-prop"> Lås prop.
                    </label>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="text-xs font-700 text-soft-text w-10">Bredd:</span>
                    <input type="number" data-role="input-w" class="scale-matt-input"
                           min="0.1" max="50" step="0.1">
                    <span class="text-xs text-soft-muted">cm</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="text-xs font-700 text-soft-text w-10">Höjd:</span>
                    <input type="number" data-role="input-h" class="scale-matt-input"
                           min="0.1" max="50" step="0.1">
                    <span class="text-xs text-soft-muted">cm</span>
                </div>
                <div class="text-xs text-soft-muted">
                    Ritning bredd:
                    <span data-role="label-rw" class="font-bold" style="color:#b8a36e;">0,800 cm</span>
                </div>
                <div class="text-xs text-soft-muted">
                    Ritning höjd:
                    <span data-role="label-rh" class="font-bold text-soft-green">3 cm</span>
                </div>
            </div>
        </aside>

        <div class="flex-1 flex flex-row relative overflow-hidden">
            <div class="flex-1 relative" id="scale-workspace-left">
                <div class="scale-side-label">
                    <i class="fas fa-home" style="font-size:11px;"></i> Verklighet
                </div>
                <div data-role="highlight-ring" class="scale-highlight-ring" style="display:none;"></div>
                <canvas data-role="canvas-left" style="position:absolute;top:0;left:0;display:block;"></canvas>
            </div>

            <div id="scale-divider"></div>

            <div class="flex-1 relative" id="scale-workspace-right">
                <div class="scale-side-label" data-role="right-label">
                    <i class="fas fa-ruler" style="font-size:11px;"></i> Ritning / Skala
                </div>
                <canvas data-role="canvas-right" style="position:absolute;top:0;left:0;display:block;"></canvas>
            </div>

            <div id="scale-info-overlay">
                <div id="scale-overlay-label">AKTIV SKALA</div>
                <div data-role="overlay-ratio" id="scale-overlay-ratio">Skala 1:1</div>
                <div data-role="overlay-type" id="scale-overlay-type">(Original)</div>
                <div data-role="overlay-detail" id="scale-overlay-detail"></div>
            </div>
        </div>`;
    }

    #cacheRefs() {
        const $  = sel => this.#root.querySelector(sel);
        const $$ = sel => this.#root.querySelectorAll(sel);
        this.#els = {
            objBtns:       $$('[data-set-object]'),
            ratioBtns:     $$('[data-set-ratio]'),
            inputW:        $('[data-role="input-w"]'),
            inputH:        $('[data-role="input-h"]'),
            lockProp:      $('[data-role="lock-prop"]'),
            labelRw:       $('[data-role="label-rw"]'),
            labelRh:       $('[data-role="label-rh"]'),
            canvasLeft:    $('[data-role="canvas-left"]'),
            canvasRight:   $('[data-role="canvas-right"]'),
            workspaceLeft: this.#root.querySelector('#scale-workspace-left'),
            workspaceRight:this.#root.querySelector('#scale-workspace-right'),
            highlightRing: $('[data-role="highlight-ring"]'),
            overlayRatio:  $('[data-role="overlay-ratio"]'),
            overlayType:   $('[data-role="overlay-type"]'),
            overlayDetail: $('[data-role="overlay-detail"]'),
            rightLabel:    $('[data-role="right-label"]'),
        };
    }

    #wireEvents() {
        this.#root.addEventListener('click', evt => {
            const objBtn = evt.target.closest('[data-set-object]');
            if (objBtn) { this.#engine.setObject(objBtn.dataset.setObject); return; }
            const ratioBtn = evt.target.closest('[data-set-ratio]');
            if (ratioBtn) {
                const [n, d] = ratioBtn.dataset.setRatio.split(':').map(Number);
                this.#engine.setScale(n, d);
                return;
            }
        });

        this.#els.lockProp.addEventListener('change', e => this.#engine.setLockProportion(e.target.checked));
        this.#els.inputW.addEventListener('input', e => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v) && v > 0) this.#engine.setWidthCm(v);
        });
        this.#els.inputH.addEventListener('input', e => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v) && v > 0) this.#engine.setHeightCm(v);
        });

        this.#els.canvasRight.addEventListener('mouseenter', () => this.#engine.setHovering(true));
        this.#els.canvasRight.addEventListener('mouseleave', () => this.#engine.setHovering(false));
    }

    #render(reading) {
        for (const btn of this.#els.objBtns) {
            btn.classList.toggle('active', btn.dataset.setObject === reading.activeObject);
        }
        for (const btn of this.#els.ratioBtns) {
            btn.classList.toggle('active', btn.dataset.setRatio === reading.ratioLabel);
        }

        if (document.activeElement !== this.#els.inputW) this.#els.inputW.value = reading.realWCm;
        if (document.activeElement !== this.#els.inputH) this.#els.inputH.value = reading.realHCm;
        this.#els.lockProp.checked = reading.lockProp;

        this.#els.labelRw.textContent = fmtCm(reading.drawingWCm);
        this.#els.labelRh.textContent = fmtCm(reading.drawingHCm);

        this.#els.overlayRatio.textContent  = `Skala ${reading.ratioLabel}`;
        this.#els.overlayType.textContent   = reading.ratioTypeText;
        this.#els.overlayDetail.textContent =
            `${reading.objectLabel} | Original: ${fmtCmVal(reading.realWCm)}×${fmtCm(reading.realHCm)} | ` +
            `Ritning: ${fmtCmVal(reading.drawingWCm)}×${fmtCm(reading.drawingHCm)}`;
        this.#els.rightLabel.innerHTML =
            `<i class="fas fa-ruler" style="font-size:11px;"></i> Ritning / Skala ${reading.ratioLabel}`;

        this.#drawSide(this.#els.canvasLeft,  reading.realWCm,    reading.realHCm,
                       reading.objectType, reading.hovering, REAL_COLOR);
        this.#drawSide(this.#els.canvasRight, reading.drawingWCm, reading.drawingHCm,
                       reading.objectType, false, DRAWING_COLOR);

        if (reading.hovering) {
            const objW = reading.realWCm * CELL_PX;
            const objH = reading.realHCm * CELL_PX;
            const objX = Math.max(40, (this.#els.canvasLeft.width - objW) / 2);
            this.#updateHighlightRing({ x: objX, y: MARGIN_TOP_PX, w: objW, h: objH });
        } else {
            this.#updateHighlightRing(null);
        }
    }

    #resizeAndDraw() {
        const { canvasLeft, canvasRight, workspaceLeft, workspaceRight } = this.#els;
        if (!canvasLeft || !workspaceLeft) return;
        canvasLeft.width   = workspaceLeft.clientWidth;
        canvasLeft.height  = workspaceLeft.clientHeight;
        canvasRight.width  = workspaceRight.clientWidth;
        canvasRight.height = workspaceRight.clientHeight;
        if (this.#lastReading) this.#render(this.#lastReading);
    }

    #updateHighlightRing(rect) {
        const ring = this.#els.highlightRing;
        if (!ring) return;
        if (!rect) { ring.style.display = 'none'; return; }
        ring.style.display = 'block';
        ring.style.left   = rect.x + 'px';
        ring.style.top    = rect.y + 'px';
        ring.style.width  = rect.w + 'px';
        ring.style.height = rect.h + 'px';
    }

    #drawSide(canvas, wCm, hCm, type, highlighted, strokeColor) {
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        ctx.strokeStyle = '#b8d4f0';
        ctx.lineWidth   = 0.8;
        for (let x = 0; x <= W; x += CELL_PX) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y <= H; y += CELL_PX) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        const objW = wCm * CELL_PX;
        const objH = hCm * CELL_PX;
        const objX = Math.max(40, (W - objW) / 2);
        const objY = MARGIN_TOP_PX;

        ctx.save();
        switch (type) {
            case 'gem':          drawGem(ctx, objX, objY, objW, objH, strokeColor, highlighted); break;
            case 'skruv':        drawSkruv(ctx, objX, objY, objW, objH, strokeColor, highlighted); break;
            case 'insekt':       drawInsekt(ctx, objX, objY, objW, objH, strokeColor, highlighted); break;
            case 'blyertspenna': drawBlyertspenna(ctx, objX, objY, objW, objH, strokeColor, highlighted); break;
            default:             drawRect(ctx, objX, objY, objW, objH, strokeColor, highlighted); break;
        }
        ctx.restore();

        drawDimLines(ctx, objX, objY, objW, objH, wCm, hCm, strokeColor, highlighted);
    }
}

function drawGem(ctx, x, y, w, h, color, highlighted) {
    const lw = Math.max(1.5, Math.min(3.5, w * 0.10));
    ctx.strokeStyle = highlighted ? HIGHLIGHT_COLOR : color;
    ctx.lineWidth = highlighted ? lw + 1 : lw;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = color + '22';

    const cx = x + w / 2;
    const outerR = w / 2;

    ctx.beginPath();
    ctx.moveTo(cx - outerR, y + outerR);
    ctx.arc(cx, y + outerR, outerR, Math.PI, 0);
    ctx.lineTo(cx + outerR, y + h - outerR);
    ctx.arc(cx, y + h - outerR, outerR, 0, Math.PI);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    const inset = lw * 2 + 1;
    const innerR = Math.max(2, (w - inset * 2) / 2);
    const innerTop = y + outerR * 0.35;
    const innerBot = y + h * 0.62;
    ctx.beginPath();
    ctx.moveTo(cx - innerR, innerTop + innerR);
    ctx.arc(cx, innerTop + innerR, innerR, Math.PI, 0);
    ctx.lineTo(cx + innerR, innerBot);
    ctx.arc(cx, innerBot, innerR, 0, Math.PI);
    ctx.closePath();
    ctx.stroke();
}

function drawSkruv(ctx, x, y, w, h, color, highlighted) {
    const lw = Math.max(1.5, Math.min(3, w * 0.08));
    ctx.strokeStyle = highlighted ? HIGHLIGHT_COLOR : color;
    ctx.fillStyle = color + '33';
    ctx.lineWidth = highlighted ? lw + 1 : lw;
    ctx.lineCap = 'round';

    const headH = Math.min(h * 0.18, w * 0.8);
    const headW = w * 1.6;
    const headX = x + w / 2 - headW / 2;

    ctx.beginPath(); ctx.rect(headX, y, headW, headH); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(x, y + headH, w, h - headH); ctx.fill(); ctx.stroke();

    const threadStep = Math.max(3, h * 0.06);
    ctx.lineWidth = Math.max(0.8, lw * 0.5);
    for (let ty = y + headH + threadStep; ty < y + h - 2; ty += threadStep) {
        ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + w, ty); ctx.stroke();
    }
}

function drawInsekt(ctx, x, y, w, h, color, highlighted) {
    const lw = Math.max(1.5, Math.min(3, w * 0.06));
    ctx.strokeStyle = highlighted ? HIGHLIGHT_COLOR : color;
    ctx.fillStyle = color + '33';
    ctx.lineWidth = highlighted ? lw + 1 : lw;
    ctx.lineCap = 'round';

    const cx = x + w / 2;
    const bodyW = w * 0.5, bodyH = h * 0.55;
    const headR = w * 0.22;
    const bodyY = y + headR * 2.2;

    ctx.beginPath(); ctx.arc(cx, y + headR, headR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, bodyY + bodyH / 2, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = color + '22';
    const wingW = w * 0.55, wingH = h * 0.35;
    ctx.beginPath();
    ctx.ellipse(cx - bodyW * 0.6, bodyY + wingH * 0.4, wingW * 0.5, wingH * 0.5, -0.3, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx + bodyW * 0.6, bodyY + wingH * 0.4, wingW * 0.5, wingH * 0.5, 0.3, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    ctx.lineWidth = Math.max(1, lw * 0.7);
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.5, y + headR * 0.3);
    ctx.lineTo(cx - headR * 1.6, y - headR * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + headR * 0.5, y + headR * 0.3);
    ctx.lineTo(cx + headR * 1.6, y - headR * 0.6);
    ctx.stroke();
}

function drawBlyertspenna(ctx, x, y, w, h, color, highlighted) {
    const lw = Math.max(1.5, Math.min(3, w * 0.08));
    ctx.strokeStyle = highlighted ? HIGHLIGHT_COLOR : color;
    ctx.fillStyle = color + '33';
    ctx.lineWidth = highlighted ? lw + 1 : lw;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const tipH = Math.min(h * 0.15, w * 1.5);
    const eraserH = Math.min(h * 0.08, w * 0.8);

    ctx.fillStyle = '#d58b99' + '66';
    ctx.strokeStyle = highlighted ? HIGHLIGHT_COLOR : '#d58b99';
    ctx.beginPath(); ctx.rect(x, y, w, eraserH); ctx.fill(); ctx.stroke();

    ctx.fillStyle = color + '33';
    ctx.strokeStyle = highlighted ? HIGHLIGHT_COLOR : color;
    ctx.beginPath(); ctx.rect(x, y + eraserH, w, h - eraserH - tipH); ctx.fill(); ctx.stroke();

    ctx.fillStyle = color + '55';
    ctx.beginPath();
    ctx.moveTo(x, y + h - tipH);
    ctx.lineTo(x + w, y + h - tipH);
    ctx.lineTo(x + w / 2, y + h);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
}

function drawRect(ctx, x, y, w, h, color, highlighted) {
    const lw = Math.max(1.5, Math.min(3.5, Math.min(w, h) * 0.04));
    ctx.strokeStyle = highlighted ? HIGHLIGHT_COLOR : color;
    ctx.fillStyle = color + '33';
    ctx.lineWidth = highlighted ? lw + 1 : lw;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.10)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
}

function drawDimLines(ctx, objX, objY, objW, objH, wCm, hCm, color, highlighted) {
    const dimColor = highlighted ? '#c87800' : color;
    ctx.save();
    ctx.strokeStyle = dimColor;
    ctx.fillStyle   = dimColor;
    ctx.lineWidth   = 1;
    ctx.setLineDash([]);
    ctx.lineCap = 'square';

    const tick = 5, gap = 8;
    const fSize = Math.max(10, Math.min(13, Math.min(objW, 80) * 0.18 + 9));
    ctx.font = `bold ${fSize}px system-ui, sans-serif`;

    if (objW >= 16) {
        const dimY = objY - gap - tick;
        ctx.beginPath(); ctx.moveTo(objX, dimY - tick); ctx.lineTo(objX, dimY + tick); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(objX + objW, dimY - tick); ctx.lineTo(objX + objW, dimY + tick); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(objX, dimY); ctx.lineTo(objX + objW, dimY); ctx.stroke();
        const ah = 4;
        ctx.beginPath();
        ctx.moveTo(objX, dimY); ctx.lineTo(objX + ah, dimY - ah);
        ctx.moveTo(objX, dimY); ctx.lineTo(objX + ah, dimY + ah); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(objX + objW, dimY); ctx.lineTo(objX + objW - ah, dimY - ah);
        ctx.moveTo(objX + objW, dimY); ctx.lineTo(objX + objW - ah, dimY + ah); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(fmtCm(wCm), objX + objW / 2, dimY - 3);
    }

    if (objH >= 16) {
        const dimX = Math.max(22, objX - gap - tick - 2);
        ctx.beginPath(); ctx.moveTo(dimX - tick, objY); ctx.lineTo(dimX + tick, objY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dimX - tick, objY + objH); ctx.lineTo(dimX + tick, objY + objH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dimX, objY); ctx.lineTo(dimX, objY + objH); ctx.stroke();
        const ah = 4;
        ctx.beginPath();
        ctx.moveTo(dimX, objY); ctx.lineTo(dimX - ah, objY + ah);
        ctx.moveTo(dimX, objY); ctx.lineTo(dimX + ah, objY + ah); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(dimX, objY + objH); ctx.lineTo(dimX - ah, objY + objH - ah);
        ctx.moveTo(dimX, objY + objH); ctx.lineTo(dimX + ah, objY + objH - ah); ctx.stroke();
        ctx.save();
        ctx.translate(dimX - 4, objY + objH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(fmtCm(hCm), 0, 0);
        ctx.restore();
    }

    ctx.restore();
}
