// ═══════════════════════════════════════════════════════════════════════════
// modules/tools/DecimaltalView.js
// Stage 2 — Stage 1 table + Basmaterial panel + Split/Merge actions.
// ═══════════════════════════════════════════════════════════════════════════

import { DecimaltalEngine, DEC_COL_DEFS } from './DecimaltalEngine.js';

const TOKEN_SIZE = 80;

const SHIFT_BUTTONS = [
    { steps:  1, label: '× 10',   group: 'mul' },
    { steps:  2, label: '× 100',  group: 'mul' },
    { steps:  3, label: '× 1000', group: 'mul' },
    { steps: -1, label: '÷ 10',   group: 'div' },
    { steps: -2, label: '÷ 100',  group: 'div' },
    { steps: -3, label: '÷ 1000', group: 'div' },
];

const MUL_STYLE = 'background:rgba(21,101,192,0.10);border-color:#1565C0;color:#1565C0;';
const DIV_STYLE = 'background:rgba(183,28,28,0.10);border-color:#B71C1C;color:#B71C1C;';
const TOGGLE_ON_STYLE  = 'background:rgba(61,138,138,0.15);border-color:#3d8a8a;color:#3d8a8a;';
const TOGGLE_OFF_STYLE = 'background:rgba(91,128,165,0.08);border-color:#8c8d92;color:#8c8d92;';

const BLOCK_SIZES = {
    ones:       { w: 120, h: 120 },
    tenths:     { w: 12,  h: 120 },
    hundredths: { w: 12,  h: 12 },
};

const BLOCK_COLORS = {
    ones:       '#2E7D32',
    tenths:     '#6A1B9A',
    hundredths: '#00695C',
};

const MAX_BLOCKS_SHOWN = { tenths: 30, hundredths: 100 };

export class DecimaltalView {
    #engine;
    #unsubscribe;
    #root;
    #els = {};
    #lastReading = null;
    #resizeListener = null;
    #dragX = null;
    #dragShift = 0;

