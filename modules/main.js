import { ToolRegistry } from './core/ToolRegistry.js';
import { appState } from './core/AppState.js';
import { createHomeTool } from './tools/HomeTool.js';
import { createVolumeTool } from './tools/VolumeTool.js';
import { createFractionsTool } from './tools/FractionsTool.js';
import { createGeometryTool } from './tools/GeometryTool.js';
import { createClockTool } from './tools/ClockTool.js';
import { createCountingTool } from './tools/CountingTool.js';
import { createNumberLinesTool } from './tools/NumberLinesTool.js';
import { createStatisticsTool } from './tools/StatisticsTool.js';
import { DecimaltalTool } from './tools/DecimaltalTool.js';
import { KoordinatTool } from './tools/KoordinatTool.js';
import { ScaleTool } from './tools/ScaleTool.js';
import { PosSystemTool } from './tools/PosSystemTool.js';

const registry = new ToolRegistry();

document.addEventListener('DOMContentLoaded', () => {
    registry.init(
        document.getElementById('tool-mount'),
        document.getElementById('app-title'),
        document.getElementById('btn-home'),
        document.getElementById('controls-area')
    );

    registry.register(createHomeTool());
    registry.register(createVolumeTool());
    registry.register(createFractionsTool());
    registry.register(createGeometryTool());
    registry.register(createClockTool());
    registry.register(createCountingTool());
    registry.register(createNumberLinesTool());
    registry.register(createStatisticsTool());
    registry.register(DecimaltalTool);
    registry.register(KoordinatTool);
    registry.register(ScaleTool);
    registry.register(PosSystemTool);

    appState.setActiveTool('home');
});
