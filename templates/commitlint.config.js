module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'ci',
        'build',
        'revert',
        'merge'
      ]
    ]
  },
  ignores: [
    message => {
      return message.includes('update version project and CHANGELOG.md');
    }
  ]
};

// git commit -m "feat: nueva funcionalidad"
// git commit -m "fix: corregir bug en login"
// git commit -m "docs: actualizar README"
// git commit -m "style: formatear código"
// git commit -m "refactor: simplificar lógica"
// git commit -m "test: añadir tests unitarios"
// git commit -m "chore: actualizar dependencias"
// git commit -m "perf: optimizar consulta"
// git commit -m "ci: configurar pipeline"
// git commit -m "build: actualizar webpack"
