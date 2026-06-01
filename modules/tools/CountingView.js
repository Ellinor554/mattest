// ═══════════════════════════════════════════════════════════════════════════
// modules/tools/CountingView.js
// View for the Räkning tool: tiokompisar (drag balls) + math grid.
// ═══════════════════════════════════════════════════════════════════════════

import { CountingEngine, COUNTING_CONSTANTS } from './CountingEngine.js';

const { NUM_BALLS } = COUNTING_CONSTANTS;
const ZONE1_COLOR = '#a85c72';
const ZONE2_COLOR = '#5b80a5';

const MODE_BUTTONS = [
    { mode: 'friends',        label: 'Tiokompisar' },
    { mode: 'multiplication', label: 'Multiplikationskvadrat' },
    { mode: 'division',       label: 'Divisionskvadrat' },
];

export class CountingView {
    #engine;
    #unsubscribe;
    #root;
    #els = {};
    #pinnedTd = null;
    #pinnedEqHTML = '';
    #lastBuiltGridMode = null;

    constructor(engine = new CountingEngine()) {
        this.#engine = engine;
    }

    get engine() { return this.#engine; }

    mount(parent) {
        this.#root = document.createElement('section');
        this.#root.id = 'view-counting';
        this.#root.className = 'flex-col h-full bg-soft-surface';
        this.#root.innerHTML = this.#template();
        parent.appendChild(this.#root);

        this.#cacheRefs();
        this.#wireEvents();

        this.#unsubscribe = this.#engine.subscribe(reading => this.#render(reading));

        return this.#root;
    }

    onEnter() {}
    onLeave() {}
    destroy() { this.#unsubscribe?.(); this.#root?.remove(); }

    #template() {
        return `
        <div class="flex justify-center gap-4 p-4 bg-soft-bg border-b border-soft-border shrink-0 flex-wrap">
            ${MODE_BUTTONS.map(b => `
                <button data-mode="${b.mode}"
                        class="px-4 py-2 bg-soft-yellow/40 text-soft-text font-bold
                               rounded-full hover:bg-soft-yellow/70">${b.label}</button>
            `).join('')}
        </div>

        <div class="flex-1 relative overflow-auto p-4 flex items-center justify-center">

            <div data-role="friends-view" class="w-full max-w-4xl h-full flex flex-col items-center">
                <h3 class="text-2xl font-bold text-soft-text mb-6">Gruppera tiokompisarna</h3>
                <div class="flex w-full gap-8 h-64 mb-8">
                    <div data-zone="1"
                         class="flex-1 border-4 border-dashed border-soft-pinkLight rounded-3xl
                                bg-soft-pinkLight/10 flex flex-wrap content-start p-4 gap-2 relative"></div>
                    <div class="flex items-center text-5xl font-bold text-soft-border">+</div>
                    <div data-zone="2"
                         class="flex-1 border-4 border-dashed border-soft-blueLight rounded-3xl
                                bg-soft-blueLight/10 flex flex-wrap content-start p-4 gap-2 relative"></div>
                </div>
                <div class="text-4xl font-bold text-soft-text bg-white shadow-lg px-8 py-4
                            rounded-full border border-soft-border">
                    <span data-role="count-1" class="text-soft-pink">5</span> +
                    <span data-role="count-2" class="text-soft-blue">5</span> = 10
                </div>
            </div>

            <div data-role="grid-view" class="hidden flex-col items-center pb-10">
                <div data-role="grid-equation"
                     class="h-16 flex items-center justify-center text-2xl md:text-3xl
                            font-bold text-soft-purple mb-4 bg-soft-purpleLight/20 px-8 rounded-full">
                    För musen över eller tryck på rutorna
                </div>
                <div data-role="grid-table"
                     class="bg-white p-4 shadow-lg rounded-xl border border-soft-border overflow-x-auto"></div>
            </div>

        </div>`;
    }

    #cacheRefs() {
        const $ = sel => this.#root.querySelector(sel);
        const $$ = sel => this.#root.querySelectorAll(sel);
        this.#els = {
            modeButtons:  $$('[data-mode]'),
            friendsView:  $('[data-role="friends-view"]'),
            zone1:        this.#root.querySelector('[data-zone="1"]'),
            zone2:        this.#root.querySelector('[data-zone="2"]'),
            count1:       $('[data-role="count-1"]'),
            count2:       $('[data-role="count-2"]'),
            gridView:     $('[data-role="grid-view"]'),
            gridEquation: $('[data-role="grid-equation"]'),
            gridTable:    $('[data-role="grid-table"]'),
        };
    }

