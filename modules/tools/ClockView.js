const SVG_NS = 'http://www.w3.org/2000/svg';
const CX = 170, CY = 170;

/** Create an SVG element with given attributes. */
function svgCreate(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
}

/** Convert clock angle (0 = top, clockwise) to SVG x,y at radius r. */
function clockXY(r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

/** Convert pointer event to SVG coordinate space. */
function getSVGPoint(e, svg) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}

export class ClockView {
    #engine;
    #root        = null;
    #unsubscribe = null;

    // SVG refs
    #svgEl       = null;
    #handHour    = null;
    #handMinute  = null;
    #minRingG    = null;
    #ticksG      = null;
    #g24         = null;
    #g12         = null;
    #tealRing    = null;

    // Digital panel refs
    #digitalSection = null;
    #digitalHFm     = null;
    #digitalMFm     = null;
    #digitalHEm     = null;
    #digitalMEm     = null;
    #panelFm        = null;
    #panelEm        = null;

    // Right-panel label refs  { '00': el, '05': el, … }
    #labelEls = {};

    // Layer toggles
    #layers    = { layer1: true, layer2: false, layer3: false, layer4: true };
    #layerBtns = {};     // { layer1: btn, … }

    // Drag state
    #dragInitialized = false;

    constructor(engine) {
        this.#engine = engine;
    }

