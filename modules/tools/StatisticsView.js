const NS = 'http://www.w3.org/2000/svg';
const PAD_L = 55, PAD_R = 20, PAD_T = 55, PAD_B = 55;

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

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
            x: W / 2, y: 30,
            'text-anchor': 'middle',
            'font-size': '16',
            'font-weight': 'bold',
            fill: '#333',
        })).textContent = title;

        if (chartType === 'bar')  this.#renderBar(data,  W, H);
        if (chartType === 'line') this.#renderLine(data, W, H);
        if (chartType === 'pie')  this.#renderPie(data,  W, H);
    }

    // ── bar chart ─────────────────────────────────────────────────────────────
    #renderBar(data, W, H) {
        const chartW  = W - PAD_L - PAD_R;
        const chartH  = H - PAD_T - PAD_B;
        const yMax    = Math.max(...data.map(r => r.value), 1);
        const barW    = Math.floor(chartW / data.length * 0.6);
        const gap     = chartW / data.length;

        // axes
        this.#svg.appendChild(svgEl('line', { x1: PAD_L, y1: PAD_T, x2: PAD_L, y2: PAD_T + chartH, stroke:'#555', 'stroke-width':1.5 }));
        this.#svg.appendChild(svgEl('line', { x1: PAD_L, y1: PAD_T + chartH, x2: PAD_L + chartW, y2: PAD_T + chartH, stroke:'#555', 'stroke-width':1.5 }));

        // y-axis ticks
        const ySteps = 5;
        for (let i = 0; i <= ySteps; i++) {
            const val = Math.round((yMax * i) / ySteps);
            const gy  = PAD_T + chartH - (i / ySteps) * chartH;
            this.#svg.appendChild(svgEl('line', { x1: PAD_L - 4, y1: gy, x2: PAD_L + chartW, y2: gy, stroke:'#ddd', 'stroke-width':1 }));
            const tick = svgEl('text', { x: PAD_L - 8, y: gy + 4, 'text-anchor':'end', 'font-size':'10', fill:'#555' });
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
            const vlbl = svgEl('text', { x: bx + barW/2, y: by - 4, 'text-anchor':'middle', 'font-size':'11', fill:'#333' });
            vlbl.textContent = parseFloat(row.value.toFixed(1));
            this.#svg.appendChild(vlbl);

            // x label
            const xlbl = svgEl('text', { x: bx + barW/2, y: PAD_T + chartH + 16, 'text-anchor':'middle', 'font-size':'11', fill:'#333' });
            xlbl.textContent = row.label;
            this.#svg.appendChild(xlbl);

            // drag to change value
            this.#makeDraggableBar(rect, i, bx, by, bh, barW, chartH, yMax);
        });
    }

    #makeDraggableBar(rect, rowIdx, bx, by, bh, barW, chartH, yMax) {
        let startY, startVal;
        rect.addEventListener('pointerdown', e => {
            e.preventDefault();
            rect.setPointerCapture(e.pointerId);
            startY   = e.clientY;
            startVal = this.#engine.getData()[rowIdx].value;
        });
        rect.addEventListener('pointermove', e => {
            if (!rect.hasPointerCapture(e.pointerId)) return;
            const svgRect = this.#svg.getBoundingClientRect();
            const scaleY  = (this.#svg.viewBox.baseVal.height || 350) / svgRect.height;
            const dy      = (e.clientY - startY) * scaleY;
            const newVal  = Math.max(0, parseFloat((startVal - (dy / chartH) * yMax).toFixed(1)));
            this.#engine.setRow(rowIdx, { value: newVal });
        });
        rect.addEventListener('pointerup', e => {
            if (rect.hasPointerCapture(e.pointerId)) rect.releasePointerCapture(e.pointerId);
        });
    }

    // ── line chart ────────────────────────────────────────────────────────────
    #renderLine(data, W, H) {
        const chartW  = W - PAD_L - PAD_R;
        const chartH  = H - PAD_T - PAD_B;
        const yMax    = Math.max(...data.map(r => r.value), 1);
        const step    = chartW / Math.max(data.length - 1, 1);

        // axes
        this.#svg.appendChild(svgEl('line', { x1: PAD_L, y1: PAD_T, x2: PAD_L, y2: PAD_T + chartH, stroke:'#555', 'stroke-width':1.5 }));
        this.#svg.appendChild(svgEl('line', { x1: PAD_L, y1: PAD_T + chartH, x2: PAD_L + chartW, y2: PAD_T + chartH, stroke:'#555', 'stroke-width':1.5 }));

        // y-axis ticks
        for (let i = 0; i <= 5; i++) {
            const val = Math.round((yMax * i) / 5);
            const gy  = PAD_T + chartH - (i / 5) * chartH;
            this.#svg.appendChild(svgEl('line', { x1: PAD_L - 4, y1: gy, x2: PAD_L + chartW, y2: gy, stroke:'#ddd', 'stroke-width':1 }));
            const tick = svgEl('text', { x: PAD_L - 8, y: gy + 4, 'text-anchor':'end', 'font-size':'10', fill:'#555' });
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
            const vlbl = svgEl('text', { x: px, y: py - 12, 'text-anchor':'middle', 'font-size':'11', fill:'#333' });
            vlbl.textContent = parseFloat(row.value.toFixed(1));
            this.#svg.appendChild(vlbl);

            // x label
            const xlbl = svgEl('text', { x: px, y: PAD_T + chartH + 16, 'text-anchor':'middle', 'font-size':'11', fill:'#333' });
            xlbl.textContent = row.label;
            this.#svg.appendChild(xlbl);

            // drag
            this.#makeDraggableDot(dot, i, chartH, yMax);
        });
    }

    #makeDraggableDot(dot, rowIdx, chartH, yMax) {
        let startY, startVal;
        dot.addEventListener('pointerdown', e => {
            e.preventDefault();
            dot.setPointerCapture(e.pointerId);
            startY   = e.clientY;
            startVal = this.#engine.getData()[rowIdx].value;
        });
        dot.addEventListener('pointermove', e => {
            if (!dot.hasPointerCapture(e.pointerId)) return;
            const svgRect = this.#svg.getBoundingClientRect();
            const scaleY  = (this.#svg.viewBox.baseVal.height || 350) / svgRect.height;
            const dy      = (e.clientY - startY) * scaleY;
            const newVal  = Math.max(0, parseFloat((startVal - (dy / chartH) * yMax).toFixed(1)));
            this.#engine.setRow(rowIdx, { value: newVal });
        });
        dot.addEventListener('pointerup', e => {
            if (dot.hasPointerCapture(e.pointerId)) dot.releasePointerCapture(e.pointerId);
        });
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
            const slice = (row.value / total) * 2 * Math.PI;
            const endAngle = startAngle + slice;
            const large = slice > Math.PI ? 1 : 0;

            const x1 = cx + rPie * Math.cos(startAngle);
            const y1 = cy + rPie * Math.sin(startAngle);
            const x2 = cx + rPie * Math.cos(endAngle);
            const y2 = cy + rPie * Math.sin(endAngle);

            const d = `M ${cx} ${cy} L ${x1} ${y1} A ${rPie} ${rPie} 0 ${large} 1 ${x2} ${y2} Z`;
            const path = svgEl('path', { d, fill: row.color, stroke: '#fff', 'stroke-width': 2, class: 'pie-slice' });
            this.#svg.appendChild(path);

            startAngle = endAngle;
        });

        // legend
        const legendX = W * 0.76;
        data.forEach((row, i) => {
            const ly = PAD_T + i * 22;
            this.#svg.appendChild(svgEl('rect', { x: legendX, y: ly, width: 14, height: 14, fill: row.color, rx: 2 }));
            const lbl = svgEl('text', { x: legendX + 18, y: ly + 11, 'font-size': '12', fill: '#333' });
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
