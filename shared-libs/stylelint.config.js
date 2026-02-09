/** @type {import('stylelint').Config} */
module.exports = {
  extends: ['stylelint-config-standard-scss'],
  customSyntax: 'postcss-scss',
  plugins: ['stylelint-order'],
  rules: {
    // SCSS
    'at-rule-no-unknown': null,
    'scss/at-rule-no-unknown': true,
    'selector-pseudo-element-no-unknown': [true, { ignorePseudoElements: ['ng-deep'] }],
    'keyframes-name-pattern': null,

    // Ajustes prácticos para Angular/SCSS
    'selector-class-pattern': null,
    'no-descending-specificity': null,

    'no-empty-source': null,

    // Orden de propiedades (opcional)
    'order/properties-order': [
      [
        {
          groupName: 'Position',
          properties: ['position', 'top', 'right', 'bottom', 'left', 'z-index'],
        },
        {
          groupName: 'Display & Box',
          properties: [
            'display',
            'flex',
            'flex-direction',
            'flex-wrap',
            'grid',
            'grid-template',
            'grid-auto-flow',
            'gap',
            'place-items',
            'align-items',
            'justify-content',
            'float',
            'clear',
            'box-sizing',
            'width',
            'min-width',
            'max-width',
            'height',
            'min-height',
            'max-height',
            'margin',
            'padding',
          ],
        },
        {
          groupName: 'Typography',
          properties: [
            'font',
            'font-family',
            'font-size',
            'font-weight',
            'line-height',
            'letter-spacing',
            'text-align',
            'text-transform',
            'text-decoration',
            'white-space',
            'color',
          ],
        },
        {
          groupName: 'Visual',
          properties: [
            'background',
            'background-color',
            'background-image',
            'background-position',
            'background-size',
            'border',
            'border-radius',
            'box-shadow',
            'opacity',
          ],
        },
        {
          groupName: 'Animation',
          properties: [
            'transition',
            'transition-property',
            'transition-duration',
            'transition-timing-function',
            'animation',
            'animation-name',
            'animation-duration',
            'animation-timing-function',
            'animation-iteration-count',
          ],
        },
        {
          groupName: 'Misc',
          properties: ['cursor', 'pointer-events', 'user-select', 'appearance', 'outline'],
        },
      ],
      { unspecified: 'bottomAlphabetical' },
    ],
  },
  ignoreFiles: ['**/*.min.css', '**/dist/**', '**/build/**', 'node_modules/**'],
};
