import { StatisticsEngine } from './StatisticsEngine.js';
import { StatisticsView }   from './StatisticsView.js';

export function createStatisticsTool() {
    const engine = new StatisticsEngine();
    const view   = new StatisticsView(engine);
    return {
        id:    'statistics',
        title: 'Statistik',
        mount(parentEl) { return view.mount(parentEl); },
        onLeave()       { view.cleanup(); },
    };
}
