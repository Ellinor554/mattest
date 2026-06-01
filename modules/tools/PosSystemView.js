// ═══════════════════════════════════════════════════════════════════════════
// modules/tools/PosSystemView.js
// View for Positionssystemet — sidebar + workspace with draggable SVG pieces.
// ═══════════════════════════════════════════════════════════════════════════

import { PosSystemEngine, POS_COL_DEFS } from './PosSystemEngine.js';

const GRID_PX = 40;
const HEADER_H_PX = 44;

const PIECE_SIZES = Object.freeze({
    tusental:  { w: 121, h: 122 },
    hundratal: { w: 121, h: 68 },
    tiotal:    { w: 116, h: 70 },
    ental:     { w: 36,  h: 40 },
});

const SIDEBAR_BUTTONS = [
    { type: 'tusental',  mode: 'block', label: 'Tusental',  hint: '= 1 000', bgClass: 'border-blue-200 bg-blue-50 hover:bg-blue-100' },
    { type: 'hundratal', mode: 'block', label: 'Hundratal', hint: '= 100',   bgClass: 'border-green-200 bg-green-50 hover:bg-green-100' },
    { type: 'tiotal',    mode: 'block', label: 'Tiotal',    hint: '= 10',    bgClass: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' },
    { type: 'ental',     mode: 'block', label: 'Ental',     hint: '= 1',     bgClass: 'border-red-200 bg-red-50 hover:bg-red-100' },
    { type: 'tusental',  mode: 'pengar', label: '1 000 kr', hint: '= 1 000', bgClass: 'border-blue-200 bg-blue-50 hover:bg-blue-100' },
    { type: 'hundratal', mode: 'pengar', label: '100 kr',   hint: '= 100',   bgClass: 'border-green-200 bg-green-50 hover:bg-green-100' },
    { type: 'tiotal',    mode: 'pengar', label: '10 kr',    hint: '= 10',    bgClass: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' },
    { type: 'ental',     mode: 'pengar', label: '1 kr',     hint: '= 1',     bgClass: 'border-red-200 bg-red-50 hover:bg-red-100' },
];

export class PosSystemView {
    #engine;
    #unsubscribe;
    #root;
    #els = {};
    #pieceElements = new Map();
    #resizeListener = null;
    #lastReading = null;
    #zCounter = 100;

    constructor(engine = new PosSystemEngine()) { this.#engine = engine; }
    get engine() { return this.#engine; }

    mount(parent) {
        this.#root = document.createElement('section');
        this.#root.id = 'view-positionssystem';
        this.#root.className = 'view-section flex-row h-full';
        this.#root.innerHTML = this.#template();
        parent.appendChild(this.#root);

        this.#cacheRefs();
        this.#wireEvents();

        this.#unsubscribe = this.#engine.subscribe(reading => {
            this.#lastReading = reading;
            this.#render(reading);
        });

        this.#resizeListener = () => { if (this.#lastReading) this.#renderColumnChrome(this.#lastReading); };
        window.addEventListener('resize', this.#resizeListener);

        return this.#root;
    }

    onEnter() { if (this.#lastReading) this.#renderColumnChrome(this.#lastReading); }
    onLeave() {}
    destroy() {
        if (this.#resizeListener) window.removeEventListener('resize', this.#resizeListener);
        this.#unsubscribe?.();
        this.#root?.remove();
    }

    #template() {
        const blockButtons = SIDEBAR_BUTTONS.filter(b => b.mode === 'block')
            .map(b => this.#sidebarButtonHTML(b)).join('');
        const moneyButtons = SIDEBAR_BUTTONS.filter(b => b.mode === 'pengar')
            .map(b => this.#sidebarButtonHTML(b)).join('');

        const counterRows = POS_COL_DEFS.map(c => `
            <div class="flex justify-between items-center" data-pos-col-row="${c.key}">
                <span class="flex items-center gap-1">
                    <span class="w-3 h-3 rounded-sm inline-block" style="background:${c.color}"></span>
                    ${c.label}
                </span>
                <span class="font-bold text-soft-text" data-role="count-${c.key}">0</span>
            </div>`).join('');

        const colCheckboxes = POS_COL_DEFS.map(c => `
            <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" data-col-toggle="${c.key}" class="rounded" checked>
                <span class="flex items-center gap-1">
                    <span class="w-3 h-3 rounded-sm inline-block" style="background:${c.color}"></span>
                    ${c.label}
                </span>
            </label>`).join('');

        return `
        <aside id="positionssystem-sidebar"
               class="w-64 bg-soft-surface shadow-md z-10 p-5 flex flex-col gap-4
                      overflow-y-auto border-r border-soft-border shrink-0">

            <h3 class="font-bold text-soft-text text-sm uppercase tracking-wider text-soft-muted">
                Lägg till material
            </h3>

            <div class="flex flex-col gap-2">
                <span class="font-semibold text-xs uppercase tracking-wider text-soft-muted">Block</span>
                ${blockButtons}
                <span class="font-semibold text-xs uppercase tracking-wider text-soft-muted mt-1">Pengar (kr)</span>
                ${moneyButtons}
            </div>

            <div class="bg-soft-bg rounded-xl p-4 border border-soft-border">
                <h3 class="font-bold text-soft-text text-sm mb-3">Värde på arbetsytan</h3>
                <div class="flex flex-col gap-1 mb-3 text-sm">${counterRows}</div>
                <div class="border-t border-soft-border pt-3 text-center">
                    <span class="text-soft-muted text-sm">Totalt värde</span>
                    <div class="text-3xl font-extrabold text-soft-blue mt-1" data-role="total">0</div>
                </div>
            </div>

            <label class="flex items-center gap-2 text-sm text-soft-text cursor-pointer select-none">
                <input type="checkbox" data-role="auto-exchange" class="rounded" checked>
                <span>Automatisk växling (10→1)</span>
            </label>
            <label class="flex items-center gap-2 text-sm text-soft-text cursor-pointer select-none">
                <input type="checkbox" data-role="show-columns" class="rounded" checked>
                <span>Visa kolumner (T-H-T-E)</span>
            </label>

            <div data-role="visible-cols-section" class="bg-soft-bg rounded-xl p-4 border border-soft-border">
                <h3 class="font-bold text-soft-text text-sm mb-3">Synliga kolumner</h3>
                <div class="flex flex-col gap-2 text-sm">${colCheckboxes}</div>
            </div>

            <button data-action="clear"
                    class="px-4 py-2 bg-soft-pink/20 text-soft-pink font-bold rounded-xl
                           text-sm hover:bg-soft-pink/30 transition-colors">
                <i class="fas fa-trash-alt mr-1"></i> Rensa arbetsyta
            </button>
            <p class="text-xs text-soft-muted">
                Dubbelklicka för att ta bort. Skrolla för att ändra storlek.
            </p>
        </aside>

        <div class="flex-1 workspace" data-role="workspace"
             style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%23b8d4f0' stroke-width='0.8'/%3E%3C/svg%3E&quot;);
                    background-size: 40px 40px;">
        </div>`;
    }

    #sidebarButtonHTML(b) {
        return `
        <button data-add-type="${b.type}" data-add-mode="${b.mode}" data-pos-col="${b.type}"
                class="flex items-center gap-3 px-3 py-2 rounded-xl border ${b.bgClass} transition-colors">
            <span class="shrink-0" style="width:32px;display:flex;justify-content:center;">
                ${miniSvg(b.type, b.mode)}
            </span>
            <div class="text-left">
                <div class="font-bold text-soft-text text-sm">${b.label}</div>
                <div class="text-soft-muted text-xs">${b.hint}</div>
            </div>
        </button>`;
    }

    #cacheRefs() {
        const $  = sel => this.#root.querySelector(sel);
        const $$ = sel => this.#root.querySelectorAll(sel);
        this.#els = {
            workspace:        $('[data-role="workspace"]'),
            total:            $('[data-role="total"]'),
            countEntal:       $('[data-role="count-ental"]'),
            countTiotal:      $('[data-role="count-tiotal"]'),
            countHundratal:   $('[data-role="count-hundratal"]'),
            countTusental:    $('[data-role="count-tusental"]'),
            autoExchangeBox:  $('[data-role="auto-exchange"]'),
            showColumnsBox:   $('[data-role="show-columns"]'),
            visibleColsSection: $('[data-role="visible-cols-section"]'),
            addBtns:          $$('[data-add-type]'),
            colToggles:       $$('[data-col-toggle]'),
            colRowEls:        $$('[data-pos-col-row]'),
            sidebarPosColEls: $$('[data-pos-col]'),
        };
    }

    #wireEvents() {
        this.#root.addEventListener('click', evt => {
            const addBtn = evt.target.closest('[data-add-type]');
            if (addBtn) {
                this.#engine.addPiece(addBtn.dataset.addType, addBtn.dataset.addMode);
                return;
            }
            if (evt.target.closest('[data-action="clear"]')) this.#engine.clear();
        });

        this.#els.autoExchangeBox.addEventListener('change', e =>
            this.#engine.setAutoExchange(e.target.checked));

        this.#els.showColumnsBox.addEventListener('change', e =>
            this.#engine.setShowColumns(e.target.checked));

        for (const cb of this.#els.colToggles) {
            cb.addEventListener('change', e => {
                const col = cb.dataset.colToggle;
                if (!e.target.checked) {
                    const reading = this.#engine.getReading();
                    const count = reading.counts[col] || 0;
                    if (count > 0) {
                        const def = POS_COL_DEFS.find(c => c.key === col);
                        const ok = confirm(
                            `Kolumnen "${def.label}" innehåller ${count} objekt. ` +
                            `Vill du dölja kolumnen och ta bort dessa objekt?`);
                        if (!ok) { cb.checked = true; return; }
                    }
                }
                this.#engine.setColumnVisible(col, e.target.checked);
            });
        }
    }

    #render(reading) {
        this.#els.countTusental.textContent  = reading.counts.tusental;
        this.#els.countHundratal.textContent = reading.counts.hundratal;
        this.#els.countTiotal.textContent    = reading.counts.tiotal;
        this.#els.countEntal.textContent     = reading.counts.ental;
        this.#els.total.textContent          = reading.total;

        this.#els.autoExchangeBox.checked = reading.autoExchange;
        this.#els.showColumnsBox.checked  = reading.showColumns;
        for (const cb of this.#els.colToggles) {
            cb.checked = reading.visibleCols[cb.dataset.colToggle];
        }

        for (const row of this.#els.colRowEls) {
            row.style.display = reading.visibleCols[row.dataset.posColRow] ? '' : 'none';
        }
        for (const btn of this.#els.sidebarPosColEls) {
            btn.style.display = reading.visibleCols[btn.dataset.posCol] ? '' : 'none';
        }

        this.#els.visibleColsSection.style.display = reading.showColumns ? '' : 'none';

        this.#renderColumnChrome(reading);
        this.#renderPieces(reading);
    }

    #renderColumnChrome(reading) {
        const ws = this.#els.workspace;
        ws.querySelectorAll('.pos-col-header, .pos-col-divider').forEach(el => el.remove());

        if (!reading.showColumns) return;
        const cols = POS_COL_DEFS.filter(c => reading.visibleCols[c.key]);
        const n = cols.length;
        if (n === 0) return;

        const colPct = 100 / n;
        cols.forEach((col, i) => {
            const hdr = document.createElement('div');
            hdr.className = 'pos-col-header';
            hdr.style.cssText =
                `left:${i*colPct}%; width:${colPct}%; color:${col.color}; ` +
                `border-color:${col.border}; background:${col.bg};`;
            hdr.textContent = col.label;
            ws.appendChild(hdr);
            if (i > 0) {
                const dv = document.createElement('div');
                dv.className = 'pos-col-divider';
                dv.style.cssText = `left:${i*colPct}%; background:${col.border};`;
                ws.appendChild(dv);
            }
        });
    }

    #renderPieces(reading) {
        const liveIds = new Set(reading.pieces.map(p => p.id));
        for (const [id, info] of this.#pieceElements) {
            if (!liveIds.has(id)) {
                info.el.remove();
                this.#pieceElements.delete(id);
            }
        }

        for (const piece of reading.pieces) {
            if (this.#pieceElements.has(piece.id)) continue;
            this.#addPieceElement(piece, reading);
        }
    }

    #addPieceElement(piece, reading) {
        const ws = this.#els.workspace;
        const div = document.createElement('div');
        div.className = 'draggable-item';
        div.dataset.posType = piece.type;
        div.dataset.posMode = piece.mode;
        div.dataset.id = String(piece.id);
        div.innerHTML = pieceSvg(piece.type, piece.mode);

        const pos = this.#placementFor(piece.type, reading);
        const info = { el: div, x: pos.x, y: pos.y, scale: 1 };
        this.#pieceElements.set(piece.id, info);

        this.#applyTransform(info);
        ws.appendChild(div);
        this.#wirePieceEvents(div, piece, info);
    }

    #placementFor(type, reading) {
        const ws = this.#els.workspace;
        const wsRect = ws.getBoundingClientRect();
        const wsWidth = wsRect.width > 0 ? wsRect.width : 800;
        const sz = PIECE_SIZES[type] || { w: 80, h: 60 };

        const totalOfType = reading.counts[type] || 0;
        const count = Math.max(0, totalOfType - 1);

        if (!reading.showColumns) {
            const snappedW = Math.ceil(sz.w / GRID_PX) * GRID_PX;
            const snappedH = Math.ceil(sz.h / GRID_PX) * GRID_PX;
            const pad = GRID_PX;
            const maxPerRow = Math.max(1,
                Math.floor((wsWidth - pad * 2 + GRID_PX) / (snappedW + GRID_PX)));
            const row = Math.floor(count / maxPerRow);
            const col = count % maxPerRow;
            return { x: pad + col * (snappedW + GRID_PX), y: pad + row * (snappedH + GRID_PX) };
        }

        const visibleCols = reading.visibleColKeys;
        const colIndex = visibleCols.indexOf(type);
        if (colIndex === -1) return { x: GRID_PX, y: GRID_PX };
        const n = visibleCols.length;
        const colW = wsWidth / n;
        const gap = 8;
        const pad = 10;
        const maxPerRow = Math.max(1,
            Math.floor((colW - pad * 2 + gap) / (sz.w + gap)));
        const row = Math.floor(count / maxPerRow);
        const colInRow = count % maxPerRow;
        const x = colIndex * colW + pad + colInRow * (sz.w + gap);
        const y = HEADER_H_PX + row * (sz.h + gap);
        return { x, y };
    }

    #applyTransform(info) {
        info.el.style.transform = `translate(${info.x}px, ${info.y}px) scale(${info.scale})`;
    }

    #wirePieceEvents(div, piece, info) {
        div.addEventListener('dblclick', () => this.#engine.removePiece(piece.id));

        div.addEventListener('wheel', e => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            info.scale = Math.max(0.3, Math.min(5, info.scale + delta));
            this.#applyTransform(info);
        }, { passive: false });

        let dragging = false;
        let pointerStartX = 0, pointerStartY = 0;
        let startElX = 0, startElY = 0;

        div.addEventListener('pointerdown', e => {
            dragging = true;
            div.setPointerCapture(e.pointerId);
            pointerStartX = e.clientX;
            pointerStartY = e.clientY;
            startElX = info.x;
            startElY = info.y;
            this.#zCounter += 1;
            div.style.zIndex = String(this.#zCounter);
            e.preventDefault();
        });
        div.addEventListener('pointermove', e => {
            if (!dragging) return;
            info.x = startElX + (e.clientX - pointerStartX);
            info.y = startElY + (e.clientY - pointerStartY);
            this.#applyTransform(info);
        });
        div.addEventListener('pointerup', e => {
            if (!dragging) return;
            dragging = false;
            div.releasePointerCapture(e.pointerId);
            info.x = Math.round(info.x / GRID_PX) * GRID_PX;
            info.y = Math.round(info.y / GRID_PX) * GRID_PX;
            this.#applyTransform(info);
        });
    }
}

