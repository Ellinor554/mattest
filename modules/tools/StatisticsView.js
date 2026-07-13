const NS = 'http://www.w3.org/2000/svg';
const PAD_L = 72, PAD_R = 24, PAD_T = 68, PAD_B = 68;

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

function niceYMax(rawMax, steps) {
    if (rawMax <= 0) return steps;
    const step = Math.ceil(rawMax / steps);
    return step * steps;
}

function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
}

export class StatisticsView {
    #engine;
    #root;
    #svg;
    #unsub;
    #activeDrag = null;  // { rowIdx, lastY, lastVal }

    // sidebar refs
    #titleInput;
    #tabBtns = {};
    #rowsContainer;
    #pieOptsSection;
    #pieDisplayBtns = {};

    constructor(engine) {
        this.#engine = engine;
    }

    mount(parentEl) {
        this.#root = this.#buildDOM();
        parentEl.appendChild(this.#root);
        this.#unsub = this.#engine.subscribe(() => this.#render());
        this.#render();
        return this.#root;
    }

    cleanup() {
        if (this.#unsub) this.#unsub();
    }

    // ── layout ────────────────────────────────────────────────────────────────
    #buildDOM() {
        const section = document.createElement('section');
        section.className = 'view-section flex flex-row h-full overflow-hidden';

        // ── sidebar ──────────────────────────────────────────────────────────
        const sidebar = document.createElement('div');
        sidebar.className = 'flex flex-col gap-3 p-3 bg-gray-50 border-r overflow-y-auto flex-shrink-0';
        sidebar.style.width = '220px';

        // title
        const titleLbl = document.createElement('label');
        titleLbl.className = 'text-xs font-semibold text-gray-600';
        titleLbl.textContent = 'Diagramtitel';
        sidebar.appendChild(titleLbl);

        this.#titleInput = document.createElement('input');
        this.#titleInput.type = 'text';
        this.#titleInput.className = 'stat-input w-full border rounded px-2 py-1 text-sm';
        this.#titleInput.value = this.#engine.getTitle();
        this.#titleInput.addEventListener('input', () => {
            this.#engine.setTitle(this.#titleInput.value);
        });
        sidebar.appendChild(this.#titleInput);

        // chart type tabs
        const tabsDiv = document.createElement('div');
        tabsDiv.className = 'flex gap-1';
        [['bar','Stapel'],['line','Linje'],['pie','Cirkel']].forEach(([t, lbl]) => {
            const btn = document.createElement('button');
            btn.className = 'chart-tab flex-1 text-xs py-1 rounded border';
            btn.textContent = lbl;
            btn.addEventListener('click', () => this.#engine.setChartType(t));
            this.#tabBtns[t] = btn;
            tabsDiv.appendChild(btn);
        });
        sidebar.appendChild(tabsDiv);

        // pie display options (hidden unless pie is active)
        this.#pieOptsSection = document.createElement('div');
        this.#pieOptsSection.className = 'flex flex-col gap-1';
        this.#pieOptsSection.style.display = 'none';

        const pieOptsLbl = document.createElement('div');
        pieOptsLbl.className = 'text-xs font-semibold text-gray-600';
        pieOptsLbl.textContent = 'Visa som';
        this.#pieOptsSection.appendChild(pieOptsLbl);

        const pieOptsRow = document.createElement('div');
        pieOptsRow.className = 'flex gap-1';
        [['antal','Antal'], ['andel','Andel'], ['procent','Procent']].forEach(([mode, lbl]) => {
            const btn = document.createElement('button');
            btn.className = 'chart-tab flex-1 text-xs py-1 rounded border';
            btn.textContent = lbl;
            btn.addEventListener('click', () => this.#engine.setPieDisplay(mode));
            this.#pieDisplayBtns[mode] = btn;
            pieOptsRow.appendChild(btn);
        });
        this.#pieOptsSection.appendChild(pieOptsRow);
        sidebar.appendChild(this.#pieOptsSection);

        // data rows
        const rowsLbl = document.createElement('div');
        rowsLbl.className = 'text-xs font-semibold text-gray-600';
        rowsLbl.textContent = 'Data';
        sidebar.appendChild(rowsLbl);

        this.#rowsContainer = document.createElement('div');
        this.#rowsContainer.className = 'flex flex-col gap-1';
        sidebar.appendChild(this.#rowsContainer);

        // add row button
        const addBtn = document.createElement('button');
        addBtn.className = 'geo-btn text-xs mt-1';
        addBtn.textContent = '+ Lägg till rad';
        addBtn.addEventListener('click', () => this.#engine.addRow());
        sidebar.appendChild(addBtn);

        // hint
        const hint = document.createElement('p');
        hint.className = 'text-xs text-gray-400 mt-2';
        hint.textContent = 'Dra staplar/punkter i diagrammet för att ändra värden.';
        sidebar.appendChild(hint);

        // ── chart area ────────────────────────────────────────────────────────
        const chartWrap = document.createElement('div');
        chartWrap.className = 'flex-1 relative p-4 overflow-hidden';

        this.#svg = document.createElementNS(NS, 'svg');
        this.#svg.style.cssText = 'width:100%;height:100%;display:block;';
        this.#svg.addEventListener('pointermove',   e => this.#onChartMove(e));
        this.#svg.addEventListener('pointerup',     e => this.#onChartUp(e));
        this.#svg.addEventListener('pointercancel', e => this.#onChartUp(e));
        chartWrap.appendChild(this.#svg);

        section.appendChild(sidebar);
        section.appendChild(chartWrap);
        return section;
    }

    // ── render ────────────────────────────────────────────────────────────────
    #render() {
        const focused = document.activeElement;
        const typingInRows = focused &&
            this.#rowsContainer.contains(focused) &&
            focused.tagName === 'INPUT';
        if (!typingInRows) this.#updateSidebarRows();
        this.#updateTabHighlight();
        this.#renderChart();
    }

    #updateTabHighlight() {
        const cur = this.#engine.getChartType();
        Object.entries(this.#tabBtns).forEach(([t, btn]) => {
            btn.classList.toggle('active', t === cur);
        });
        const isPie = cur === 'pie';
        this.#pieOptsSection.style.display = isPie ? 'flex' : 'none';
        this.#pieOptsSection.style.flexDirection = 'column';
        this.#pieOptsSection.style.gap = '4px';
        const curDisplay = this.#engine.getPieDisplay();
        Object.entries(this.#pieDisplayBtns).forEach(([mode, btn]) => {
            btn.classList.toggle('active', mode === curDisplay);
        });
    }

    #updateSidebarRows() {
        this.#rowsContainer.innerHTML = '';
        this.#engine.getData().forEach((row, i) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'flex items-center gap-1';

            const colorSwatch = document.createElement('input');
            colorSwatch.type  = 'color';
            colorSwatch.value = row.color;
            colorSwatch.title = 'Välj färg';
            colorSwatch.className = 'w-6 h-6 rounded cursor-pointer border-0 p-0';
            colorSwatch.addEventListener('input', () => {
                this.#engine.setRow(i, { color: colorSwatch.value });
            });
            rowEl.appendChild(colorSwatch);

            const labelInp = document.createElement('input');
            labelInp.type  = 'text';
            labelInp.value = row.label;
            labelInp.className = 'stat-input flex-1 border rounded px-1 py-0.5 text-xs';
            labelInp.addEventListener('input', () => {
                this.#engine.setRow(i, { label: labelInp.value });
            });
            rowEl.appendChild(labelInp);

            const valInp = document.createElement('input');
            valInp.type  = 'number';
            valInp.value = row.value;
            valInp.min   = '0';
            valInp.step  = '1';
            valInp.className = 'stat-input w-14 border rounded px-1 py-0.5 text-xs';
            valInp.addEventListener('input', () => {
                const v = parseFloat(valInp.value);
                if (!isNaN(v) && v >= 0) this.#engine.setRow(i, { value: v });
            });
            rowEl.appendChild(valInp);

            if (this.#engine.getData().length > 1) {
                const delBtn = document.createElement('button');
                delBtn.textContent = '×';
                delBtn.className = 'text-red-500 font-bold px-1 hover:text-red-700';
                delBtn.title = 'Ta bort';
                delBtn.addEventListener('click', () => this.#engine.removeRow(i));
                rowEl.appendChild(delBtn);
            }

            this.#rowsContainer.appendChild(rowEl);
        });
    }

