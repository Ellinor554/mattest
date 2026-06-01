/**
 * @typedef {Object} ToolModule
 * @property {string} id - unique kebab-case id
 * @property {string} title - HTML allowed title string
 * @property {function(HTMLElement): HTMLElement} mount - build DOM, return root element
 * @property {function(): void} [onEnter] - called when tool shown
 * @property {function(): void} [onLeave] - called when tool hidden
 */