    mount(parentEl) {
        this.#root = this.#buildDOM();
        parentEl.appendChild(this.#root);
        this.#drawClockFace();
        this.#applyLayers();
        this.#unsubscribe = this.#engine.subscribe(r => this.#render(r));
        return this.#root;
    }

    unmount() {
        this.#unsubscribe?.();
        this.#root?.remove();
        this.#root = null;
        this.#dragInitialized = false;
    }

    /** Call after the SVG is visible in the DOM (getScreenCTM requires layout). */
    initDragIfNeeded() {
        if (this.#dragInitialized) return;
        if (!this.#svgEl?.getScreenCTM()) return;
        this.#dragInitialized = true;
        this.#setupDrag(this.#handMinute, 'minute');
        this.#setupDrag(this.#handHour,   'hour');
    }

    // ─── DOM construction ────────────────────────────────────────────────────

    #buildDOM() {
        const section = document.createElement('section');
        section.className = 'view-section flex-col md:flex-row h-full items-center justify-center bg-soft-bg gap-10 p-6 overflow-auto';

        section.appendChild(this.#buildLeftPanel());
        section.appendChild(this.#buildSVGWrapper());
        section.appendChild(this.#buildRightPanel());

        return section;
    }

    #buildLeftPanel() {
        const panel = document.createElement('div');
        panel.className = 'flex flex-col items-center gap-5 bg-white p-7 rounded-3xl shadow-lg border border-soft-border w-full max-w-xs shrink-0';

        // Layer toggles section
        const layerWrap = document.createElement('div');
        layerWrap.className = 'w-full';

        const layerHead = document.createElement('h3');
        layerHead.className = 'text-sm font-bold text-soft-muted uppercase tracking-widest mb-3';
        layerHead.textContent = 'Lager';
        layerWrap.appendChild(layerHead);

        const layerDefs = [
            { key: 'layer1', label: 'Timmar 1–12',        color: '#1a2e5a' },
            { key: 'layer2', label: '+ Timmar 13–24',     color: '#c07000' },
            { key: 'layer3', label: '+ Minuter (+5, +10…)', color: '#1a6060' },
            { key: 'layer4', label: 'Digital klocka',     color: '#6d28d9' },
        ];

        const btnGroup = document.createElement('div');
        btnGroup.className = 'flex flex-col gap-2 w-full';

        layerDefs.forEach(def => {
            const btn = document.createElement('button');
            btn.className = 'w-full py-2.5 rounded-lg font-bold text-sm border transition-colors';
            btn.textContent = def.label;
            btn.addEventListener('click', () => this.#toggleLayer(def.key));
            this.#layerBtns[def.key] = btn;
            btnGroup.appendChild(btn);
        });

        layerWrap.appendChild(btnGroup);
        panel.appendChild(layerWrap);

        // Digital time section
        const digitalSection = document.createElement('div');
        digitalSection.className = 'w-full flex flex-col items-center gap-5';
        this.#digitalSection = digitalSection;

        const hr1 = document.createElement('hr');
        hr1.style.cssText = 'width:100%;border-color:#d6d4d0;';
        digitalSection.appendChild(hr1);

        const digitalHead = document.createElement('h3');
        digitalHead.className = 'text-sm font-bold text-soft-muted uppercase tracking-widest';
        digitalHead.textContent = 'Digital tid';
        digitalSection.appendChild(digitalHead);

        // FM panel
        const panelFm = document.createElement('div');
        panelFm.className = 'w-full rounded-2xl border-2 p-4 transition-all';
        panelFm.style.cssText = 'border-color:#d6d4d0;opacity:0.45;';
        this.#panelFm = panelFm;

        const fmTitle = document.createElement('div');
        fmTitle.className = 'text-xs font-bold mb-2 uppercase tracking-wider';
        fmTitle.style.color = '#1a2e5a';
        fmTitle.textContent = 'Förmiddag';
        panelFm.appendChild(fmTitle);

        const fmTime = document.createElement('div');
        fmTime.className = 'text-4xl font-mono font-bold flex items-center gap-1';
        fmTime.style.color = '#1a2e5a';

        const hFm = document.createElement('span');
        hFm.textContent = '10';
        this.#digitalHFm = hFm;

        const colonFm = document.createElement('span');
        colonFm.className = 'opacity-40 text-2xl pb-1';
        colonFm.textContent = ':';

        const mFm = document.createElement('span');
        mFm.textContent = '10';
        this.#digitalMFm = mFm;

        fmTime.appendChild(hFm);
        fmTime.appendChild(colonFm);
        fmTime.appendChild(mFm);
        panelFm.appendChild(fmTime);

        const fmSub = document.createElement('div');
        fmSub.className = 'text-xs text-soft-muted mt-1 font-semibold';
        fmSub.textContent = '00:00 – 11:59';
        panelFm.appendChild(fmSub);
        digitalSection.appendChild(panelFm);

        // EM panel
        const panelEm = document.createElement('div');
        panelEm.className = 'w-full rounded-2xl border-2 p-4 transition-all';
        panelEm.style.cssText = 'border-color:#d6d4d0;opacity:0.45;';
        this.#panelEm = panelEm;

        const emTitle = document.createElement('div');
        emTitle.className = 'text-xs font-bold mb-2 uppercase tracking-wider';
        emTitle.style.color = '#1a2e5a';
        emTitle.textContent = 'Eftermiddag';
        panelEm.appendChild(emTitle);

        const emTime = document.createElement('div');
        emTime.className = 'text-4xl font-mono font-bold flex items-center gap-1';
        emTime.style.color = '#1a2e5a';

        const hEm = document.createElement('span');
        hEm.textContent = '22';
        this.#digitalHEm = hEm;

        const colonEm = document.createElement('span');
        colonEm.className = 'opacity-40 text-2xl pb-1';
        colonEm.textContent = ':';

        const mEm = document.createElement('span');
        mEm.textContent = '10';
        this.#digitalMEm = mEm;

        emTime.appendChild(hEm);
        emTime.appendChild(colonEm);
        emTime.appendChild(mEm);
        panelEm.appendChild(emTime);

        const emSub = document.createElement('div');
        emSub.className = 'text-xs text-soft-muted mt-1 font-semibold';
        emSub.textContent = '12:00 – 23:59';
        panelEm.appendChild(emSub);
        digitalSection.appendChild(panelEm);

        panel.appendChild(digitalSection);

        // +/- buttons
        const rowHour = document.createElement('div');
        rowHour.className = 'flex gap-3 w-full';
        [[-60, '−1 tim'], [60, '+1 tim']].forEach(([d, lbl]) => {
            const btn = document.createElement('button');
            btn.className = 'flex-1 bg-soft-bg hover:bg-soft-border py-2.5 rounded-lg font-bold text-soft-text border border-soft-border text-sm';
            btn.textContent = lbl;
            btn.addEventListener('click', () => this.#engine.adjustTime(d));
            rowHour.appendChild(btn);
        });
        panel.appendChild(rowHour);

        const rowMin = document.createElement('div');
        rowMin.className = 'flex gap-3 w-full';
        [[-1, '−1 min'], [1, '+1 min']].forEach(([d, lbl]) => {
            const btn = document.createElement('button');
            btn.className = 'flex-1 bg-soft-bg hover:bg-soft-border py-2.5 rounded-lg font-bold text-soft-text border border-soft-border text-sm';
            btn.textContent = lbl;
            btn.addEventListener('click', () => this.#engine.adjustTime(d));
            rowMin.appendChild(btn);
        });
        panel.appendChild(rowMin);

        // Hint text
        const hint = document.createElement('p');
        hint.className = 'text-xs text-soft-muted text-center leading-relaxed';
        hint.innerHTML = '<i class="fas fa-hand-pointer mr-1"></i>Dra den <span style="color:#c0392b;font-weight:700;">röda</span> minutvisaren eller den <span style="color:#1a2e5a;font-weight:700;">blå</span> timvisaren för att ändra tiden.';
        panel.appendChild(hint);

        return panel;
    }

    #buildSVGWrapper() {
        const wrap = document.createElement('div');
        wrap.className = 'flex items-center justify-center select-none shrink-0';

        const svg = svgCreate('svg', { viewBox: '0 0 340 340' });
        svg.style.cssText = 'width:min(520px,92vw);height:min(520px,92vw);';
        this.#svgEl = svg;

        // Teal minute ring background
        const tealRing = svgCreate('circle', { cx: CX, cy: CY, r: 165, fill: '#7ec8c8', stroke: '#5aabab', 'stroke-width': '1.5' });
        this.#tealRing = tealRing;
        svg.appendChild(tealRing);

        // Minute ring group (bubbles + minor ticks)
        const minRingG = svgCreate('g');
        this.#minRingG = minRingG;
        svg.appendChild(minRingG);

        // Main white face
        svg.appendChild(svgCreate('circle', { cx: CX, cy: CY, r: 138, fill: 'white', stroke: '#e8e5e0', 'stroke-width': '2' }));

        // Inner ticks group
        const ticksG = svgCreate('g');
        this.#ticksG = ticksG;
        svg.appendChild(ticksG);

        // 24h numbers group
        const g24 = svgCreate('g');
        this.#g24 = g24;
        svg.appendChild(g24);

        // 12h numbers group
        const g12 = svgCreate('g');
        this.#g12 = g12;
        svg.appendChild(g12);

        // Hour hand
        const handHour = svgCreate('line', {
            x1: CX, y1: CY, x2: CX, y2: 100,
            stroke: '#1a2e5a', 'stroke-width': '7', 'stroke-linecap': 'round',
            transform: 'rotate(0 170 170)',
        });
        handHour.setAttribute('style', 'cursor:grab;touch-action:none;');
        this.#handHour = handHour;
        svg.appendChild(handHour);

        // Minute hand
        const handMinute = svgCreate('line', {
            x1: CX, y1: CY, x2: CX, y2: 48,
            stroke: '#c0392b', 'stroke-width': '4.5', 'stroke-linecap': 'round',
            transform: 'rotate(0 170 170)',
        });
        handMinute.setAttribute('style', 'cursor:grab;touch-action:none;');
        this.#handMinute = handMinute;
        svg.appendChild(handMinute);

        // Centre dots
        svg.appendChild(svgCreate('circle', { cx: CX, cy: CY, r: 7,   fill: '#1a2e5a' }));
        svg.appendChild(svgCreate('circle', { cx: CX, cy: CY, r: 3.5, fill: '#c0392b' }));

        wrap.appendChild(svg);
        return wrap;
    }

    #buildRightPanel() {
        const panel = document.createElement('div');
        panel.className = 'flex flex-col bg-white p-5 rounded-3xl shadow-lg border border-soft-border w-full max-w-xs shrink-0';

        const head = document.createElement('h3');
        head.className = 'text-sm font-bold text-soft-muted uppercase tracking-widest mb-3';
        head.textContent = 'Vad är klockan?';
        panel.appendChild(head);

        const list = document.createElement('div');
        list.className = 'flex flex-col gap-0.5';

        const labels = [
            ['00', ':00', 'hel'],
            ['05', ':05', 'fem över'],
            ['10', ':10', 'tio över'],
            ['15', ':15', 'kvart över'],
            ['20', ':20', 'tjugo över'],
            ['25', ':25', 'fem i halv'],
            ['30', ':30', 'halv'],
            ['35', ':35', 'fem över halv'],
            ['40', ':40', 'tjugo i'],
            ['45', ':45', 'kvart i'],
            ['50', ':50', 'tio i'],
            ['55', ':55', 'fem i'],
        ];

        labels.forEach(([id, time, text]) => {
            const row = document.createElement('div');
            row.className = 'flex items-center gap-2 px-2 py-1.5 rounded-lg';
            row.style.transition = 'background 0.15s';

            const timeSpan = document.createElement('span');
            timeSpan.className = 'font-mono font-bold text-sm w-9';
            timeSpan.style.color = '#1a6060';
            timeSpan.textContent = time;

            const textSpan = document.createElement('span');
            textSpan.className = 'text-sm font-semibold';
            textSpan.style.color = '#1a2e5a';
            textSpan.textContent = text;

            row.appendChild(timeSpan);
            row.appendChild(textSpan);
            list.appendChild(row);
            this.#labelEls[id] = row;
        });

        panel.appendChild(list);
        return panel;
    }

    // ─── Clock face drawing ──────────────────────────────────────────────────

    #drawClockFace() {
        this.#drawMinuteRing();
        this.#drawTicks();
        this.#draw24hNumbers();
        this.#draw12hNumbers();
    }

    #drawMinuteRing() {
        const g = this.#minRingG;
        g.innerHTML = '';
        for (let m = 0; m < 60; m++) {
            const angle = m * 6;
            const isFive = m % 5 === 0;
            if (!isFive) {
                const inner = clockXY(148, angle);
                const outer = clockXY(158, angle);
                const tick = svgCreate('line', {
                    x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y,
                    stroke: 'rgba(255,255,255,0.7)', 'stroke-width': '1.5',
                });
                g.appendChild(tick);
            } else {
                const bPos = clockXY(154, angle);
                const mins = m === 0 ? ':00' : `:${String(m).padStart(2, '0')}`;

                const circ = svgCreate('circle', {
                    cx: bPos.x, cy: bPos.y, r: 11,
                    fill: 'white', opacity: '0.92',
                });
                g.appendChild(circ);

                const txt = svgCreate('text', {
                    x: bPos.x, y: bPos.y + 4,
                    'text-anchor': 'middle',
                    'font-family': 'Nunito,sans-serif',
                    'font-size': '8.5',
                    'font-weight': '800',
                    fill: '#1a6060',
                });
                txt.textContent = mins;
                g.appendChild(txt);
            }
        }
    }

    #drawTicks() {
        const g = this.#ticksG;
        g.innerHTML = '';
        for (let i = 0; i < 60; i++) {
            const angle   = i * 6;
            const isHour  = i % 5 === 0;
            const r1       = isHour ? 118 : 125;
            const p1       = clockXY(r1,  angle);
            const p2       = clockXY(136, angle);
            const line     = svgCreate('line', {
                x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
                stroke: isHour ? '#c8c4be' : '#e0ddd8',
                'stroke-width': isHour ? '2.5' : '1',
            });
            g.appendChild(line);
        }
    }

    #draw24hNumbers() {
        const g = this.#g24;
        g.innerHTML = '';
        // 13 is at the 1 o'clock position, 24 is at the 12 o'clock position
        for (let h = 13; h <= 24; h++) {
            const hour12 = h === 24 ? 0 : h - 12;
            const angle  = hour12 * 30;
            const pos    = clockXY(103, angle);
            const txt    = svgCreate('text', {
                x: pos.x, y: pos.y + 4.5,
                'text-anchor': 'middle',
                'font-family': 'Nunito,sans-serif',
                'font-size': h === 24 ? '12' : '10.5',
                'font-weight': '700',
                fill: '#c07000',
            });
            txt.textContent = String(h);
            g.appendChild(txt);
        }
    }

    #draw12hNumbers() {
        const g = this.#g12;
        g.innerHTML = '';
        for (let h = 1; h <= 12; h++) {
            const pos = clockXY(76, h * 30);
            const txt = svgCreate('text', {
                x: pos.x, y: pos.y + 6,
                'text-anchor': 'middle',
                'font-family': 'Nunito,sans-serif',
                'font-size': '18',
                'font-weight': '800',
                fill: '#1a2e5a',
            });
            txt.textContent = String(h);
            g.appendChild(txt);
        }
    }