    #wireEvents() {
        this.#root.addEventListener('click', evt => {
            const modeBtn = evt.target.closest('[data-mode]');
            if (modeBtn) this.#engine.setMode(modeBtn.dataset.mode);
        });
    }

    #render(reading) {
        if (reading.isFriends) {
            this.#showFriends();
            this.#renderFriends(reading);
        } else {
            this.#showGrid();
            this.#renderGrid(reading);
        }
    }

    #showFriends() {
        this.#els.friendsView.classList.remove('hidden');
        this.#els.friendsView.classList.add('flex');
        this.#els.gridView.classList.add('hidden');
        this.#els.gridView.classList.remove('flex');
    }

    #showGrid() {
        this.#els.gridView.classList.remove('hidden');
        this.#els.gridView.classList.add('flex');
        this.#els.friendsView.classList.add('hidden');
        this.#els.friendsView.classList.remove('flex');
    }

    #renderFriends(reading) {
        if (this.#els.zone1.querySelectorAll('[data-ball-index]').length +
            this.#els.zone2.querySelectorAll('[data-ball-index]').length !== NUM_BALLS) {
            this.#buildBalls();
        }

        for (let i = 0; i < NUM_BALLS; i++) {
            const ball = this.#root.querySelector(`[data-ball-index="${i}"]`);
            if (!ball) continue;
            const targetZone = reading.ballZones[i];
            const currentZone = ball.parentElement.dataset.zone;
            if (currentZone !== String(targetZone)) {
                const target = targetZone === 1 ? this.#els.zone1 : this.#els.zone2;
                target.appendChild(ball);
            }
            ball.style.backgroundColor = targetZone === 1 ? ZONE1_COLOR : ZONE2_COLOR;
        }

        this.#els.count1.textContent = reading.zone1Count;
        this.#els.count2.textContent = reading.zone2Count;
    }

    #buildBalls() {
        this.#els.zone1.querySelectorAll('[data-ball-index]').forEach(b => b.remove());
        this.#els.zone2.querySelectorAll('[data-ball-index]').forEach(b => b.remove());

        for (let i = 0; i < NUM_BALLS; i++) {
            const ball = document.createElement('div');
            ball.dataset.ballIndex = i;
            ball.className = 'w-12 h-12 rounded-full shadow-md cursor-grab active:cursor-grabbing border-2 border-white';
            ball.style.touchAction = 'none';
            ball.style.userSelect  = 'none';
            this.#wireBallDrag(ball, i);
            this.#els.zone1.appendChild(ball);
        }
    }

    #wireBallDrag(ball, ballIndex) {
        let dragging = false;
        let startX = 0, startY = 0;
        let originalParent = null;
        let originalRect = null;

        ball.addEventListener('pointerdown', e => {
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            originalParent = ball.parentElement;
            originalRect = ball.getBoundingClientRect();

            ball.style.position = 'fixed';
            ball.style.left  = originalRect.left + 'px';
            ball.style.top   = originalRect.top + 'px';
            ball.style.zIndex = '1000';
            document.body.appendChild(ball);

            ball.setPointerCapture(e.pointerId);
            e.preventDefault();
        });

        ball.addEventListener('pointermove', e => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            ball.style.left = (originalRect.left + dx) + 'px';
            ball.style.top  = (originalRect.top  + dy) + 'px';
        });

        ball.addEventListener('pointerup', e => {
            if (!dragging) return;
            dragging = false;
            ball.releasePointerCapture(e.pointerId);

            const r1 = this.#els.zone1.getBoundingClientRect();
            const r2 = this.#els.zone2.getBoundingClientRect();
            const ballRect = ball.getBoundingClientRect();
            const cx = ballRect.left + ballRect.width  / 2;
            const cy = ballRect.top  + ballRect.height / 2;

            let droppedZone = null;
            if (cx >= r1.left && cx <= r1.right && cy >= r1.top && cy <= r1.bottom) droppedZone = 1;
            else if (cx >= r2.left && cx <= r2.right && cy >= r2.top && cy <= r2.bottom) droppedZone = 2;

            ball.style.position = '';
            ball.style.left = '';
            ball.style.top  = '';
            ball.style.zIndex = '';

            if (droppedZone === null) {
                originalParent.appendChild(ball);
            } else {
                this.#engine.setBallZone(ballIndex, droppedZone);
            }
        });
    }

    #renderGrid(reading) {
        if (this.#lastBuiltGridMode !== reading.mode) {
            this.#buildGridTable(reading.isMultiplication);
            this.#lastBuiltGridMode = reading.mode;
            this.#pinnedTd = null;
            this.#pinnedEqHTML = '';
            this.#els.gridEquation.innerHTML = 'För musen över eller tryck på rutorna';
        }
    }

    #buildGridTable(isMultiplication) {
        const container = this.#els.gridTable;
        container.innerHTML = '';

        const cells = CountingEngine.gridCells(isMultiplication);
        const table = document.createElement('table');
        table.className = 'border-collapse';

        cells.forEach((rowCells, i) => {
            const tr = document.createElement('tr');
            rowCells.forEach((c, j) => {
                const isHeader = c.kind === 'corner' || c.kind === 'header';
                const td = document.createElement(isHeader ? 'th' : 'td');
                td.className =
                    'w-12 h-12 text-center border border-soft-border math-grid-cell cursor-pointer ' +
                    (isHeader ? 'bg-soft-bg text-soft-muted font-bold' : 'text-soft-text');
                td.textContent = c.text;

                if (c.kind === 'cell') {
                    this.#wireCellHighlight(td, tr, table, c.equationHTML, j);
                }
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        let touchHoverTd = null;
        const tdAt = (x, y) => {
            const el = document.elementFromPoint(x, y);
            return el ? (el.tagName === 'TD' ? el : el.closest?.('td')) : null;
        };
        const setTouchHover = td => {
            if (td === touchHoverTd) return;
            if (touchHoverTd?.onmouseleave) touchHoverTd.onmouseleave();
            touchHoverTd = td;
            if (td?.onmouseenter) td.onmouseenter();
        };
        table.addEventListener('touchstart', e => {
            if (!e.touches.length) return;
            setTouchHover(tdAt(e.touches[0].clientX, e.touches[0].clientY));
        }, { passive: true });
        table.addEventListener('touchmove', e => {
            if (!e.touches.length) return;
            setTouchHover(tdAt(e.touches[0].clientX, e.touches[0].clientY));
        }, { passive: true });
        table.addEventListener('touchend', () => { touchHoverTd = null; }, { passive: true });
        table.addEventListener('touchcancel', () => {
            if (touchHoverTd?.onmouseleave) touchHoverTd.onmouseleave();
            touchHoverTd = null;
        }, { passive: true });

        container.appendChild(table);
    }

    #wireCellHighlight(td, tr, table, eqHTML, colIndex) {
        const highlightRowCol = on => {
            const fn = on ? 'add' : 'remove';
            Array.from(table.rows).forEach(r => {
                if (r.cells[colIndex]) r.cells[colIndex].classList[fn]('highlight-row-col');
            });
            Array.from(tr.cells).forEach(c => c.classList[fn]('highlight-row-col'));
        };

        td.onmouseenter = () => {
            highlightRowCol(true);
            this.#els.gridEquation.innerHTML = eqHTML;
        };
        td.onmouseleave = () => {
            if (this.#pinnedTd !== td) {
                highlightRowCol(false);
                this.#els.gridEquation.innerHTML =
                    this.#pinnedTd ? this.#pinnedEqHTML : 'För musen över eller tryck på rutorna';
            }
        };
        td.onclick = () => {
            table.querySelectorAll('.highlight-row-col').forEach(el =>
                el.classList.remove('highlight-row-col'));
            if (this.#pinnedTd === td) {
                this.#pinnedTd = null;
                this.#pinnedEqHTML = '';
            } else {
                this.#pinnedTd = td;
                this.#pinnedEqHTML = eqHTML;
            }
            highlightRowCol(true);
            this.#els.gridEquation.innerHTML = eqHTML;
        };
    }
}
