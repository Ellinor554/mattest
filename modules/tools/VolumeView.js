// Beaker geometry constants (mirror index-old.html)
const BEAKER_H      = 500; // px – total beaker body height
const BEAKER_W      = 200; // px – beaker body width
const SCALE_W       = 68;  // px – scale column width
const BEAKER_BORDER_B = 3; // px – bottom border thickness (border-box)
const BEAKER_INNER_H  = BEAKER_H - BEAKER_BORDER_B; // usable liquid height
const MAX_ML_PER_BEAKER = 1000; // 1 litre per beaker

/** Format ml as a Swedish decimal string in litres, e.g. 1200 → "1,2 L". */
function formatLiters(ml) {
    const liters = ml / 1000;
    return liters.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 3 }) + ' L';
}

/** Build the SVG-less scale column DOM element for one beaker. */
function buildScaleEl() {
    const wrap = document.createElement('div');
    wrap.className = 'relative shrink-0';
    wrap.style.cssText = `width:${SCALE_W}px; height:${BEAKER_H}px;`;

    const inner = document.createElement('div');
    inner.className = 'absolute inset-0';

    for (let i = 0; i <= 10; i++) {
        const liters = (10 - i) / 10; // 1.0 at top, 0.0 at bottom
        const topPx  = Math.round((i / 10) * BEAKER_INNER_H);
        const lineW  = liters % 0.5 === 0 ? 14 : 8;

        const mark = document.createElement('div');
        mark.className = 'vol-scale-mark';
        mark.style.cssText = `top:${topPx}px; right:0; left:0; justify-content:flex-end;`;

        const labelSpan = document.createElement('span');
        labelSpan.className = 'vol-scale-label';
        labelSpan.style.cssText = 'min-width:36px; text-align:right;';
        labelSpan.textContent = liters.toFixed(1);

        const lineSpan = document.createElement('span');
        lineSpan.className = 'vol-scale-line';
        lineSpan.style.width = lineW + 'px';

        mark.appendChild(labelSpan);
        mark.appendChild(lineSpan);
        inner.appendChild(mark);
    }

    wrap.appendChild(inner);
    return wrap;
}

/** Build a single beaker assembly (scale + rim + body). Returns { outer, liquid, label }. */
function buildBeakerAssembly(fillPct, labelText, showLabel) {
    const fillPx      = (fillPct / 100) * BEAKER_INNER_H;
    const labelBottom = Math.max(fillPx + 4, 4);

    const wrapper = document.createElement('div');
    wrapper.className = 'relative flex items-end gap-0';

    wrapper.appendChild(buildScaleEl());

    const bodyWrap = document.createElement('div');
    bodyWrap.className = 'relative';
    bodyWrap.style.flexShrink = '0';

    // Rim (top opening)
    const rim = document.createElement('div');
    rim.style.cssText = `width:${BEAKER_W}px; height:6px; border-left:3px solid rgba(91,128,165,0.55); border-right:3px solid rgba(91,128,165,0.55); border-top:3px solid rgba(91,128,165,0.55); border-radius:4px 4px 0 0; background:transparent;`;

    // Beaker outer (body)
    const outer = document.createElement('div');
    outer.className = 'vol-beaker-outer';

    const liquid = document.createElement('div');
    liquid.className = 'vol-liquid';
    liquid.style.height = fillPct + '%';

    const surfaceLabel = document.createElement('div');
    surfaceLabel.className = 'vol-surface-label';
    surfaceLabel.style.bottom  = labelBottom + 'px';
    surfaceLabel.style.display = showLabel ? 'block' : 'none';
    surfaceLabel.textContent   = labelText;

    outer.appendChild(liquid);
    outer.appendChild(surfaceLabel);

    bodyWrap.appendChild(rim);
    bodyWrap.appendChild(outer);
    wrapper.appendChild(bodyWrap);

    return { wrapper, outer, liquid, surfaceLabel };
}

export class VolumeView {
    #engine;
    #root = null;