    // ─── Layer toggling ──────────────────────────────────────────────────────

    #toggleLayer(key) {
        this.#layers[key] = !this.#layers[key];
        this.#applyLayers();
    }

    #applyLayers() {
        const { layer1, layer2, layer3, layer4 } = this.#layers;

        if (this.#g12)          this.#g12.style.display          = layer1 ? '' : 'none';
        if (this.#g24)          this.#g24.style.display          = layer2 ? '' : 'none';
        if (this.#tealRing)     this.#tealRing.style.display     = layer3 ? '' : 'none';
        if (this.#minRingG)     this.#minRingG.style.display     = layer3 ? '' : 'none';
        if (this.#digitalSection) this.#digitalSection.style.display = layer4 ? '' : 'none';

        const colors = { layer1: '#1a2e5a', layer2: '#c07000', layer3: '#1a6060', layer4: '#6d28d9' };
        const active = { layer1, layer2, layer3, layer4 };
        for (const key of Object.keys(colors)) {
            const btn = this.#layerBtns[key];
            if (!btn) continue;
            const on = active[key];
            btn.style.background  = on ? colors[key] : '#f4f3ef';
            btn.style.color       = on ? 'white'     : '#4a4b50';
            btn.style.borderColor = on ? colors[key] : '#d6d4d0';
        }
    }

    // ─── Rendering (engine subscriber) ──────────────────────────────────────

    #render(reading) {
        const { hours24, minutes, isAm } = reading;

        // Rotate hands
        const minDeg  = minutes * 6;
        const hourDeg = (hours24 % 12 + minutes / 60) * 30;
        this.#handMinute.setAttribute('transform', `rotate(${minDeg} 170 170)`);
        this.#handHour.setAttribute('transform',   `rotate(${hourDeg} 170 170)`);

        const mm = String(minutes).padStart(2, '0');

        // FM panel: always shows 00–11 format
        this.#digitalHFm.textContent = String(hours24 < 12 ? hours24 : hours24 - 12).padStart(2, '0');
        this.#digitalMFm.textContent = mm;

        // EM panel: always shows 12–23 format
        this.#digitalHEm.textContent = String(hours24 >= 12 ? hours24 : hours24 + 12).padStart(2, '0');
        this.#digitalMEm.textContent = mm;

        // Highlight active panel
        if (isAm) {
            this.#panelFm.style.opacity     = '1';
            this.#panelFm.style.borderColor = '#1a2e5a';
            this.#panelFm.style.background  = '#f0f3f8';
            this.#panelEm.style.opacity     = '0.38';
            this.#panelEm.style.borderColor = '#d6d4d0';
            this.#panelEm.style.background  = 'white';
        } else {
            this.#panelEm.style.opacity     = '1';
            this.#panelEm.style.borderColor = '#1a2e5a';
            this.#panelEm.style.background  = '#f0f3f8';
            this.#panelFm.style.opacity     = '0.38';
            this.#panelFm.style.borderColor = '#d6d4d0';
            this.#panelFm.style.background  = 'white';
        }

        this.#highlightMinuteBubble(minutes);
        this.#highlightSwedishLabel(minutes);
    }

    #highlightMinuteBubble(currentMinute) {
        const nearest5   = Math.round(currentMinute / 5) * 5 % 60;
        const bubbles    = this.#minRingG.querySelectorAll('circle');
        bubbles.forEach(c => {
            c.setAttribute('fill',    'white');
            c.setAttribute('opacity', '0.92');
        });
        const idx = nearest5 / 5; // 0–11
        if (bubbles[idx]) {
            bubbles[idx].setAttribute('fill',    '#ffe066');
            bubbles[idx].setAttribute('opacity', '1');
        }
    }

    #highlightSwedishLabel(currentMinute) {
        const nearest5 = (Math.round(currentMinute / 5) * 5) % 60;
        for (const [id, el] of Object.entries(this.#labelEls)) {
            el.style.background = parseInt(id, 10) === nearest5 ? '#ffe066' : '';
        }
    }

    // ─── Drag ────────────────────────────────────────────────────────────────

    #setupDrag(element, type) {
        let dragging = false;
        let lastAngle = 0;

        element.addEventListener('pointerdown', (e) => {
            if (!this.#svgEl.getScreenCTM()) return;
            dragging = true;
            element.setPointerCapture(e.pointerId);
            const pt = getSVGPoint(e, this.#svgEl);
            lastAngle = Math.atan2(pt.y - CY, pt.x - CX) * 180 / Math.PI;
            e.preventDefault();
        });

        element.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const ctm = this.#svgEl.getScreenCTM();
            if (!ctm) return;
            const pt  = getSVGPoint(e, this.#svgEl);
            let cur   = Math.atan2(pt.y - CY, pt.x - CX) * 180 / Math.PI;
            let diff  = cur - lastAngle;
            if (diff >  180) diff -= 360;
            if (diff < -180) diff += 360;
            lastAngle = cur;

            const raw = this.#engine.getTotalMinutesFloat();
            const next = type === 'minute'
                ? raw + diff / 6
                : raw + (diff / 30) * 60;
            this.#engine.setTotalMinutesFloat(next);
        });

        element.addEventListener('pointerup', (e) => {
            dragging = false;
            element.releasePointerCapture(e.pointerId);
            this.#engine.snapToMinutes();
        });
    }
}