    constructor(engine = new DecimaltalEngine()) { this.#engine = engine; }
    get engine() { return this.#engine; }

    mount(parent) {
        this.#root = document.createElement('section');
        this.#root.id = 'view-decimaltal';
        this.#root.className = 'view-section flex-row h-full';
        this.#root.innerHTML = this.#template();
        parent.appendChild(this.#root);

        this.#cacheRefs();
        this.#buildTableColumns();
        this.#wireEvents();

        this.#unsubscribe = this.#engine.subscribe(reading => {
            this.#lastReading = reading;
            this.#render(reading);
        });

        this.#resizeListener = () => this.#positionTokens(false);
        window.addEventListener('resize', this.#resizeListener);

        return this.#root;
    }

    onEnter() { if (this.#lastReading) this.#positionTokens(false); }
    onLeave() {}
    destroy() {
        if (this.#resizeListener) window.removeEventListener('resize', this.#resizeListener);
        this.#unsubscribe?.();
        this.#root?.remove();
    }

    #template() {
        const shiftBtns = SHIFT_BUTTONS.map(b => `
            <button data-shift="${b.steps}" class="dec-op-btn"
                    style="${b.group === 'mul' ? MUL_STYLE : DIV_STYLE}">
                ${b.label}
            </button>`).join('');

        return `
        <div id="decimaltal-sidebar"
             class="w-64 bg-soft-surface shadow-md z-10 p-5 flex flex-col gap-4
                    overflow-y-auto border-r border-soft-border shrink-0">

            <h3 class="font-bold text-soft-text text-sm uppercase tracking-wider text-soft-muted">
                Skriv ett tal
            </h3>
            <input data-role="input" type="text" placeholder="t.ex. 0,14" inputmode="decimal"
                   class="w-full border-2 border-soft-border rounded-xl px-3 py-2
                          font-bold text-soft-text text-lg focus:outline-none
                          focus:border-soft-teal"/>

            <hr class="border-soft-border"/>

            <div>
                <h4 class="font-bold text-xs uppercase tracking-wider text-soft-muted mb-3">Flytta siffror</h4>
                <div class="grid grid-cols-2 gap-2">${shiftBtns}</div>
                <p class="text-xs text-soft-muted mt-2">
                    <i class="fas fa-hand-point-left mr-1"></i>
                    Dra i tabellen vänster/höger för manuell förflyttning.
                </p>
            </div>

            <hr class="border-soft-border"/>

            <div class="bg-soft-tealLight/15 border border-soft-tealLight/30 rounded-xl p-3">
                <div class="text-xs font-bold text-soft-muted uppercase tracking-wider mb-1">Nuvarande värde</div>
                <div class="text-2xl font-extrabold text-soft-teal" data-role="value-display">—</div>
                <div data-role="range-warning" class="hidden mt-1 text-xs text-soft-pink font-semibold">
                    <i class="fas fa-exclamation-triangle mr-1"></i>Tal utanför tabellen
                </div>
            </div>

            <hr class="border-soft-border"/>

            <div>
                <h4 class="font-bold text-xs uppercase tracking-wider text-soft-muted mb-3">Visa / Dölj</h4>
                <div class="flex flex-col gap-2">
                    <button data-action="toggle-columns" data-toggle-btn="columns"
                            class="flex items-center gap-2 px-3 py-2 rounded-xl border font-bold text-sm w-full"
                            style="${TOGGLE_ON_STYLE}">
                        <i class="fas fa-eye text-sm" data-toggle-icon="columns"></i>
                        <span>Kolumnavdelare</span>
                    </button>
                    <button data-action="toggle-blocks" data-toggle-btn="blocks"
                            class="flex items-center gap-2 px-3 py-2 rounded-xl border font-bold text-sm w-full"
                            style="${TOGGLE_OFF_STYLE}">
                        <i class="fas fa-cubes text-sm" data-toggle-icon="blocks"></i>
                        <span>Basmaterial</span>
                    </button>
                    <button data-action="toggle-split" data-toggle-btn="split"
                            class="flex items-center gap-2 px-3 py-2 rounded-xl border font-bold text-sm w-full"
                            style="${TOGGLE_OFF_STYLE}">
                        <i class="fas fa-expand-arrows-alt text-sm" data-toggle-icon="split"></i>
                        <span>Dela / Slå ihop</span>
                    </button>
                </div>
            </div>

            <hr class="border-soft-border"/>
            <button data-action="reset"
                    class="bg-soft-text hover:bg-soft-muted text-white p-2 rounded-lg text-sm font-semibold mt-auto">
                <i class="fas fa-trash mr-1"></i> Rensa
            </button>
        </div>

        <div data-role="workspace" class="flex-1 flex flex-col overflow-auto">
            <div data-role="table" class="dec-table"
                 title="Dra vänster/höger för att flytta siffror">
                <div data-role="tokens-layer" id="dec-tokens-layer"></div>
            </div>
            <div data-role="blocks-panel" class="dec-tab-panel" style="display:none;">
                <h4 class="font-bold text-sm text-soft-text uppercase tracking-wider">
                    <i class="fas fa-cubes mr-1 text-soft-green"></i>Basmaterial
                </h4>
                <div data-role="blocks-area" class="dec-blocks-aligned"></div>
                <div data-role="blocks-actions" class="flex gap-3 flex-wrap"></div>
            </div>
        </div>`;
    }

    #cacheRefs() {
        const $  = sel => this.#root.querySelector(sel);
        const $$ = sel => this.#root.querySelectorAll(sel);
        this.#els = {
            input:         $('[data-role="input"]'),
            valueDisplay:  $('[data-role="value-display"]'),
            rangeWarning:  $('[data-role="range-warning"]'),
            table:         $('[data-role="table"]'),
            tokensLayer:   $('[data-role="tokens-layer"]'),
            shiftBtns:     $$('[data-shift]'),
            toggleBtns:    {
                columns: $('[data-toggle-btn="columns"]'),
                blocks:  $('[data-toggle-btn="blocks"]'),
                split:   $('[data-toggle-btn="split"]'),
            },
            toggleIcons: {
                columns: $('[data-toggle-icon="columns"]'),
                blocks:  $('[data-toggle-icon="blocks"]'),
                split:   $('[data-toggle-icon="split"]'),
            },
            blocksPanel:   $('[data-role="blocks-panel"]'),
            blocksArea:    $('[data-role="blocks-area"]'),
            blocksActions: $('[data-role="blocks-actions"]'),
        };
    }

    #buildTableColumns() {
        const table = this.#els.table;
        const tokensLayer = this.#els.tokensLayer;

        DEC_COL_DEFS.forEach((col, i) => {
            if (i === 4) {
                const sep = document.createElement('div');
                sep.className = 'dec-sep';
                sep.innerHTML = '<div class="dec-dot"></div>';
                table.insertBefore(sep, tokensLayer);
            }
            const colDiv = document.createElement('div');
            colDiv.className = 'dec-col';
            colDiv.id = `dec-col-${col.key}`;
            colDiv.dataset.colKey = col.key;

            const head = document.createElement('div');
            head.className = 'dec-col-head';
            head.innerHTML =
                  `${col.abbr ? `<span class="cab">${col.abbr}</span>` : ''}` +
                  `<span class="cnm">${col.label}</span>` +
                  `<span class="cval" data-cval="${col.key}"></span>`;

            const body = document.createElement('div');
            body.className = 'dec-col-body';
            body.id = `dec-body-${col.pos}`;

            colDiv.appendChild(head);
            colDiv.appendChild(body);
            table.insertBefore(colDiv, tokensLayer);
        });
    }

    #wireEvents() {
        this.#els.input.addEventListener('input', () => {
            this.#engine.setFromString(this.#els.input.value);
        });
        this.#els.input.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.#engine.setFromString(this.#els.input.value);
        });

        this.#root.addEventListener('click', evt => {
            const shiftBtn = evt.target.closest('[data-shift]');
            if (shiftBtn) {
                this.#engine.shift(Number(shiftBtn.dataset.shift));
                return;
            }
            const action = evt.target.closest('[data-action]')?.dataset.action;
            if (action === 'reset') {
                this.#engine.reset();
                this.#els.input.value = '';
                return;
            }
            if (action === 'toggle-columns') {
                this.#engine.setColumnsVisible(!(this.#lastReading?.columnsVisible ?? true));
                return;
            }
            if (action === 'toggle-blocks') {
                this.#engine.setBlocksVisible(!(this.#lastReading?.blocksVisible ?? false));
                return;
            }
            if (action === 'toggle-split') {
                this.#engine.setSplitVisible(!(this.#lastReading?.splitVisible ?? false));
                return;
            }
            const blockAction = evt.target.closest('[data-block-action]')?.dataset.blockAction;
            if (blockAction === 'split-one')        this.#engine.splitOne();
            if (blockAction === 'merge-tenths')     this.#engine.mergeTenths();
            if (blockAction === 'split-tenth')      this.#engine.splitTenth();
            if (blockAction === 'merge-hundredths') this.#engine.mergeHundredths();
        });

        const table = this.#els.table;
        table.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            this.#dragX = e.clientX;
            this.#dragShift = 0;
            table.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        table.addEventListener('pointermove', e => {
            if (this.#dragX === null) return;
            const colW = Math.max(48, table.offsetWidth / (DEC_COL_DEFS.length + 1));
            const dx = e.clientX - this.#dragX;
            const newShift = -Math.round(dx / colW);
            if (newShift !== this.#dragShift) {
                this.#engine.shift(newShift - this.#dragShift);
                this.#dragShift = newShift;
            }
        });
        const endDrag = () => { this.#dragX = null; this.#dragShift = 0; };
        table.addEventListener('pointerup', endDrag);
        table.addEventListener('pointercancel', endDrag);
    }

    #render(reading) {
        this.#els.valueDisplay.textContent = reading.valueText;
        this.#els.rangeWarning.classList.toggle('hidden', !reading.outOfRange);

        for (const col of DEC_COL_DEFS) {
            const span = this.#root.querySelector(`[data-cval="${col.key}"]`);
            if (span) span.textContent = reading.headerVals[col.key] || '';
        }

        this.#els.table.classList.toggle('hide-dividers', !reading.columnsVisible);

        this.#syncToggleBtn('columns', reading.columnsVisible,
            'fas fa-eye text-sm', 'fas fa-eye-slash text-sm');
        this.#syncToggleBtn('blocks', reading.blocksVisible,
            'fas fa-cubes text-sm', 'fas fa-cubes text-sm');
        this.#syncToggleBtn('split', reading.splitVisible,
            'fas fa-expand-arrows-alt text-sm', 'fas fa-expand-arrows-alt text-sm');

        this.#els.blocksPanel.style.display = reading.blocksVisible ? 'flex' : 'none';
        if (reading.blocksVisible) this.#renderBlocks(reading);

        this.#rebuildTokens(reading);
    }

    #syncToggleBtn(key, isOn, iconOn, iconOff) {
        const btn  = this.#els.toggleBtns[key];
        const icon = this.#els.toggleIcons[key];
        if (!btn) return;
        btn.style.cssText = isOn ? TOGGLE_ON_STYLE : TOGGLE_OFF_STYLE;
        if (icon) icon.className = isOn ? iconOn : iconOff;
    }

    #renderBlocks(reading) {
        const area    = this.#els.blocksArea;
        const actions = this.#els.blocksActions;
        area.innerHTML    = '';
        actions.innerHTML = '';

        const b = reading.blocks;
        const isEmpty = b.ones === 0 && b.tenths === 0 && b.hundredths === 0;

        if (isEmpty) {
            const msg = document.createElement('p');
            msg.className = 'text-soft-muted text-sm italic px-4 py-4';
            msg.textContent = 'Skriv ett decimaltal för att se basmaterialet.';
            area.appendChild(msg);
        } else {
            DEC_COL_DEFS.forEach((col, i) => {
                if (i === 4) {
                    const sep = document.createElement('div');
                    sep.className = 'dec-blocks-sep';
                    area.appendChild(sep);
                }
                const colDiv = document.createElement('div');
                colDiv.className = 'dec-blocks-col';

                if (col.key === 'ental' && b.ones > 0) {
                    this.#addBlocksRow(colDiv, 'Ental', b.ones, 'ones');
                } else if (col.key === 'tiondelar' && b.tenths > 0) {
                    this.#addBlocksRow(colDiv, 'Tiondelar', b.tenths, 'tenths');
                } else if (col.key === 'hundradelar' && b.hundredths > 0) {
                    this.#addBlocksRow(colDiv, 'Hundradelar', b.hundredths, 'hundredths');
                }
                area.appendChild(colDiv);
            });
        }

        if (reading.splitVisible) this.#renderSplitButtons(actions, b);
    }

    #addBlocksRow(colDiv, labelText, count, kind) {
        const max = MAX_BLOCKS_SHOWN[kind] ?? Infinity;
        const truncated = count > max;
        const showCount = Math.min(count, max);

        const lbl = document.createElement('div');
        lbl.className = 'text-xs font-bold uppercase tracking-wide mb-1';
        lbl.style.color = BLOCK_COLORS[kind];
        lbl.textContent = `${labelText} ×${count}${truncated ? ` (max ${max})` : ''}`;
        colDiv.appendChild(lbl);

        const row = document.createElement('div');
        row.className = 'dec-blk-row';
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;line-height:0;';
        if (kind === 'hundredths') {
            row.style.maxWidth = (BLOCK_SIZES.hundredths.w * 10 + 3 * 9) + 'px';
        }

        for (let j = 0; j < showCount; j++) {
            const w = document.createElement('div');
            w.style.cssText = 'display:inline-block;line-height:0;';
            w.appendChild(makeFlatPlate(BLOCK_SIZES[kind].w, BLOCK_SIZES[kind].h, BLOCK_COLORS[kind]));
            row.appendChild(w);
        }
        colDiv.appendChild(row);
    }

    #renderSplitButtons(actions, b) {
        const btnStyle = 'px-3 py-1.5 rounded font-bold text-xs border-2 cursor-pointer transition-all hover:opacity-80';

        const make = (action, style, html) => {
            const btn = document.createElement('button');
            btn.className = btnStyle;
            btn.style.cssText = style;
            btn.dataset.blockAction = action;
            btn.innerHTML = html;
            return btn;
        };

        const greenStyle  = 'background:#C8E6C9;border-color:#2E7D32;color:#1B5E20;';
        const purpleStyle = 'background:#E1BEE7;border-color:#6A1B9A;color:#4A148C;';

        if (b.ones > 0) {
            actions.appendChild(make('split-one', greenStyle,
                '<i class="fas fa-expand-arrows-alt mr-1"></i>Dela 1 ental → 10 tiondelar'));
        }
        if (b.tenths >= 10) {
            actions.appendChild(make('merge-tenths', greenStyle,
                '<i class="fas fa-compress-arrows-alt mr-1"></i>Slå ihop 10 tiondelar → 1 ental'));
        }
        if (b.tenths > 0) {
            actions.appendChild(make('split-tenth', purpleStyle,
                '<i class="fas fa-expand-arrows-alt mr-1"></i>Dela 1 tiondel → 10 hundradelar'));
        }
        if (b.hundredths >= 10) {
            actions.appendChild(make('merge-hundredths', purpleStyle,
                '<i class="fas fa-compress-arrows-alt mr-1"></i>Slå ihop 10 hundradelar → 1 tiondel'));
        }
    }

    #rebuildTokens(reading) {
        const layer = this.#els.tokensLayer;
        const existing = Array.from(layer.querySelectorAll('.dec-token'));
        const needed = reading.digits.length;

        if (existing.length !== needed) {
            existing.forEach(t => t.remove());
            reading.digits.forEach((digit, i) => {
                const token = document.createElement('div');
                token.id = `dec-token-${i}`;
                token.className = 'dec-token';
                token.textContent = String(digit.val);
                token.style.transition = 'none';
                layer.appendChild(token);
            });
            this.#positionTokens(false);
        } else {
            reading.digits.forEach((digit, i) => {
                const token = layer.querySelector(`#dec-token-${i}`);
                if (token) token.textContent = String(digit.val);
            });
            this.#positionTokens(true);
        }
    }

    #positionTokens(animate) {
        const layer = this.#els.tokensLayer;
        if (!layer || !this.#lastReading) return;
        const layerRect = layer.getBoundingClientRect();
        if (!layerRect.width) return;

        const table = this.#els.table;
        const headEl = table.querySelector('.dec-col-head');
        const headH = headEl ? headEl.offsetHeight : 52;
        const tableH = table.offsetHeight;
        const tokenTop = headH + Math.max(0, (tableH - headH - TOKEN_SIZE) / 2);

        const transition = animate
            ? 'left 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s'
            : 'none';

        this.#lastReading.digits.forEach((digit, i) => {
            const token = layer.querySelector(`#dec-token-${i}`);
            if (!token) return;

            const col = DEC_COL_DEFS.find(c => c.pos === digit.pos);

            if (!col) {
                token.style.transition = transition;
                token.style.opacity = '0.15';
                token.style.left = (digit.pos > 3 ? layerRect.width - TOKEN_SIZE : 0) + 'px';
                token.style.top = tokenTop + 'px';
            } else {
                const colEl = this.#root.querySelector(`#dec-col-${col.key}`);
                if (!colEl) return;
                const colRect = colEl.getBoundingClientRect();
                const centerX = colRect.left - layerRect.left + colRect.width / 2;
                const newLeft = Math.round(centerX - TOKEN_SIZE / 2);

                token.style.transition = transition;
                token.style.opacity = '1';
                token.style.left = newLeft + 'px';
                token.style.top = tokenTop + 'px';
            }
        });
    }
}

function makeFlatPlate(w, h, color) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width',   w);
    svg.setAttribute('height',  h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.style.display  = 'block';
    svg.style.overflow = 'visible';

    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', 0);
    rect.setAttribute('y', 0);
    rect.setAttribute('width',  w);
    rect.setAttribute('height', h);
    rect.setAttribute('fill',   color);
    rect.setAttribute('stroke', '#1a1a1a');
    rect.setAttribute('stroke-width', '1.5');
    svg.appendChild(rect);
    return svg;
}
