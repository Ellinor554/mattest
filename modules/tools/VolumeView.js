// Beaker geometry constants (mirror index-old.html)
const BEAKER_H      = 500; // px – total beaker body height
const BEAKER_W      = 200; // px – beaker body width
const SCALE_W       = 68;  // px – scale column width
const BEAKER_BORDER_B = 3; // px – bottom border thickness (border-box)
const BEAKER_INNER_H  = BEAKER_H - BEAKER_BORDER_B; // usable liquid height
const MAX_ML_PER_BEAKER = 1000; // 1 litre per beaker
const DL_BEAKER_W       = 240;  // px – dl beaker body width (wider than L)
const DL_BEAKER_H       = 200;  // px – dl beaker body height (shorter than L)
const DL_BEAKER_INNER_H = DL_BEAKER_H - BEAKER_BORDER_B;
const MAX_ML_PER_DL     = 100;  // 1 dl = 100 ml per dl beaker

// Place-value chart – mini container configs (L → ml)
const PV_CONFIGS = [
    { unit: 'L',  get: t => Math.floor(t / 1000),             w: 44, h: 50, bodyBot: '#4a6e8f', bodyTop: '#7ba0c4', rim: '#3a5f82' },
    { unit: 'dl', get: t => Math.floor((t % 1000) / 100),     w: 56, h: 33, bodyBot: '#6f9ab8', bodyTop: '#a8c8e0', rim: '#5b80a5' },
    { unit: 'cl', get: t => Math.floor((t % 100) / 10),       w: 44, h: 20, bodyBot: '#6a9a80', bodyTop: '#9dc4ac', rim: '#4f7c75' },
    { unit: 'ml', get: t => t % 10,                            w: 38, h: 12, bodyBot: '#3d6059', bodyTop: '#6a9a80', rim: '#2d4a44' },
];

function buildMiniUnitContainer(cfg) {
    const el = document.createElement('div');
    el.style.cssText = [
        `width:${cfg.w}px`, `height:${cfg.h}px`,
        `background:linear-gradient(to top,${cfg.bodyBot},${cfg.bodyTop})`,
        'border-radius:0 0 4px 4px', 'position:relative', 'flex-shrink:0',
    ].join(';');
    const rim = document.createElement('div');
    rim.style.cssText = `position:absolute;top:-3px;left:-1px;right:-1px;height:4px;background:${cfg.rim};border-radius:2px 2px 0 0;`;
    el.appendChild(rim);
    return el;
}

/** Format ml as Swedish dl string, e.g. 50 → "0,5 dl". */
function formatDl(ml) {
    const dl = ml / 100;
    return dl.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' dl';
}

/** Scale column for the dl beaker (same height as L, labels 0.0–1.0 dl). */
function buildDlScaleEl() {
    const wrap = document.createElement('div');
    wrap.className = 'relative shrink-0';
    wrap.style.cssText = `width:${SCALE_W}px; height:${DL_BEAKER_H}px;`;
    const inner = document.createElement('div');
    inner.className = 'absolute inset-0';
    for (let i = 0; i <= 10; i++) {
        const dl    = (10 - i) / 10;
        const topPx = Math.round((i / 10) * DL_BEAKER_INNER_H);
        const lineW = dl % 0.5 === 0 ? 14 : 8;
        const mark = document.createElement('div');
        mark.className = 'vol-scale-mark';
        mark.style.cssText = `top:${topPx}px; right:0; left:0; justify-content:flex-end;`;
        const labelSpan = document.createElement('span');
        labelSpan.className = 'vol-scale-label';
        labelSpan.style.cssText = 'min-width:36px; text-align:right; color:#4f7c75;';
        labelSpan.textContent = dl.toFixed(1);
        const lineSpan = document.createElement('span');
        lineSpan.className = 'vol-scale-line';
        lineSpan.style.cssText = `width:${lineW}px; background:rgba(79,124,117,0.5);`;
        mark.appendChild(labelSpan);
        mark.appendChild(lineSpan);
        inner.appendChild(mark);
    }
    wrap.appendChild(inner);
    return wrap;
}

