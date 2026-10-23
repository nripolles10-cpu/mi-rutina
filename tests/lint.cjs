// Pasa ESLint (variables sin definir, claves duplicadas, reglas de hooks…) sobre el código JSX de la app
const fs = require('fs'); const path = require('path');
const { ESLint } = require('eslint');
const file = process.argv[2] || path.resolve(__dirname, '..', 'ultimo.html');
const html = fs.readFileSync(file, 'utf8');
const src = html.match(/<script type="text\/babel" data-presets="react">([\s\S]*?)<\/script>/)[1];
const offset = html.slice(0, html.indexOf(src)).split('\n').length - 1;
(async () => {
  const eslint = new ESLint({ useEslintrc: false, overrideConfig: {
    parserOptions: { ecmaVersion: 2022, sourceType: 'script', ecmaFeatures: { jsx: true } },
    env: { browser: true, es2022: true },
    globals: { React: 'readonly', ReactDOM: 'readonly', LZString: 'readonly' },
    plugins: ['react', 'react-hooks'],
    settings: { react: { version: '18.2' } },
    rules: {
      'no-undef': 'error', 'no-dupe-keys': 'error', 'no-redeclare': 'error', 'no-unreachable': 'error',
      'no-unused-vars': ['warn', { args: 'none' }], 'react/jsx-key': 'error', 'react/jsx-no-undef': 'error',
      'react/jsx-uses-vars': 'error', 'react/jsx-uses-react': 'error', 'react/no-unknown-property': 'error',
      'react-hooks/rules-of-hooks': 'error', 'no-self-compare': 'error', 'no-dupe-else-if': 'error', 'no-duplicate-case': 'error',
    } } });
  const [r] = await eslint.lintText(src, { filePath: 'app.jsx' });
  for (const m of r.messages) console.log(`${m.severity === 2 ? 'ERROR' : 'aviso'} línea ${m.line + offset}: ${m.message} (${m.ruleId})`);
  console.log(`\n${r.errorCount} errores, ${r.warningCount} avisos`);
  process.exit(r.errorCount ? 1 : 0);
})();
