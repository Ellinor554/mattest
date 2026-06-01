// ═══════════════════════════════════════════════════════════════════════════
// modules/tools/GeometryFormulas.js
// Pure helper for the formula calculator. Returns structured data (no DOM).
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_DIMS_CM = Object.freeze({
    circle:        { r: 5 },
    square:        { a: 10 },
    rectangle:     { b: 11, h: 7 },
    triangle:      { b: 10, h: 9 },
    pentagon:      { a: 5.88 },
    hexagon:       { a: 5 },
    rhombus:       { d1: 10.4, d2: 10 },
    parallelogram: { b: 9, h: 8 },
    cube:          { a: 10 },
    cuboid:        { a: 14, b: 9, c: 8 },
    sphere:        { r: 7.5 },
    cylinder:      { r: 5, h: 10 },
    pyramid:       { a: 10, h: 10 },
    cone:          { r: 5, h: 10 },
});

export const MULTI_DIM_2D_SHAPES = Object.freeze([
    'rectangle', 'triangle', 'rhombus', 'parallelogram',
]);

export function cmToUnit(valueCm, unit) {
    if (unit === 'mm') return valueCm * 10;
    if (unit === 'm')  return valueCm / 100;
    return valueCm;
}

export function unitToCm(value, unit) {
    if (unit === 'mm') return value / 10;
    if (unit === 'm')  return value * 100;
    return value;
}

function fmt(n) { return +Number(n).toFixed(2); }