    // DOM refs updated during #render
    #beakersRow    = null;
    #reprL         = null;
    #reprDl        = null;
    #reprCl        = null;
    #reprMl        = null;
    #totalDisplay  = null;
    #infoExtra     = null;
    #enhetsBody    = null;
    #enhetsIcon    = null;
    #enhetsToggle  = null;

    // Beaker refs for in-place updates
    #beakerNodes   = []; // [{ outer, liquid, surfaceLabel }]

    #unsubscribe   = null;

    constructor(engine) {
        this.#engine = engine;
    }

    mount(parentEl) {
        this.#root = this.#buildDOM();
        parentEl.appendChild(this.#root);
        this.#unsubscribe = this.#engine.subscribe(r => this.#render(r));
        return this.#root;
    }

    unmount() {
        this.#unsubscribe?.();
        this.#root?.remove();
        this.#root = null;
    }

    // ─── DOM construction ────────────────────────────────────────────────────

    #buildDOM() {
        const section = document.createElement('section');
        section.className = 'view-section flex-row h-full';

        section.appendChild(this.#buildSidebar());
        section.appendChild(this.#buildMainArea());

        return section;
    }

    #buildSidebar() {
        const sidebar = document.createElement('div');
        sidebar.className = 'w-64 bg-soft-surface shadow-md z-10 p-5 flex flex-col gap-3 overflow-y-auto border-r border-soft-border shrink-0';

        // Heading
        const heading = document.createElement('h3');
        heading.className = 'font-bold text-soft-text text-sm uppercase tracking-wider text-soft-muted';
        heading.textContent = 'Lägg till mängd';
        sidebar.appendChild(heading);

        // Add-volume buttons
        const addButtons = [
            { ml: 1000, badge: 'L',  badgeCls: 'bg-soft-blue text-white',       label: '+ 1 Liter (L)' },
            { ml: 100,  badge: 'dl', badgeCls: 'bg-soft-blueLight text-white',  label: '+ 1 Deciliter (dl)' },
            { ml: 10,   badge: 'cl', badgeCls: 'bg-soft-greenLight text-white', label: '+ 1 Centiliter (cl)' },
            { ml: 1,    badge: 'ml', badgeCls: 'bg-soft-green text-white',      label: '+ 1 Milliliter (ml)' },
        ];

        for (const def of addButtons) {
            const btn = document.createElement('button');
            btn.className = 'vol-add-btn';

            const badge = document.createElement('span');
            badge.className = `w-8 h-8 rounded-lg ${def.badgeCls} flex items-center justify-center font-bold text-sm shrink-0`;
            badge.textContent = def.badge;

            const lbl = document.createElement('span');
            lbl.textContent = def.label;

            btn.appendChild(badge);
            btn.appendChild(lbl);
            btn.addEventListener('click', () => this.#engine.addLiquid(def.ml));
            sidebar.appendChild(btn);
        }

        // Divider
        sidebar.appendChild(this.#hr());

        // Representation section
        const reprSection = document.createElement('div');

        const reprHeading = document.createElement('h4');
        reprHeading.className = 'font-bold text-xs uppercase tracking-wider text-soft-muted mb-3';
        reprHeading.textContent = 'Representation';
        reprSection.appendChild(reprHeading);

        const reprRow = document.createElement('div');
        reprRow.className = 'flex justify-between gap-2';

        const units = [
            { key: 'L',  ref: '_reprL'  },
            { key: 'dl', ref: '_reprDl' },
            { key: 'cl', ref: '_reprCl' },
            { key: 'ml', ref: '_reprMl' },
        ];

        for (const u of units) {
            const box = document.createElement('div');
            box.className = 'vol-repr-box';

            const digit = document.createElement('div');
            digit.className = 'vol-repr-digit';
            digit.textContent = '0';

            const unit = document.createElement('div');
            unit.className = 'vol-repr-unit';
            unit.textContent = u.key;

            box.appendChild(digit);
            box.appendChild(unit);
            reprRow.appendChild(box);

            // Store refs
            if (u.key === 'L')  this.#reprL  = digit;
            if (u.key === 'dl') this.#reprDl = digit;
            if (u.key === 'cl') this.#reprCl = digit;
            if (u.key === 'ml') this.#reprMl = digit;
        }

        reprSection.appendChild(reprRow);

        // Total display
        const totalPanel = document.createElement('div');
        totalPanel.className = 'mt-3 p-3 bg-soft-blueLight/10 border border-soft-blueLight/25 rounded-xl text-xs text-soft-blue leading-relaxed';

        const totalLabel = document.createTextNode('Totalt: ');
        const totalSpan = document.createElement('span');
        totalSpan.className = 'font-bold';
        totalSpan.textContent = '0,000 L';
        this.#totalDisplay = totalSpan;

        totalPanel.appendChild(totalLabel);
        totalPanel.appendChild(totalSpan);
        reprSection.appendChild(totalPanel);
        sidebar.appendChild(reprSection);

        // Divider
        sidebar.appendChild(this.#hr());

        // Empty button
        const emptyBtn = document.createElement('button');
        emptyBtn.className = 'bg-soft-text hover:bg-soft-muted text-white p-2 rounded-lg text-sm font-semibold mt-auto';
        const trashIcon = document.createElement('i');
        trashIcon.className = 'fas fa-trash mr-1';
        emptyBtn.appendChild(trashIcon);
        emptyBtn.appendChild(document.createTextNode(' Töm behållaren'));
        emptyBtn.addEventListener('click', () => this.#engine.empty());
        sidebar.appendChild(emptyBtn);

        return sidebar;
    }

    #buildMainArea() {
        const main = document.createElement('div');
        main.className = 'flex-1 flex items-center justify-center bg-soft-bg overflow-auto p-8';

        const flexWrap = document.createElement('div');
        flexWrap.className = 'flex items-end gap-8 flex-wrap justify-center';

        // Beakers row
        const beakersRow = document.createElement('div');
        beakersRow.className = 'flex items-end gap-6 flex-wrap justify-center';
        this.#beakersRow = beakersRow;
        flexWrap.appendChild(beakersRow);

        // Info panel
        flexWrap.appendChild(this.#buildInfoPanel());

        main.appendChild(flexWrap);
        return main;
    }

    #buildInfoPanel() {
        const panel = document.createElement('div');
        panel.className = 'bg-soft-surface rounded-2xl shadow-sm border border-soft-border p-6 max-w-xs';

        const titleRow = document.createElement('h4');
        titleRow.className = 'font-bold text-soft-text mb-3 flex items-center gap-2';

        const icon = document.createElement('i');
        icon.className = 'fas fa-info-circle text-soft-blue';
        titleRow.appendChild(icon);
        titleRow.appendChild(document.createTextNode(' Enhetsrelationer'));

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'ml-auto text-soft-muted hover:text-soft-blue transition-colors';
        toggleBtn.title = 'Visa/dölj enhetsrelationer';
        toggleBtn.setAttribute('aria-expanded', 'true');
        this.#enhetsToggle = toggleBtn;

        const chevron = document.createElement('i');
        chevron.className = 'fas fa-chevron-up text-xs';
        this.#enhetsIcon = chevron;
        toggleBtn.appendChild(chevron);
        toggleBtn.addEventListener('click', () => this.#toggleEnhetsrelationer());
        titleRow.appendChild(toggleBtn);

        panel.appendChild(titleRow);

        const body = document.createElement('div');
        body.className = 'text-sm text-soft-muted space-y-1 leading-relaxed';

        const unitRows = [
            ['L',  '= 10 dl = 100 cl = 1\u00a0000 ml'],
            ['dl', '= 10 cl = 100 ml'],
            ['cl', '= 10 ml'],
        ];
        for (const [unit, rest] of unitRows) {
            const p = document.createElement('p');
            p.appendChild(document.createTextNode('1 '));
            const strong = document.createElement('strong');
            strong.className = 'text-soft-text';
            strong.textContent = unit;
            p.appendChild(strong);
            p.appendChild(document.createTextNode(' ' + rest));
            body.appendChild(p);
        }

        this.#enhetsBody = body;
        panel.appendChild(body);

        const infoExtra = document.createElement('div');
        infoExtra.className = 'mt-4 pt-3 border-t border-soft-border text-xs text-soft-blue font-semibold hidden';
        this.#infoExtra = infoExtra;
        panel.appendChild(infoExtra);

        return panel;
    }

    #hr() {
        const hr = document.createElement('hr');
        hr.className = 'border-soft-border mt-1';
        return hr;
    }

    // ─── Rendering ───────────────────────────────────────────────────────────

    #render(reading) {
        this.#renderBeakers(reading.totalMl);
        this.#setReprDigit(this.#reprL,  reading.liters);
        this.#setReprDigit(this.#reprDl, reading.deciliters);
        this.#setReprDigit(this.#reprCl, reading.centiliters);
        this.#setReprDigit(this.#reprMl, reading.milliliters);

        if (this.#totalDisplay) {
            this.#totalDisplay.textContent = formatLiters(reading.totalMl);
        }

        if (this.#infoExtra) {
            if (!reading.isEmpty) {
                const totalDl = (reading.totalMl / 100).toLocaleString('sv-SE', { maximumFractionDigits: 3 });
                const totalCl = (reading.totalMl / 10).toLocaleString('sv-SE', { maximumFractionDigits: 3 });
                this.#infoExtra.innerHTML =
                    `${formatLiters(reading.totalMl)} =` +
                    ` <strong>${totalDl} dl</strong> =` +
                    ` <strong>${totalCl} cl</strong> =` +
                    ` <strong>${reading.totalMl.toLocaleString('sv-SE')} ml</strong>`;
                this.#infoExtra.classList.remove('hidden');
            } else {
                this.#infoExtra.classList.add('hidden');
            }
        }
    }

    #renderBeakers(totalMl) {
        const row = this.#beakersRow;
        if (!row) return;

        const fullBeakers  = Math.floor(totalMl / MAX_ML_PER_BEAKER);
        const remainder    = totalMl % MAX_ML_PER_BEAKER;
        const totalBeakers = Math.max(1, fullBeakers + (remainder > 0 ? 1 : 0));

        if (this.#beakerNodes.length !== totalBeakers) {
            // Rebuild all beakers
            row.innerHTML = '';
            this.#beakerNodes = [];

            for (let i = 0; i < totalBeakers; i++) {
                const ml  = this.#beakerMl(totalMl, i);
                const pct = (ml / MAX_ML_PER_BEAKER) * 100;
                const { wrapper, liquid, surfaceLabel } = buildBeakerAssembly(pct, formatLiters(ml), ml > 0);
                row.appendChild(wrapper);
                this.#beakerNodes.push({ liquid, surfaceLabel });
            }
        } else {
            // Update only the last beaker in-place (keeps CSS transition)
            const last  = this.#beakerNodes[totalBeakers - 1];
            const ml    = this.#beakerMl(totalMl, totalBeakers - 1);
            const pct   = (ml / MAX_ML_PER_BEAKER) * 100;
            const fillPx = (pct / 100) * BEAKER_INNER_H;

            if (last.liquid)       last.liquid.style.height   = pct + '%';
            if (last.surfaceLabel) {
                last.surfaceLabel.textContent  = formatLiters(ml);
                last.surfaceLabel.style.bottom = Math.max(fillPx + 4, 4) + 'px';
                last.surfaceLabel.style.display = ml > 0 ? 'block' : 'none';
            }
        }
    }

    /** ml contained in beaker at index i. */
    #beakerMl(totalMl, i) {
        return Math.min(MAX_ML_PER_BEAKER, Math.max(0, totalMl - i * MAX_ML_PER_BEAKER));
    }

    #setReprDigit(el, value) {
        if (!el) return;
        el.textContent = value;
        el.classList.toggle('active', value > 0);
    }

    #toggleEnhetsrelationer() {
        if (!this.#enhetsBody) return;
        const isHidden = this.#enhetsBody.classList.toggle('hidden');
        if (this.#enhetsIcon) {
            this.#enhetsIcon.classList.toggle('fa-chevron-up',   !isHidden);
            this.#enhetsIcon.classList.toggle('fa-chevron-down', isHidden);
        }
        if (this.#enhetsToggle) {
            this.#enhetsToggle.setAttribute('aria-expanded', String(!isHidden));
        }
    }
}