/** Build a single dl beaker assembly (green). Returns { wrapper, outer, liquid, surfaceLabel }. */
function buildDlBeakerAssembly(fillPct, labelText, showLabel) {
    const fillPx      = (fillPct / 100) * DL_BEAKER_INNER_H;
    const labelBottom = Math.max(fillPx + 4, 4);
    const wrapper = document.createElement('div');
    wrapper.className = 'relative flex items-end gap-0';
    wrapper.appendChild(buildDlScaleEl());
    const bodyWrap = document.createElement('div');
    bodyWrap.className = 'relative';
    bodyWrap.style.flexShrink = '0';
    const rim = document.createElement('div');
    rim.style.cssText = `width:${DL_BEAKER_W}px; height:6px; border-left:3px solid rgba(79,124,117,0.55); border-right:3px solid rgba(79,124,117,0.55); border-top:3px solid rgba(79,124,117,0.55); border-radius:4px 4px 0 0; background:transparent;`;
    const outer = document.createElement('div');
    outer.className = 'vol-dl-beaker-outer';
    const liquid = document.createElement('div');
    liquid.className = 'vol-dl-liquid';
    liquid.style.height = fillPct + '%';
    const surfaceLabel = document.createElement('div');
    surfaceLabel.className = 'vol-dl-surface-label';
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

    // Container mode: 'L' | 'dl' | 'both'
    #containerMode  = 'L';
    #modeBtns       = null;

    // Beaker refs for in-place updates
    #lBeakerNodes  = [];
    #dlBeakerNodes = [];

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

        // Container mode selector
        const modeHeading = document.createElement('h3');
        modeHeading.className = 'font-bold text-soft-text text-sm uppercase tracking-wider text-soft-muted';
        modeHeading.textContent = 'Visa behållare';
        sidebar.appendChild(modeHeading);

        const modesWrap = document.createElement('div');
        modesWrap.className = 'flex flex-col gap-1';
        this.#modeBtns = modesWrap;

        // Row 1: unit container modes
        const modeRow = document.createElement('div');
        modeRow.className = 'flex gap-1';
        for (const m of [{ key: 'L', label: 'L' }, { key: 'both', label: 'L + dl' }, { key: 'dl', label: 'dl' }]) {
            const btn = document.createElement('button');
            btn.dataset.mode = m.key;
            btn.textContent  = m.label;
            btn.className    = m.key === 'L'
                ? 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-soft-blue text-white border border-soft-blue transition-all'
                : 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-soft-bg text-soft-muted border border-soft-border transition-all hover:border-soft-blue';
            btn.addEventListener('click', () => this.#setContainerMode(m.key));
            modeRow.appendChild(btn);
        }
        modesWrap.appendChild(modeRow);

        // Row 2: place value mode
        const pvBtn = document.createElement('button');
        pvBtn.dataset.mode = 'placevalue';
        pvBtn.textContent  = 'Platsvärde';
        pvBtn.className    = 'w-full py-1.5 rounded-lg text-xs font-bold bg-soft-bg text-soft-muted border border-soft-border transition-all hover:border-soft-blue';
        pvBtn.addEventListener('click', () => this.#setContainerMode('placevalue'));
        modesWrap.appendChild(pvBtn);

        sidebar.appendChild(modesWrap);
        sidebar.appendChild(this.#hr());

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
        main.className = 'flex-1 flex items-center justify-center bg-soft-bg overflow-auto p-8 relative';

        // Beakers row centred in the main area
        const beakersRow = document.createElement('div');
        beakersRow.className = 'flex items-end gap-6 flex-wrap justify-center';
        this.#beakersRow = beakersRow;
        main.appendChild(beakersRow);

        // Enhetsrelationer panel – anchored to top-right corner of main area
        const infoPanel = this.#buildInfoPanel();
        infoPanel.style.position = 'absolute';
        infoPanel.style.top      = '1rem';
        infoPanel.style.right    = '1rem';
        infoPanel.style.maxWidth = '310px';
        main.appendChild(infoPanel);

        return main;
    }

    #buildInfoPanel() {
        const panel = document.createElement('div');
        panel.className = 'bg-soft-surface rounded-2xl shadow-sm border border-soft-border p-7 max-w-xs';

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
        body.className = 'text-sm text-soft-text space-y-1 leading-relaxed';

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
        if (this.#containerMode === 'placevalue') {
            this.#beakersRow.className = 'flex items-center justify-center';
            return this.#renderPlaceValue(totalMl);
        }
        this.#beakersRow.className = 'flex items-end gap-6 flex-wrap justify-center';
        if (this.#containerMode === 'L')  return this.#renderLSection(totalMl);
        if (this.#containerMode === 'dl') return this.#renderDlSection(totalMl);
        this.#renderBothMode(totalMl);
    }

    #renderLSection(totalMl) {
        const row   = this.#beakersRow;
        if (!row) return;
        const fullB = Math.floor(totalMl / MAX_ML_PER_BEAKER);
        const rem   = totalMl % MAX_ML_PER_BEAKER;
        const total = Math.max(1, fullB + (rem > 0 ? 1 : 0));

        if (this.#lBeakerNodes.length !== total) {
            row.innerHTML = '';
            this.#lBeakerNodes  = [];
            this.#dlBeakerNodes = [];
            for (let i = 0; i < total; i++) {
                const ml  = Math.min(MAX_ML_PER_BEAKER, Math.max(0, totalMl - i * MAX_ML_PER_BEAKER));
                const pct = (ml / MAX_ML_PER_BEAKER) * 100;
                const { wrapper, liquid, surfaceLabel } = buildBeakerAssembly(pct, formatLiters(ml), ml > 0);
                row.appendChild(wrapper);
                this.#lBeakerNodes.push({ liquid, surfaceLabel });
            }
        } else {
            const last   = this.#lBeakerNodes[total - 1];
            const ml     = Math.min(MAX_ML_PER_BEAKER, Math.max(0, totalMl - (total - 1) * MAX_ML_PER_BEAKER));
            const pct    = (ml / MAX_ML_PER_BEAKER) * 100;
            const fillPx = (pct / 100) * BEAKER_INNER_H;
            if (last.liquid) last.liquid.style.height = pct + '%';
            if (last.surfaceLabel) {
                last.surfaceLabel.textContent  = formatLiters(ml);
                last.surfaceLabel.style.bottom = Math.max(fillPx + 4, 4) + 'px';
                last.surfaceLabel.style.display = ml > 0 ? 'block' : 'none';
            }
        }
    }

    #renderDlSection(totalMl) {
        const row   = this.#beakersRow;
        if (!row) return;
        const fullB = Math.floor(totalMl / MAX_ML_PER_DL);
        const rem   = totalMl % MAX_ML_PER_DL;
        const total = Math.max(1, fullB + (rem > 0 ? 1 : 0));

        if (this.#dlBeakerNodes.length !== total) {
            row.innerHTML = '';
            this.#dlBeakerNodes = [];
            this.#lBeakerNodes  = [];
            for (let i = 0; i < total; i++) {
                const ml  = Math.min(MAX_ML_PER_DL, Math.max(0, totalMl - i * MAX_ML_PER_DL));
                const pct = (ml / MAX_ML_PER_DL) * 100;
                const { wrapper, liquid, surfaceLabel } = buildDlBeakerAssembly(pct, formatDl(ml), ml > 0);
                row.appendChild(wrapper);
                this.#dlBeakerNodes.push({ liquid, surfaceLabel });
            }
        } else {
            const last   = this.#dlBeakerNodes[total - 1];
            const ml     = Math.min(MAX_ML_PER_DL, Math.max(0, totalMl - (total - 1) * MAX_ML_PER_DL));
            const pct    = (ml / MAX_ML_PER_DL) * 100;
            const fillPx = (pct / 100) * DL_BEAKER_INNER_H;
            if (last.liquid) last.liquid.style.height = pct + '%';
            if (last.surfaceLabel) {
                last.surfaceLabel.textContent  = formatDl(ml);
                last.surfaceLabel.style.bottom = Math.max(fillPx + 4, 4) + 'px';
                last.surfaceLabel.style.display = ml > 0 ? 'block' : 'none';
            }
        }
    }

    #renderBothMode(totalMl) {
        const row = this.#beakersRow;
        if (!row) return;

        const lFull  = Math.floor(totalMl / MAX_ML_PER_BEAKER);
        const dlMl   = totalMl % MAX_ML_PER_BEAKER; // remaining ml after full litres
        const dlFull = Math.floor(dlMl / MAX_ML_PER_DL);
        const dlRem  = dlMl % MAX_ML_PER_DL;

        const lTotal  = Math.max(1, lFull);
        const dlTotal = Math.max(1, dlFull + (dlRem > 0 ? 1 : 0));

        if (this.#lBeakerNodes.length !== lTotal || this.#dlBeakerNodes.length !== dlTotal) {
            row.innerHTML = '';
            this.#lBeakerNodes  = [];
            this.#dlBeakerNodes = [];

            // L beakers (full or empty – partial liter lives in dl group)
            const lGroup = document.createElement('div');
            lGroup.className = 'flex items-end gap-6';
            for (let i = 0; i < lTotal; i++) {
                const ml  = i < lFull ? MAX_ML_PER_BEAKER : 0;
                const pct = (ml / MAX_ML_PER_BEAKER) * 100;
                const { wrapper, liquid, surfaceLabel } = buildBeakerAssembly(pct, formatLiters(ml), ml > 0);
                lGroup.appendChild(wrapper);
                this.#lBeakerNodes.push({ liquid, surfaceLabel });
            }
            row.appendChild(lGroup);

            const sep = document.createElement('div');
            sep.className = 'text-2xl font-bold text-soft-muted self-center pb-8';
            sep.textContent = '+';
            row.appendChild(sep);

            // dl beakers (the sub-litre remainder)
            const dlGroup = document.createElement('div');
            dlGroup.className = 'flex items-end gap-6';
            for (let i = 0; i < dlTotal; i++) {
                const ml  = Math.min(MAX_ML_PER_DL, Math.max(0, dlMl - i * MAX_ML_PER_DL));
                const pct = (ml / MAX_ML_PER_DL) * 100;
                const { wrapper, liquid, surfaceLabel } = buildDlBeakerAssembly(pct, formatDl(ml), ml > 0);
                dlGroup.appendChild(wrapper);
                this.#dlBeakerNodes.push({ liquid, surfaceLabel });
            }
            row.appendChild(dlGroup);
        } else {
            // In-place update: L beakers may change fill even if count stays the same
            for (let i = 0; i < this.#lBeakerNodes.length; i++) {
                const node   = this.#lBeakerNodes[i];
                const ml     = i < lFull ? MAX_ML_PER_BEAKER : 0;
                const pct    = (ml / MAX_ML_PER_BEAKER) * 100;
                const fillPx = (pct / 100) * BEAKER_INNER_H;
                if (node.liquid) node.liquid.style.height = pct + '%';
                if (node.surfaceLabel) {
                    node.surfaceLabel.textContent  = formatLiters(ml);
                    node.surfaceLabel.style.bottom = Math.max(fillPx + 4, 4) + 'px';
                    node.surfaceLabel.style.display = ml > 0 ? 'block' : 'none';
                }
            }
            // Update last dl beaker
            const last   = this.#dlBeakerNodes[dlTotal - 1];
            const ml     = Math.min(MAX_ML_PER_DL, Math.max(0, dlMl - (dlTotal - 1) * MAX_ML_PER_DL));
            const pct    = (ml / MAX_ML_PER_DL) * 100;
            const fillPx = (pct / 100) * DL_BEAKER_INNER_H;
            if (last?.liquid) last.liquid.style.height = pct + '%';
            if (last?.surfaceLabel) {
                last.surfaceLabel.textContent  = formatDl(ml);
                last.surfaceLabel.style.bottom = Math.max(fillPx + 4, 4) + 'px';
                last.surfaceLabel.style.display = ml > 0 ? 'block' : 'none';
            }
        }
    }

    #renderPlaceValue(totalMl) {
        const row = this.#beakersRow;
        if (!row) return;
        row.innerHTML   = '';
        this.#lBeakerNodes  = [];
        this.#dlBeakerNodes = [];

        const chart = document.createElement('div');
        chart.style.cssText = [
            'display:flex', 'align-items:stretch',
            'background:white',
            'border:2px solid #d6d4d0',
            'border-radius:16px',
            'overflow:hidden',
            'box-shadow:0 4px 20px rgba(74,75,80,0.10)',
        ].join(';');

        PV_CONFIGS.forEach((cfg, ci) => {
            const count  = cfg.get(totalMl);
            const isLast = ci === PV_CONFIGS.length - 1;

            const col = document.createElement('div');
            col.style.cssText = [
                'display:flex', 'flex-direction:column', 'align-items:center',
                'padding:16px 20px 20px',
                `border-right:${isLast ? 'none' : '2px solid #d6d4d0'}`,
                'min-width:110px',
            ].join(';');

            // Unit label at top
            const unitLbl = document.createElement('div');
            unitLbl.style.cssText = `font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:${cfg.rim};margin-bottom:12px;font-family:'Nunito',sans-serif;`;
            unitLbl.textContent = cfg.unit;
            col.appendChild(unitLbl);

            // Stack area — flex-col-reverse so first container sits at the bottom
            const stack = document.createElement('div');
            stack.style.cssText = [
                'display:flex', 'flex-direction:column-reverse',
                'align-items:center', 'gap:4px',
                'flex:1', 'min-height:490px',
                'justify-content:flex-start',
            ].join(';');

            if (count === 0) {
                const ghost = document.createElement('div');
                ghost.style.cssText = `width:${cfg.w}px;height:${cfg.h}px;border:2px dashed ${cfg.bodyBot};border-radius:0 0 4px 4px;opacity:0.2;`;
                stack.appendChild(ghost);
            } else {
                for (let i = 0; i < count; i++) {
                    stack.appendChild(buildMiniUnitContainer(cfg));
                }
            }
            col.appendChild(stack);

            // Digit at bottom
            const digit = document.createElement('div');
            digit.style.cssText = `font-size:30px;font-weight:800;color:${cfg.rim};margin-top:14px;font-family:'Nunito',sans-serif;line-height:1;`;
            digit.textContent = String(count);
            col.appendChild(digit);

            chart.appendChild(col);
        });

        row.appendChild(chart);
    }

    #setContainerMode(mode) {
        this.#containerMode = mode;
        if (this.#modeBtns) {
            this.#modeBtns.querySelectorAll('button').forEach(btn => {
                const active   = btn.dataset.mode === mode;
                const sizeClass = btn.dataset.mode === 'placevalue' ? 'w-full' : 'flex-1';
                btn.className  = active
                    ? `${sizeClass} py-1.5 rounded-lg text-xs font-bold bg-soft-blue text-white border border-soft-blue transition-all`
                    : `${sizeClass} py-1.5 rounded-lg text-xs font-bold bg-soft-bg text-soft-muted border border-soft-border transition-all hover:border-soft-blue`;
            });
        }
        this.#lBeakerNodes  = [];
        this.#dlBeakerNodes = [];
        if (this.#beakersRow) this.#beakersRow.innerHTML = '';
        this.#render(this.#engine.getReading());
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
