import { VolumeEngine } from './VolumeEngine.js';
import { VolumeView } from './VolumeView.js';

export function createVolumeTool() {
    const engine = new VolumeEngine();
    const view   = new VolumeView(engine);

    return {
        id: 'volym',
        title: '<i class="fas fa-fill-drip mr-2"></i> Volym',

        mount(parentEl) {
            return view.mount(parentEl);
        },

        onEnter() {},

        onLeave() {
            view.unmount();
        },
    };
}
