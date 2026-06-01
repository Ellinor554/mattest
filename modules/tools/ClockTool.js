import { ClockEngine } from './ClockEngine.js';
import { ClockView }   from './ClockView.js';

export function createClockTool() {
    const engine = new ClockEngine();
    const view   = new ClockView(engine);

    return {
        id: 'clock',
        title: '<i class="fas fa-clock mr-2"></i> Klockan',

        mount(parentEl) {
            return view.mount(parentEl);
        },

        onEnter() {
            // SVG must be visible for getScreenCTM() to work
            view.initDragIfNeeded();
        },

        onLeave() {
            view.unmount();
        },
    };
}