    #renderChart() {
        // clear svg
        while (this.#svg.firstChild) this.#svg.removeChild(this.#svg.firstChild);

        const rect = this.#svg.parentElement.getBoundingClientRect();
        const W    = Math.max(rect.width  || 500, 400);
        const H    = Math.max(rect.height || 350, 300);
        this.#svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        this.#svg.setAttribute('width',  W);
        this.#svg.setAttribute('height', H);

        const data      = this.#engine.getData();
        const chartType = this.#engine.getChartType();
        const title     = this.#engine.getTitle();

        // title
        this.#svg.appendChild(svgEl('text', {
            x: W / 2, y: 36,
            'text-anchor': 'middle',
            'font-size': '22',
            'font-weight': 'bold',
            fill: '#111',
        })).textContent = title;

        if (chartType === 'bar')  this.#renderBar(data,  W, H);
        if (chartType === 'line') this.#renderLine(data, W, H);
        if (chartType === 'pie')  this.#renderPie(data,  W, H);
    }

    // ── bar chart ─────────────────────────────────────────────────────────────
    #renderBar(data, W, H) {
        const chartW  = W - PAD_L - PAD_R;
        const chartH  = H - PAD_T - PAD_B;
        const ySteps  = 5;
        const yMax    = niceYMax(Math.max(...data.map(r => r.value), 1), ySteps);
        const barW    = Math.floor(chartW / data.length * 0.6);
        const gap     = chartW / data.length;

        // axes
        this.#svg.appendChild(svgEl('line', { x1: PAD_L, y1: PAD_T, x2: PAD_L, y2: PAD_T + chartH, stroke:'#222', 'stroke-width':2 }));
        this.#svg.appendChild(svgEl('line', { x1: PAD_L, y1: PAD_T + chartH, x2: PAD_L + chartW, y2: PAD_T + chartH, stroke:'#222', 'stroke-width':2 }));

        // y-axis ticks
        for (let i = 0; i <= ySteps; i++) {
            const val = (yMax / ySteps) * i;
            const gy  = PAD_T + chartH - (i / ySteps) * chartH;
            this.#svg.appendChild(svgEl('line', { x1: PAD_L - 5, y1: gy, x2: PAD_L + chartW, y2: gy, stroke:'#ccc', 'stroke-width':1.2 }));
            const tick = svgEl('text', { x: PAD_L - 10, y: gy + 5, 'text-anchor':'end', 'font-size':'15', 'font-weight':'600', fill:'#1a1a1a' });
            tick.textContent = val;
            this.#svg.appendChild(tick);
        }

        data.forEach((row, i) => {
            const bh   = (row.value / yMax) * chartH;
            const bx   = PAD_L + gap * i + (gap - barW) / 2;
            const by   = PAD_T + chartH - bh;

            const rect = svgEl('rect', {
                x: bx, y: by, width: barW, height: bh,
                fill: row.color, rx: 3,
                class: 'stat-bar',
                style: 'cursor:ns-resize;',
            });
            this.#svg.appendChild(rect);

            // value label
            const vlbl = svgEl('text', { x: bx + barW/2, y: by - 6, 'text-anchor':'middle', 'font-size':'15', 'font-weight':'700', fill:'#111' });
            vlbl.textContent = parseFloat(row.value.toFixed(1));
            this.#svg.appendChild(vlbl);

            // x label
            const xlbl = svgEl('text', { x: bx + barW/2, y: PAD_T + chartH + 22, 'text-anchor':'middle', 'font-size':'15', 'font-weight':'600', fill:'#111' });
            xlbl.textContent = row.label;
            this.#svg.appendChild(xlbl);

            // drag to change value
            this.#makeDraggableBar(rect, i);
        });
    }

    #makeDraggableBar(rect, rowIdx) {
        rect.addEventListener('pointerdown', e => {
            e.preventDefault();
            this.#svg.setPointerCapture(e.pointerId);
            const data = this.#engine.getData();
            this.#activeDrag = { rowIdx, lastY: e.clientY, lastVal: data[rowIdx]?.value ?? 0 };
        });
    }

    // ── line chart ────────────────────────────────────────────────────────────
    #renderLine(data, W, H) {
        const chartW  = W - PAD_L - PAD_R;
        const chartH  = H - PAD_T - PAD_B;
        const ySteps  = 5;
        const yMax    = niceYMax(Math.max(...data.map(r => r.value), 1), ySteps);
        const step    = chartW / Math.max(data.length - 1, 1);

        // axes
        this.#svg.appendChild(svgEl('line', { x1: PAD_L, y1: PAD_T, x2: PAD_L, y2: PAD_T + chartH, stroke:'#222', 'stroke-width':2 }));
        this.#svg.appendChild(svgEl('line', { x1: PAD_L, y1: PAD_T + chartH, x2: PAD_L + chartW, y2: PAD_T + chartH, stroke:'#222', 'stroke-width':2 }));

        // y-axis ticks
        for (let i = 0; i <= ySteps; i++) {
            const val = (yMax / ySteps) * i;
            const gy  = PAD_T + chartH - (i / ySteps) * chartH;
            this.#svg.appendChild(svgEl('line', { x1: PAD_L - 5, y1: gy, x2: PAD_L + chartW, y2: gy, stroke:'#ccc', 'stroke-width':1.2 }));
            const tick = svgEl('text', { x: PAD_L - 10, y: gy + 5, 'text-anchor':'end', 'font-size':'15', 'font-weight':'600', fill:'#1a1a1a' });
            tick.textContent = val;
            this.#svg.appendChild(tick);
        }

        const pts = data.map((row, i) => {
            const px = PAD_L + i * (data.length > 1 ? step : chartW / 2);
            const py = PAD_T + chartH - (row.value / yMax) * chartH;
            return { px, py };
        });

        // line segments
        for (let i = 0; i < pts.length - 1; i++) {
            this.#svg.appendChild(svgEl('line', {
                x1: pts[i].px, y1: pts[i].py,
                x2: pts[i+1].px, y2: pts[i+1].py,
                stroke: '#5b80a5', 'stroke-width': 2,
            }));
        }

        // dots
        data.forEach((row, i) => {
            const { px, py } = pts[i];

            const dot = svgEl('circle', {
                cx: px, cy: py, r: 7,
                fill: row.color, stroke: '#fff', 'stroke-width': 2,
                class: 'line-dot', style: 'cursor:ns-resize;',
            });
            this.#svg.appendChild(dot);

            // value label
            const vlbl = svgEl('text', { x: px, y: py - 14, 'text-anchor':'middle', 'font-size':'15', 'font-weight':'700', fill:'#111' });
            vlbl.textContent = parseFloat(row.value.toFixed(1));
            this.#svg.appendChild(vlbl);

            // x label
            const xlbl = svgEl('text', { x: px, y: PAD_T + chartH + 22, 'text-anchor':'middle', 'font-size':'15', 'font-weight':'600', fill:'#111' });
            xlbl.textContent = row.label;
            this.#svg.appendChild(xlbl);

            // drag
            this.#makeDraggableDot(dot, i);
        });
    }

    #makeDraggableDot(dot, rowIdx) {
        dot.addEventListener('pointerdown', e => {
            e.preventDefault();
            this.#svg.setPointerCapture(e.pointerId);
            const data = this.#engine.getData();
            this.#activeDrag = { rowIdx, lastY: e.clientY, lastVal: data[rowIdx]?.value ?? 0 };
        });
    }

    #onChartMove(e) {
        if (!this.#activeDrag || !this.#svg.hasPointerCapture(e.pointerId)) return;
        const { rowIdx } = this.#activeDrag;
        const data    = this.#engine.getData();
        if (rowIdx >= data.length) return;
        const svgH    = this.#svg.viewBox.baseVal.height || 350;
        const chartH  = svgH - PAD_T - PAD_B;
        const yMax    = niceYMax(Math.max(...data.map(r => r.value), 1), 5);
        const svgRect = this.#svg.getBoundingClientRect();
        const scaleY  = svgH / svgRect.height;
        const dy      = (e.clientY - this.#activeDrag.lastY) * scaleY;
        const newVal  = Math.max(0, parseFloat((this.#activeDrag.lastVal - (dy / chartH) * yMax).toFixed(1)));
        this.#activeDrag.lastY   = e.clientY;
        this.#activeDrag.lastVal = newVal;
        this.#engine.setRow(rowIdx, { value: newVal });
    }

    #onChartUp(e) {
        if (!this.#activeDrag) return;
        this.#activeDrag = null;
        try { this.#svg.releasePointerCapture(e.pointerId); } catch {}
    }

    // ── pie chart ─────────────────────────────────────────────────────────────
    #renderPie(data, W, H) {
        const total   = data.reduce((s, r) => s + r.value, 0) || 1;
        const cx      = W * 0.42;
        const cy      = H / 2 + 10;
        const rPie    = Math.min(cx - PAD_L, cy - PAD_T, H / 2 - 20);
        const display = this.#engine.getPieDisplay();

        let startAngle = -Math.PI / 2;

        data.forEach(row => {
            const slice    = (row.value / total) * 2 * Math.PI;
            const endAngle = startAngle + slice;
            const large    = slice > Math.PI ? 1 : 0;

            const x1 = cx + rPie * Math.cos(startAngle);
            const y1 = cy + rPie * Math.sin(startAngle);
            const x2 = cx + rPie * Math.cos(endAngle);
            const y2 = cy + rPie * Math.sin(endAngle);

            const d = `M ${cx} ${cy} L ${x1} ${y1} A ${rPie} ${rPie} 0 ${large} 1 ${x2} ${y2} Z`;
            const path = svgEl('path', { d, fill: row.color, stroke: '#fff', 'stroke-width': 2, class: 'pie-slice' });
            this.#svg.appendChild(path);

            // label inside slice — only if slice is wide enough to fit text
            if (slice >= 0.25) {
                const midAngle = startAngle + slice / 2;
                const labelR   = rPie * 0.62;
                const lx = cx + labelR * Math.cos(midAngle);
                const ly = cy + labelR * Math.sin(midAngle);
                const sliceLbl = svgEl('text', {
                    x: lx.toFixed(1), y: ly.toFixed(1),
                    'text-anchor': 'middle',
                    'dominant-baseline': 'central',
                    'font-size': Math.max(14, Math.min(22, rPie * 0.22)).toFixed(0),
                    'font-weight': '700',
                    fill: '#fff',
                    stroke: 'rgba(0,0,0,0.35)',
                    'stroke-width': '3',
                    'paint-order': 'stroke',
                    'pointer-events': 'none',
                });
                sliceLbl.textContent = this.#pieValueLabel(row.value, total, display);
                this.#svg.appendChild(sliceLbl);
            }

            startAngle = endAngle;
        });

        // legend
        const legendX = W * 0.76;
        data.forEach((row, i) => {
            const ly = PAD_T + i * 28;
            this.#svg.appendChild(svgEl('rect', { x: legendX, y: ly, width: 18, height: 18, fill: row.color, rx: 3 }));
            const lbl = svgEl('text', { x: legendX + 24, y: ly + 14, 'font-size': '15', 'font-weight': '600', fill: '#111' });
            lbl.textContent = `${row.label} (${this.#pieValueLabel(row.value, total, display)})`;
            this.#svg.appendChild(lbl);
        });
    }

    #pieValueLabel(value, total, display) {
        if (display === 'antal') {
            return parseFloat(value.toFixed(1));
        }
        if (display === 'andel') {
            const iv = Math.round(value);
            const it = Math.round(total);
            const g  = gcd(iv, it);
            return `${iv / g}/${it / g}`;
        }
        // procent
        return `${Math.round((value / total) * 100)}%`;
    }
}