function miniSvg(type, mode) {
    if (mode === 'pengar') {
        switch (type) {
            case 'tusental':  return `<svg viewBox="0 0 52 30" width="52" height="30"><rect x="1" y="1" width="50" height="28" rx="3" fill="#1E88E5" stroke="#1565C0" stroke-width="1"/><text x="26" y="15" text-anchor="middle" font-size="8" font-weight="bold" fill="white" font-family="Nunito">1000</text><text x="26" y="23" text-anchor="middle" font-size="5" fill="#90CAF9" font-family="Nunito">kronor</text></svg>`;
            case 'hundratal': return `<svg viewBox="0 0 52 30" width="52" height="30"><rect x="1" y="1" width="50" height="28" rx="3" fill="#388E3C" stroke="#2E7D32" stroke-width="1"/><text x="26" y="15" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="Nunito">100</text><text x="26" y="23" text-anchor="middle" font-size="5" fill="#A5D6A7" font-family="Nunito">kronor</text></svg>`;
            case 'tiotal':    return `<svg viewBox="0 0 30 30" width="30" height="30"><circle cx="15" cy="15" r="13" fill="#F9A825" stroke="#92700A" stroke-width="1"/><text x="15" y="14" text-anchor="middle" font-size="7" font-weight="bold" fill="#3a2000" font-family="Nunito">10</text><text x="15" y="22" text-anchor="middle" font-size="5" fill="#3a2000" font-family="Nunito">kr</text></svg>`;
            case 'ental':     return `<svg viewBox="0 0 26 26" width="26" height="26"><circle cx="13" cy="13" r="11" fill="#b87333" stroke="#7a4010" stroke-width="1"/><text x="13" y="12" text-anchor="middle" font-size="7" font-weight="bold" fill="white" font-family="Nunito">1</text><text x="13" y="20" text-anchor="middle" font-size="5" fill="#FFD9B8" font-family="Nunito">kr</text></svg>`;
        }
    }
    switch (type) {
        case 'tusental':  return `<svg viewBox="0 0 24 24" width="28" height="28"><polygon points="12,1 22,6 12,11 2,6" fill="#64B5F6" stroke="#1565C0" stroke-width="1"/><polygon points="2,6 2,18 12,23 12,11" fill="#1E88E5" stroke="#1565C0" stroke-width="1"/><polygon points="12,11 22,6 22,18 12,23" fill="#1565C0" stroke="#1565C0" stroke-width="1"/></svg>`;
        case 'hundratal': return `<svg viewBox="0 0 24 14" width="32" height="18"><polygon points="12,1 22,5 12,9 2,5" fill="#81C784" stroke="#2E7D32" stroke-width="1"/><polygon points="2,5 2,9 12,13 12,9" fill="#388E3C" stroke="#2E7D32" stroke-width="1"/><polygon points="12,9 22,5 22,9 12,13" fill="#2E7D32" stroke="#2E7D32" stroke-width="1"/></svg>`;
        case 'tiotal':    return `<svg viewBox="0 0 32 14" width="36" height="16"><polygon points="16,1 30,5 16,9 2,5" fill="#FFD54F" stroke="#92700A" stroke-width="1"/><polygon points="2,5 2,9 16,13 16,9" fill="#F9A825" stroke="#92700A" stroke-width="1"/><polygon points="16,9 30,5 30,9 16,13" fill="#F57F17" stroke="#92700A" stroke-width="1"/></svg>`;
        case 'ental':     return `<svg viewBox="0 0 16 18" width="18" height="20"><polygon points="8,1 15,5 8,9 1,5" fill="#EF9A9A" stroke="#C62828" stroke-width="1"/><polygon points="1,5 1,13 8,17 8,9" fill="#C62828" stroke="#C62828" stroke-width="1"/><polygon points="8,9 15,5 15,13 8,17" fill="#E53935" stroke="#C62828" stroke-width="1"/></svg>`;
    }
    return '';
}

