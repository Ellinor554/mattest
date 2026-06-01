// SVG viewBox dimensions for the number line
const W          = 960;
const H          = 130;
const LINE_Y     = 65;
const PAD        = 55;
const MARKER_SIZE = 44;
const ARROW_H    = 38; // height of marker label + tip above the line
/** Wait for browser layout to stabilise before calling getBoundingClientRect(). */
const LAYOUT_STABILIZATION_DELAY = 80;

/** Unique counter for radio-button group names per NumberLinesView instance. */
let _instanceCount = 0;

export class NumberLinesView {
    #engine;
    #root        = null;
    #container   = null;
    #customPanel = null;
    #unsubscribe = null;

    // Custom-panel input refs
    #fromInput  = null;
    #toInput    = null;
    #stepRadios = {}; // { '10': radioEl, '1': radioEl, … }
    #radioGroup = '';  // unique name attr for radio group

    // Current number line DOM refs
    #svgEl       = null;
    #markerEl    = null;
    #displayEl   = null;
    #deltaEl     = null;
    #arrowLblEl  = null;

    // Drag state
    #dragging       = false;
    #dragStartX     = 0;
    #markerStartLeft = 0;
    #currentVal     = 0;
    #prevVal        = null;

    // Cached range params (set when building the number line)
    #nlMin      = 0;
    #nlMax      = 10;
    #nlStep     = 1;
    #nlDp       = 0;
    #nlNumTicks = 10;
    #nlPxPerTick = 0;

    // Used to detect whether a range change requires a full rebuild
    #prevRangeKey = null;

    constructor(engine) {
        this.#engine = engine;
        this.#radioGroup = `nl-step-${_instanceCount++}`;
    }

    mount(parentEl) {
        this.#root = this.#buildDOM();
        parentEl.appendChild(this.#root);
        this.#unsubscribe = this.#engine.subscribe(state => this.#onEngineChange(state));
        return this.#root;
    }

    unmount() {
        this.#unsubscribe?.();
        this.#root?.remove();
        this.#root        = null;
        this.#prevRangeKey = null;
    }

    // ─── Engine subscription ─────────────────────────────────────────────────

    #onEngineChange(state) {
        const key = `${state.min}_${state.max}_${state.step}_${state.decimalPlaces}`;
        if (key !== this.#prevRangeKey) {
            this.#prevRangeKey = key;
            this.#buildNumberLine(state);
        }
        // Value-only changes (from setValue after drag) are already reflected
        // in the view via the live drag update; no rebuild needed.
    }

    // ─── DOM construction ────────────────────────────────────────────────────

    #buildDOM() {
        const section = document.createElement('section');
        section.className = 'view-section flex-col h-full bg-soft-surface';