export function getFormulaSpec(shape, unit) {
    const dimsCm = shape.dimensions || DEFAULT_DIMS_CM[shape.type] || {};
    const d = key => cmToUnit(dimsCm[key] ?? 0, unit);
    const rows = [];
    const inputs = [];

    const v = (text, key, color) => ({ type: 'var', text, key, color });
    const t = (txt) => ({ type: 'text', value: txt });
    const row = (label, parts) => rows.push({ label, parts });
    const inp = (label, key, valueDisplay, opts = {}) =>
        inputs.push({ label, key, value: valueDisplay, ...opts });

    const u  = unit;
    const u2 = unit + '²';
    const u3 = unit + '³';

    if (shape.kind === '2d') {
        switch (shape.type) {
            case 'circle': {
                const r = d('r'), O = fmt(2 * Math.PI * r), A = fmt(Math.PI * r * r);
                row('Omkrets', [t('O = 2 · π · '), v('r','r','#5b80a5'), t(` = ${O} ${u}`)]);
                row('Area',    [t('A = π · '),     v('r','r','#5b80a5'), t(`² = ${A} ${u2}`)]);
                inp('Radie:',    'r', fmt(r));
                inp('Diameter:', 'r', fmt(r * 2), { specialKey: 'd_circle' });
                break;
            }
            case 'square': {
                const a = d('a'), O = fmt(4 * a), A = fmt(a * a);
                row('Omkrets', [t('O = 4 · '), v('a','a','#4f7c75'), t(` = ${O} ${u}`)]);
                row('Area',    [t('A = '),     v('a','a','#4f7c75'), t(`² = ${A} ${u2}`)]);
                inp('Sida (a):', 'a', fmt(a));
                break;
            }
            case 'rectangle': {
                const b = d('b'), h = d('h');
                const O = fmt(2 * (b + h)), A = fmt(b * h);
                row('Omkrets', [t('O = 2·('), v('b','b','#5b80a5'), t(' + '), v('h','h','#a85c72'), t(`) = ${O} ${u}`)]);
                row('Area', [t('A = '), v('b','b','#5b80a5'), t(' · '), v('h','h','#a85c72'), t(` = ${A} ${u2}`)]);
                inp('Bas (b):',  'b', fmt(b));
                inp('Höjd (h):', 'h', fmt(h));
                break;
            }
            case 'triangle': {
                const b = d('b'), h = d('h');
                const A = fmt(b * h / 2);
                const side = Math.sqrt(Math.pow(b / 2, 2) + Math.pow(h, 2));
                const O = fmt(b + 2 * side);
                row('Omkrets', [t('O = '), v('b','b','#5b80a5'), t(' + 2·s'), t(` = ${O} ${u}`)]);
                row('Area', [t('A = '), v('b','b','#5b80a5'), t(' · '), v('h','h','#a85c72'), t(` / 2 = ${A} ${u2}`)]);
                inp('Bas (b):',  'b', fmt(b));
                inp('Höjd (h):', 'h', fmt(h));
                break;
            }
            case 'pentagon': {
                const a = d('a'), O = fmt(5 * a);
                const A = fmt(5 / 4 * a * a / Math.tan(Math.PI / 5));
                row('Omkrets', [t('O = 5 · '), v('a','a','#dec894'), t(` = ${O} ${u}`)]);
                row('Area',    [t('A = (5·'), v('a','a','#dec894'), t(`²) / (4·tan36°) = ${A} ${u2}`)]);
                inp('Sida (a):', 'a', fmt(a));
                break;
            }
            case 'hexagon': {
                const a = d('a'), O = fmt(6 * a);
                const A = fmt(3 * Math.sqrt(3) / 2 * a * a);
                row('Omkrets', [t('O = 6 · '), v('a','a','#4f7c75'), t(` = ${O} ${u}`)]);
                row('Area',    [t('A = (3√3/2) · '), v('a','a','#4f7c75'), t(`² = ${A} ${u2}`)]);
                inp('Sida (a):', 'a', fmt(a));
                break;
            }
            case 'rhombus': {
                const d1 = d('d1'), d2 = d('d2');
                const A = fmt(d1 * d2 / 2);
                const side = Math.sqrt(Math.pow(d1 / 2, 2) + Math.pow(d2 / 2, 2));
                const O = fmt(4 * side);
                row('Omkrets', [t(`O = 4·√((d₁/2)²+(d₂/2)²) = ${O} ${u}`)]);
                row('Area',    [t('A = ('), v('d₁','d1','#5b80a5'), t(' · '), v('d₂','d2','#a85c72'), t(`) / 2 = ${A} ${u2}`)]);
                inp('Diag. 1 (d₁):', 'd1', fmt(d1));
                inp('Diag. 2 (d₂):', 'd2', fmt(d2));
                break;
            }
            case 'parallelogram': {
                const b = d('b'), h = d('h');
                const A = fmt(b * h);
                const slant = Math.sqrt(h * h + Math.pow(b * 0.2, 2));
                const O = fmt(2 * (b + slant));
                row('Omkrets', [t(`O = 2·(b + s) = ${O} ${u}`)]);
                row('Area',    [t('A = '), v('b','b','#5b80a5'), t(' · '), v('h','h','#a85c72'), t(` = ${A} ${u2}`)]);
                inp('Bas (b):',  'b', fmt(b));
                inp('Höjd (h):', 'h', fmt(h));
                break;
            }
        }
    } else if (shape.kind === '3d') {
        switch (shape.type) {
            case 'cube': {
                const a = d('a'), V = fmt(a * a * a);
                row('Volym', [t('V = '), v('a','a','#4f7c75'), t(`³ = ${V} ${u3}`)]);
                inp('Sida (a):', 'a', fmt(a));
                break;
            }
            case 'cuboid': {
                const a = d('a'), b = d('b'), c = d('c');
                const V = fmt(a * b * c);
                row('Volym', [t('V = '), v('a','a','#5b80a5'), t(' · '), v('b','b','#4f7c75'), t(' · '), v('c','c','#a85c72'), t(` = ${V} ${u3}`)]);
                inp('a:', 'a', fmt(a));
                inp('b:', 'b', fmt(b));
                inp('c:', 'c', fmt(c));
                break;
            }
            case 'sphere': {
                const r = d('r'), V = fmt(4 / 3 * Math.PI * r * r * r);
                row('Volym', [t('V = (4/3) · π · '), v('r','r','#a85c72'), t(`³ = ${V} ${u3}`)]);
                inp('Radie (r):', 'r', fmt(r));
                break;
            }
            case 'cylinder': {
                const r = d('r'), h = d('h');
                const V = fmt(Math.PI * r * r * h);
                row('Volym', [t('V = π · '), v('r','r','#5b80a5'), t('² · '), v('h','h','#a85c72'), t(` = ${V} ${u3}`)]);
                inp('Radie (r):', 'r', fmt(r));
                inp('Höjd (h):',  'h', fmt(h));
                break;
            }
            case 'pyramid': {
                const a = d('a'), h = d('h');
                const V = fmt(1 / 3 * a * a * h);
                row('Volym', [t('V = (1/3) · '), v('a','a','#dec894'), t('² · '), v('h','h','#a85c72'), t(` = ${V} ${u3}`)]);
                inp('Bas (a):',  'a', fmt(a));
                inp('Höjd (h):', 'h', fmt(h));
                break;
            }
            case 'cone': {
                const r = d('r'), h = d('h');
                const V = fmt(1 / 3 * Math.PI * r * r * h);
                row('Volym', [t('V = (1/3) · π · '), v('r','r','#938db3'), t('² · '), v('h','h','#a85c72'), t(` = ${V} ${u3}`)]);
                inp('Radie (r):', 'r', fmt(r));
                inp('Höjd (h):',  'h', fmt(h));
                break;
            }
        }
    }

    return {
        rows,
        inputs,
        hasContent: rows.length > 0,
    };
}
