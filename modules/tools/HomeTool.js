import { appState } from '../core/AppState.js';

const CARDS = [
    {
        id: 'fractions',
        icon: 'fa-chart-pie',
        colorBg: 'bg-soft-pinkLight/30',
        colorText: 'text-soft-pink',
        title: 'Bråk',
        desc: 'Jämför delar och bygg hela med flyttbara bråkcirklar.',
    },
    {
        id: 'numberlines',
        icon: 'fa-ruler-horizontal',
        colorBg: 'bg-soft-blueLight/30',
        colorText: 'text-soft-blue',
        title: 'Tallinjer',
        desc: 'Hoppa längs linjer från 0-10, 0-100 och utforska decimaltal.',
    },
    {
        id: 'geometry',
        icon: 'fa-cubes',
        colorBg: 'bg-soft-greenLight/30',
        colorText: 'text-soft-green',
        title: 'Geometriska objekt',
        desc: 'Vrid och vänd på 2D- och 3D-former för att förstå deras egenskaper.',
    },
    {
        id: 'counting',
        icon: 'fa-calculator',
        colorBg: 'bg-soft-yellow/40',
        colorText: 'text-soft-yellowDark',
        title: 'Räkning',
        desc: 'Hitta tiokompisarna och öva med multiplikations- och divisionskvadrater.',
    },
    {
        id: 'clock',
        icon: 'fa-clock',
        colorBg: 'bg-soft-purpleLight/30',
        colorText: 'text-soft-purple',
        title: 'Klockan',
        desc: 'Dra i visarna för att jämföra analog och digital tid.',
    },
    {
        id: 'statistics',
        icon: 'fa-chart-bar',
        colorBg: 'bg-soft-tealLight/30',
        colorText: 'text-soft-teal',
        title: 'Statistik',
        desc: 'Bygg stapeldiagram, linjediagram och cirkeldiagram med egna värden.',
    },
    {
        id: 'koordinat',
        icon: 'fa-crosshairs',
        colorBg: 'bg-soft-purpleLight/30',
        colorText: 'text-soft-purple',
        title: 'Koordinatsystem',
        desc: 'Rita punkter i ett koordinatplan och utforska x- och y-axeln.',
    },
    {
        id: 'positionssystem',
        icon: 'fa-cubes',
        colorBg: 'bg-soft-blueLight/30',
        colorText: 'text-soft-blue',
        title: 'Positionssystemet',
        desc: 'Bygg och utforska tal med tiobasmaterial – ental, tiotal, hundratal och tusental.',
    },
    {
        id: 'volym',
        icon: 'fa-fill-drip',
        colorBg: 'bg-soft-blueLight/30',
        colorText: 'text-soft-blue',
        title: 'Volym',
        desc: 'Visualisera volymer och enhetsomvandlingar med Liter, Deciliter, Centiliter och Milliliter.',
    },
    {
        id: 'decimaltal',
        icon: 'fa-arrows-left-right',
        colorBg: 'bg-soft-tealLight/30',
        colorText: 'text-soft-teal',
        title: 'Decimaltal',
        desc: 'Utforska positionsvärde och flytta siffror vid multiplikation och division med 10.',
    },
    {
        id: 'scale',
        icon: 'fa-ruler-combined',
        colorBg: 'bg-soft-blueLight/30',
        colorText: 'text-soft-blue',
        title: 'Skala och mått',
        desc: 'Utforska förstoring och förminskning med skalor och jämför verklighet med ritning.',
    },
];

function buildCard(card) {
    const btn = document.createElement('button');
    btn.className = 'bg-soft-surface p-8 rounded-2xl shadow-sm hover:shadow-md border border-soft-border flex flex-col items-center justify-center gap-4 transition-all hover:-translate-y-1 group';

    const iconWrap = document.createElement('div');
    iconWrap.className = `w-20 h-20 rounded-full ${card.colorBg} ${card.colorText} flex items-center justify-center text-3xl group-hover:scale-110 transition-transform`;
    iconWrap.innerHTML = `<i class="fas ${card.icon}"></i>`;

    const heading = document.createElement('h3');
    heading.className = 'text-xl font-bold text-soft-text';
    heading.textContent = card.title;

    const para = document.createElement('p');
    para.className = 'text-soft-muted text-center text-sm';
    para.textContent = card.desc;

    btn.appendChild(iconWrap);
    btn.appendChild(heading);
    btn.appendChild(para);

    btn.addEventListener('click', () => appState.setActiveTool(card.id));
    return btn;
}

export function createHomeTool() {
    return {
        id: 'home',
        title: '<i class="fas fa-shapes text-soft-blue mr-2"></i> Matematikutforskaren',

        mount(parentEl) {
            const section = document.createElement('section');
            section.className = 'view-section flex-col h-full overflow-y-auto p-8';

            const inner = document.createElement('div');
            inner.className = 'max-w-5xl mx-auto w-full';

            const heading = document.createElement('h2');
            heading.className = 'text-3xl font-bold text-soft-text mb-8 text-center';
            heading.textContent = 'Vad vill du utforska idag?';

            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

            for (const card of CARDS) {
                grid.appendChild(buildCard(card));
            }

            inner.appendChild(heading);
            inner.appendChild(grid);
            section.appendChild(inner);
            parentEl.appendChild(section);
            return section;
        },

        onEnter() {},
        onLeave() {},
    };
}