        section.appendChild(this.#buildTopBar());
        section.appendChild(this.#buildCustomPanel());

        const mainArea = document.createElement('div');
        mainArea.className = 'flex-1 relative flex items-center justify-center px-4 py-4 overflow-x-auto';

        const container = document.createElement('div');
        container.className = 'relative w-full flex flex-col items-center';
        container.style.minHeight = '220px';
        this.#container = container;
        mainArea.appendChild(container);

        section.appendChild(mainArea);
        return section;
    }

    #buildTopBar() {
        const bar = document.createElement('div');
        bar.className = 'flex justify-center gap-4 p-4 bg-soft-bg border-b border-soft-border shrink-0 flex-wrap';

        const presets = [
            { label: '0 till 10',            fn: () => this.#engine.setRange(0, 10,  1)        },
            { label: '0 till 100',           fn: () => this.#engine.setRange(0, 100, 1)        },
            { label: '0 till 3 (Decimaler)', fn: () => this.#engine.setRange(0, 3,   0.1, 1)   },
        ];
        presets.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'px-4 py-2 bg-soft-blueLight/30 text-soft-blue font-bold rounded-full hover:bg-soft-blueLight/50 whitespace-nowrap';
            btn.textContent = p.label;
            btn.addEventListener('click', p.fn);
            bar.appendChild(btn);
        });

        const customBtn = document.createElement('button');
        customBtn.className = 'px-4 py-2 bg-soft-greenLight/30 text-soft-green font-bold rounded-full hover:bg-soft-greenLight/50 whitespace-nowrap flex items-center gap-2';
        customBtn.innerHTML = '<i class="fas fa-sliders-h text-sm"></i>Valbar';
        customBtn.addEventListener('click', () => this.#toggleCustomPanel());
        bar.appendChild(customBtn);

        return bar;
    }

    #buildCustomPanel() {
        const panel = document.createElement('div');
        panel.className = 'hidden flex-wrap justify-center items-center gap-3 px-4 py-3 bg-white border-b border-soft-border shrink-0';
        this.#customPanel = panel;

        // From input
        const fromLbl = document.createElement('label');
        fromLbl.className = 'flex items-center gap-1 font-semibold text-soft-text text-sm';
        fromLbl.textContent = 'Från:';
        const fromInput = document.createElement('input');
        fromInput.type      = 'number';
        fromInput.value     = '0';
        fromInput.step      = 'any';
        fromInput.className = 'ml-1 w-20 border border-soft-border rounded-lg px-2 py-1 text-center font-bold text-soft-text focus:outline-none focus:ring-2 focus:ring-soft-blue/40';
        fromLbl.appendChild(fromInput);
        this.#fromInput = fromInput;
        panel.appendChild(fromLbl);

        // To input
        const toLbl = document.createElement('label');
        toLbl.className = 'flex items-center gap-1 font-semibold text-soft-text text-sm';
        toLbl.textContent = 'Till:';
        const toInput = document.createElement('input');
        toInput.type      = 'number';
        toInput.value     = '10';
        toInput.step      = 'any';
        toInput.className = 'ml-1 w-20 border border-soft-border rounded-lg px-2 py-1 text-center font-bold text-soft-text focus:outline-none focus:ring-2 focus:ring-soft-blue/40';
        toLbl.appendChild(toInput);
        this.#toInput = toInput;
        panel.appendChild(toLbl);

        // Step radios
        const stepDefs = [
            { value: '10',   label: 'Tiotal (10)',        checked: false },
            { value: '1',    label: 'Ental (1)',           checked: true  },
            { value: '0.1',  label: 'Tiondelar (0,1)',     checked: false },
            { value: '0.01', label: 'Hundradelar (0,01)',  checked: false },
        ];
        stepDefs.forEach(def => {
            const lbl   = document.createElement('label');
            lbl.className = 'flex items-center gap-2 font-semibold text-soft-text text-sm cursor-pointer select-none';
            const radio = document.createElement('input');
            radio.type      = 'radio';
            radio.name      = this.#radioGroup;
            radio.value     = def.value;
            radio.checked   = def.checked;
            radio.className = 'w-4 h-4 accent-soft-blue';
            lbl.appendChild(radio);
            lbl.appendChild(document.createTextNode(def.label));
            this.#stepRadios[def.value] = radio;
            panel.appendChild(lbl);
        });

        // Apply button
        const applyBtn = document.createElement('button');
        applyBtn.className = 'px-5 py-1.5 bg-soft-blue text-white font-bold rounded-full hover:bg-soft-blue/80 transition-colors text-sm';
        applyBtn.textContent = 'Skapa';
        applyBtn.addEventListener('click', () => this.#applyCustom());
        panel.appendChild(applyBtn);

        return panel;
    }

    // ─── Number line builder ─────────────────────────────────────────────────

    #buildNumberLine(state) {
        const { min, max, step, decimalPlaces } = state;

        // Cache range params for position helpers
        this.#nlMin      = min;
        this.#nlMax      = max;
        this.#nlStep     = step;
        this.#nlDp       = decimalPlaces;
        this.#nlNumTicks = Math.round((max - min) / step);
        this.#nlPxPerTick = (W - 2 * PAD) / this.#nlNumTicks;

        // Reset drag state
        this.#currentVal = min;
        this.#prevVal    = null;
        this.#dragging   = false;

        // Clear container
        const container = this.#container;
        container.innerHTML = '';
        this.#svgEl = null; this.#markerEl = null;
        this.#displayEl = null; this.#deltaEl = null; this.#arrowLblEl = null;

        // ── SVG ──
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.setAttribute('class', 'w-full drop-shadow-sm');
        svg.style.cssText = 'overflow:visible;display:block;flex-shrink:0;';
        this.#svgEl = svg;

        // Arrow-head marker def
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `<marker id="nl-arrow-${this.#radioGroup}" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L0,8 L10,4 Z" fill="#4a4b50"/></marker>`;
        svg.appendChild(defs);

        // Axis line with arrowhead
        const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        axisLine.setAttribute('x1', PAD - 10);
        axisLine.setAttribute('y1', LINE_Y);
        axisLine.setAttribute('x2', W - PAD + 28);
        axisLine.setAttribute('y2', LINE_Y);
        axisLine.setAttribute('stroke', '#4a4b50');
        axisLine.setAttribute('stroke-width', '4');
        axisLine.setAttribute('marker-end', `url(#nl-arrow-${this.#radioGroup})`);
        svg.appendChild(axisLine);

        // Ticks and labels
        for (let i = 0; i <= this.#nlNumTicks; i++) {
            const val   = parseFloat((min + i * step).toFixed(10));
            const x     = PAD + i * this.#nlPxPerTick;
            const major = this.#isMajorTick(val, i);
            const tickH = major ? 16 : 8;

            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tick.setAttribute('x1', x); tick.setAttribute('y1', LINE_Y - tickH);
            tick.setAttribute('x2', x); tick.setAttribute('y2', LINE_Y + tickH);
            tick.setAttribute('stroke', '#4a4b50');
            tick.setAttribute('stroke-width', major ? '2.5' : '1.2');
            svg.appendChild(tick);

            if (major) {
                const fontSize = decimalPlaces === 2 ? 11 : decimalPlaces === 1 ? 13 : 15;
                const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                txt.setAttribute('x', x);
                txt.setAttribute('y', LINE_Y + 36);
                txt.setAttribute('text-anchor',  'middle');
                txt.setAttribute('font-family',  'Nunito,sans-serif');
                txt.setAttribute('font-weight',  'bold');
                txt.setAttribute('font-size',    fontSize);
                txt.setAttribute('fill',         '#4a4b50');
                txt.textContent = decimalPlaces > 0
                    ? val.toFixed(decimalPlaces).replace('.', ',')
                    : String(val);
                svg.appendChild(txt);
            }
        }
        container.appendChild(svg);

        // ── Value display box ──
        const displayBox = document.createElement('div');
        displayBox.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:12px;';

        const displayInner = document.createElement('div');
        displayInner.style.cssText = 'display:flex;align-items:center;gap:12px;';

        const displayEl = document.createElement('div');
        displayEl.style.cssText = 'font-family:Nunito,sans-serif;font-size:2rem;font-weight:900;color:#1a2e5a;background:#f0f3f8;border:2px solid #8db1d1;border-radius:14px;padding:6px 22px;min-width:90px;text-align:center;';
        displayEl.textContent = this.#fmtVal(min);
        this.#displayEl = displayEl;
        displayInner.appendChild(displayEl);
        displayBox.appendChild(displayInner);

        const deltaEl = document.createElement('div');
        deltaEl.style.cssText = 'font-family:Nunito,sans-serif;font-size:1rem;font-weight:700;color:#4f7c75;min-height:1.4rem;';
        this.#deltaEl = deltaEl;
        displayBox.appendChild(deltaEl);
        container.appendChild(displayBox);

        // ── Draggable arrow marker ──
        const marker = document.createElement('div');
        marker.style.cssText = `position:absolute;width:${MARKER_SIZE}px;top:0;left:0;cursor:grab;user-select:none;touch-action:none;display:flex;flex-direction:column;align-items:center;`;

        const arrowLbl = document.createElement('div');
        arrowLbl.style.cssText = 'background:#1a2e5a;color:white;font-family:Nunito,sans-serif;font-size:13px;font-weight:900;padding:3px 8px;border-radius:8px;box-shadow:0 3px 10px rgba(26,46,90,0.35);white-space:nowrap;';
        arrowLbl.textContent = this.#fmtVal(min);
        this.#arrowLblEl = arrowLbl;

        const arrowTip = document.createElement('div');
        arrowTip.style.cssText = 'width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:12px solid #1a2e5a;margin-top:-1px;filter:drop-shadow(0 2px 3px rgba(26,46,90,0.2));';

        marker.appendChild(arrowLbl);
        marker.appendChild(arrowTip);
        this.#markerEl = marker;
        container.appendChild(marker);

        this.#setupMarkerDrag(marker);

        // Position after layout so getBoundingClientRect() works
        setTimeout(() => {
            this.#updateMarkerPosition(min);
            this.#prevVal = null;
            if (this.#deltaEl) this.#deltaEl.textContent = '';
        }, LAYOUT_STABILIZATION_DELAY);
    }

    // ─── Position helpers ────────────────────────────────────────────────────

    /** Convert a value to the marker left-edge pixel (container-relative). */
    #valToContainerX(v) {
        if (!this.#svgEl || !this.#container) return 0;
        const svgRect = this.#svgEl.getBoundingClientRect();
        const conRect = this.#container.getBoundingClientRect();
        const offsetX = svgRect.left - conRect.left;
        const ratio   = svgRect.width / W;
        return offsetX + (PAD + ((v - this.#nlMin) / this.#nlStep) * this.#nlPxPerTick) * ratio - MARKER_SIZE / 2;
    }

    /** Convert a marker left-edge pixel (container-relative) to a snapped value. */
    #containerXToVal(px) {
        if (!this.#svgEl || !this.#container) return this.#nlMin;
        const svgRect  = this.#svgEl.getBoundingClientRect();
        const conRect  = this.#container.getBoundingClientRect();
        const offsetX  = svgRect.left - conRect.left;
        const ratio    = svgRect.width / W;
        const raw      = (px + MARKER_SIZE / 2 - offsetX) / ratio;
        const idx      = Math.round((raw - PAD) / this.#nlPxPerTick);
        const clamped  = Math.max(0, Math.min(this.#nlNumTicks, idx));
        return parseFloat((this.#nlMin + clamped * this.#nlStep).toFixed(10));
    }

    /** Position the marker vertically above the line and horizontally at the value. */
    #updateMarkerPosition(val) {
        if (!this.#markerEl || !this.#svgEl || !this.#container) return;
        const snapped = this.#containerXToVal(this.#valToContainerX(val));
        const svgRect = this.#svgEl.getBoundingClientRect();
        const conRect = this.#container.getBoundingClientRect();
        const topOffset = svgRect.top - conRect.top;

        this.#markerEl.style.left = this.#valToContainerX(snapped) + 'px';
        this.#markerEl.style.top  = (topOffset + (LINE_Y / H) * svgRect.height - ARROW_H) + 'px';

        const str = this.#fmtVal(snapped);
        if (this.#displayEl)  this.#displayEl.textContent  = str;
        if (this.#arrowLblEl) this.#arrowLblEl.textContent = str;

        this.#currentVal = snapped;
    }

    #isMajorTick(val, _i) {
        const dp       = this.#nlDp;
        const numTicks = this.#nlNumTicks;
        if (dp === 2) {
            return Math.abs(val * 10 - Math.round(val * 10)) < 0.001;
        }
        if (dp === 1) {
            if (numTicks <= 30)  return true;
            if (numTicks <= 100) return Math.abs((val * 10) - Math.round(val * 10 / 5) * 5) < 0.001;
            return Math.abs(val - Math.round(val)) < this.#nlStep / 2;
        }
        // integers
        if (numTicks > 20) return val % 10 === 0;
        if (numTicks > 10) return val % 5 === 0;
        return true;
    }

    #fmtVal(v) {
        return this.#nlDp > 0
            ? v.toFixed(this.#nlDp).replace('.', ',')
            : String(v);
    }

    // ─── Marker drag ─────────────────────────────────────────────────────────

    #setupMarkerDrag(marker) {
        marker.addEventListener('pointerdown', (e) => {
            this.#dragging        = true;
            this.#dragStartX      = e.clientX;
            this.#markerStartLeft = parseFloat(marker.style.left) || 0;
            this.#prevVal         = this.#currentVal;
            marker.setPointerCapture(e.pointerId);
            marker.style.cursor = 'grabbing';
            e.preventDefault();
        });

        marker.addEventListener('pointermove', (e) => {
            if (!this.#dragging) return;
            const newLeft = this.#markerStartLeft + (e.clientX - this.#dragStartX);
            const rawVal  = this.#containerXToVal(newLeft);
            marker.style.left = this.#valToContainerX(rawVal) + 'px';
            const str = this.#fmtVal(rawVal);
            if (this.#displayEl)  this.#displayEl.textContent  = str;
            if (this.#arrowLblEl) this.#arrowLblEl.textContent = str;
            this.#currentVal = rawVal;
        });

        marker.addEventListener('pointerup', (e) => {
            this.#dragging = false;
            marker.style.cursor = 'grab';
            marker.releasePointerCapture(e.pointerId);
            this.#finaliseDrag();
        });
    }

    #finaliseDrag() {
        const snapped = this.#containerXToVal(this.#valToContainerX(this.#currentVal));

        if (this.#markerEl) {
            const svgRect   = this.#svgEl.getBoundingClientRect();
            const conRect   = this.#container.getBoundingClientRect();
            const topOffset = svgRect.top - conRect.top;
            this.#markerEl.style.left = this.#valToContainerX(snapped) + 'px';
            this.#markerEl.style.top  = (topOffset + (LINE_Y / H) * svgRect.height - ARROW_H) + 'px';
        }

        const str = this.#fmtVal(snapped);
        if (this.#displayEl)  this.#displayEl.textContent  = str;
        if (this.#arrowLblEl) this.#arrowLblEl.textContent = str;

        if (this.#deltaEl && this.#prevVal !== null && snapped !== this.#prevVal) {
            const diff = parseFloat((snapped - this.#prevVal).toFixed(10));
            const sign  = diff > 0 ? '+' : '';
            const arrow = diff > 0 ? '→' : '←';
            this.#deltaEl.textContent = `${this.#fmtVal(this.#prevVal)} ${arrow} ${this.#fmtVal(snapped)}  (${sign}${this.#fmtVal(diff)})`;
            this.#deltaEl.style.color = diff > 0 ? '#4f7c75' : '#a85c72';
        } else if (this.#deltaEl && this.#prevVal === null) {
            this.#deltaEl.textContent = '';
        }

        this.#currentVal = snapped;
        // Persist to engine (won't trigger a rebuild because range is unchanged)
        this.#engine.setValue(snapped);
    }

    // ─── Custom panel ────────────────────────────────────────────────────────

    #toggleCustomPanel() {
        const panel = this.#customPanel;
        panel.classList.toggle('hidden');
        panel.classList.toggle('flex');
    }

    #applyCustom() {
        const from = parseFloat(this.#fromInput.value);
        const to   = parseFloat(this.#toInput.value);
        if (isNaN(from) || isNaN(to) || to <= from) {
            alert('Ange giltiga värden: "Från" måste vara mindre än "Till".');
            return;
        }
        let stepVal = 1;
        for (const [val, radio] of Object.entries(this.#stepRadios)) {
            if (radio.checked) { stepVal = parseFloat(val); break; }
        }
        let step, decimalPlaces;
        if (stepVal === 0.01) {
            step = 0.01; decimalPlaces = 2;
        } else if (stepVal === 0.1) {
            step = 0.1;  decimalPlaces = 1;
        } else {
            step = stepVal; decimalPlaces = 0;
        }
        this.#engine.setRange(from, to, step, decimalPlaces);
    }
}