function pieceSvg(type, mode) {
    if (mode === 'pengar') return moneySvg(type);
    return blockSvg(type);
}

function moneySvg(type) {
    if (type === 'tusental') return `<svg viewBox="0 0 90 52" width="90" height="52" style="display:block"><rect x="1" y="1" width="88" height="50" rx="4" fill="#1E88E5" stroke="#1565C0" stroke-width="1.5"/><rect x="5" y="5" width="80" height="42" rx="3" fill="none" stroke="#64B5F6" stroke-width="1"/><circle cx="12" cy="12" r="5" fill="none" stroke="#64B5F6" stroke-width="0.8"/><circle cx="78" cy="40" r="5" fill="none" stroke="#64B5F6" stroke-width="0.8"/><text x="45" y="23" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="bold" fill="white" font-family="Nunito,sans-serif">1000</text><text x="45" y="39" text-anchor="middle" font-size="9" fill="#90CAF9" font-family="Nunito,sans-serif">kronor</text></svg>`;
    if (type === 'hundratal') return `<svg viewBox="0 0 90 52" width="90" height="52" style="display:block"><rect x="1" y="1" width="88" height="50" rx="4" fill="#388E3C" stroke="#2E7D32" stroke-width="1.5"/><rect x="5" y="5" width="80" height="42" rx="3" fill="none" stroke="#81C784" stroke-width="1"/><circle cx="12" cy="12" r="5" fill="none" stroke="#81C784" stroke-width="0.8"/><circle cx="78" cy="40" r="5" fill="none" stroke="#81C784" stroke-width="0.8"/><text x="45" y="23" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="bold" fill="white" font-family="Nunito,sans-serif">100</text><text x="45" y="39" text-anchor="middle" font-size="9" fill="#A5D6A7" font-family="Nunito,sans-serif">kronor</text></svg>`;
    if (type === 'tiotal') return `<svg viewBox="0 0 60 60" width="60" height="60" style="display:block"><circle cx="30" cy="30" r="28" fill="#F9A825" stroke="#92700A" stroke-width="1.5"/><circle cx="30" cy="30" r="23" fill="none" stroke="#FFD54F" stroke-width="1"/><text x="30" y="27" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="bold" fill="#3a2000" font-family="Nunito,sans-serif">10</text><text x="30" y="43" text-anchor="middle" font-size="10" fill="#3a2000" font-family="Nunito,sans-serif">kr</text></svg>`;
    if (type === 'ental') return `<svg viewBox="0 0 46 46" width="46" height="46" style="display:block"><circle cx="23" cy="23" r="21" fill="#b87333" stroke="#7a4010" stroke-width="1.5"/><circle cx="23" cy="23" r="16" fill="none" stroke="#d4956a" stroke-width="1"/><text x="23" y="21" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="bold" fill="white" font-family="Nunito,sans-serif">1</text><text x="23" y="35" text-anchor="middle" font-size="9" fill="#FFD9B8" font-family="Nunito,sans-serif">kr</text></svg>`;
    return '';
}

function blockSvg(type) {
    let lines = '';
    if (type === 'ental') {
        return `<svg viewBox="0 0 30 33" width="36" height="40" style="display:block"><polygon points="15,2 28,9 15,16 2,9" fill="#EF9A9A" stroke="#C62828" stroke-width="1"/><polygon points="2,9 2,23 15,30 15,16" fill="#C62828" stroke="#C62828" stroke-width="1"/><polygon points="15,16 28,9 28,23 15,30" fill="#E53935" stroke="#C62828" stroke-width="1"/></svg>`;
    }
    if (type === 'tiotal') {
        for (let i = 1; i <= 9; i++) {
            lines += `<line x1="${6+5*i}" y1="${1+2.5*i}" x2="${1+5*i}" y2="${3.5+2.5*i}" stroke="#92700A" stroke-width="0.6"/>`;
            lines += `<line x1="${6+5*i}" y1="${6+2.5*i}" x2="${6+5*i}" y2="${1+2.5*i}" stroke="#92700A" stroke-width="0.6"/>`;
        }
        return `<svg viewBox="0 0 58 35" width="116" height="70" style="display:block"><polygon points="56,31 51,33.5 51,28.5 56,26" fill="#F57F17" stroke="#92700A" stroke-width="0.8"/><polygon points="1,8.5 51,33.5 56,31 6,6" fill="#E65100" stroke="#92700A" stroke-width="0.8"/><polygon points="6,6 56,31 56,26 6,1" fill="#F9A825" stroke="#92700A" stroke-width="0.8"/><polygon points="6,1 56,26 51,28.5 1,3.5" fill="#FFD54F" stroke="#92700A" stroke-width="0.8"/><polygon points="6,1 1,3.5 1,8.5 6,6" fill="#F57F17" stroke="#92700A" stroke-width="0.8"/>${lines}</svg>`;
    }
    if (type === 'hundratal') {
        for (let i = 1; i <= 9; i++) {
            lines += `<line x1="${60+6*i}" y1="${1+3*i}" x2="${6*i}" y2="${31+3*i}" stroke="#2E7D32" stroke-width="0.5"/>`;
            lines += `<line x1="${60-6*i}" y1="${1+3*i}" x2="${120-6*i}" y2="${31+3*i}" stroke="#2E7D32" stroke-width="0.5"/>`;
        }
        return `<svg viewBox="0 0 121 68" width="121" height="68" style="display:block"><polygon points="120,37 60,67 60,61 120,31" fill="#2E7D32" stroke="#2E7D32" stroke-width="0.8"/><polygon points="0,31 0,37 60,67 60,61" fill="#388E3C" stroke="#2E7D32" stroke-width="0.8"/><polygon points="60,1 120,31 60,61 0,31" fill="#81C784" stroke="#2E7D32" stroke-width="0.8"/>${lines}</svg>`;
    }
    if (type === 'tusental') {
        for (let i = 1; i <= 9; i++) {
            lines += `<line x1="${60+6*i}" y1="${1+3*i}" x2="${6*i}" y2="${31+3*i}" stroke="#1565C0" stroke-width="0.5"/>`;
            lines += `<line x1="${60-6*i}" y1="${1+3*i}" x2="${120-6*i}" y2="${31+3*i}" stroke="#1565C0" stroke-width="0.5"/>`;
            lines += `<line x1="${6*i}" y1="${31+3*i}" x2="${6*i}" y2="${91+3*i}" stroke="#1565C0" stroke-width="0.5"/>`;
            lines += `<line x1="0" y1="${31+6*i}" x2="60" y2="${61+6*i}" stroke="#1565C0" stroke-width="0.5"/>`;
            lines += `<line x1="${60+6*i}" y1="${61-3*i}" x2="${60+6*i}" y2="${121-3*i}" stroke="#1565C0" stroke-width="0.5"/>`;
            lines += `<line x1="60" y1="${61+6*i}" x2="120" y2="${31+6*i}" stroke="#1565C0" stroke-width="0.5"/>`;
        }
        return `<svg viewBox="0 0 121 122" width="121" height="122" style="display:block"><polygon points="120,91 60,121 60,61 120,31" fill="#1565C0" stroke="#1565C0" stroke-width="0.8"/><polygon points="0,31 0,91 60,121 60,61" fill="#1E88E5" stroke="#1565C0" stroke-width="0.8"/><polygon points="60,1 120,31 60,61 0,31" fill="#64B5F6" stroke="#1565C0" stroke-width="0.8"/>${lines}</svg>`;
    }
    return '';
}
