// Аналітичне тестування: таблиці для docs/metrics.md і docs/results.json.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { LinearSystem } = require('../js/system.js');
const { compareSizes, solveAll, spectralRadius, createSolver } = require('../js/analysis.js');

const EPS = 1e-10;
const docs = path.join(__dirname, '..', 'docs');
const num = (v) => (v === null || v === undefined ? '—' : v === 0 ? '0' : v.toExponential(2).replace('.', ','));
const fix = (v, k) => v.toFixed(k).replace('.', ',');

// Прогрівання JIT, щоб перші виміри не були повільнішими за решту.
compareSizes({ eps: EPS, minTime: 20 });
const rows = compareSizes({ eps: EPS, minTime: 200 });

const spectrum = [];
for (const d of [1, 0.1]) {
  for (const n of [5, 10, 20]) {
    const s = LinearSystem.fromVariant(n, d);
    spectrum.push({ d, n, jacobi: spectralRadius(s, 'jacobi'), seidel: spectralRadius(s, 'seidel') });
  }
}

// Вплив d і ε на кількість ітерацій для n = 20.
const sweep = [1, 0.5, 0.1, 0.05, 0.01].map((d) => {
  const s = LinearSystem.fromVariant(20, d);
  return {
    d,
    jacobi: createSolver('jacobi').solve(s, { eps: EPS }).iterations,
    seidel: createSolver('seidel').solve(s, { eps: EPS }).iterations,
  };
});

// Зразки для scripts/verify.py: система та отримані розв’язки.
const solutions = [];
for (const d of [1, 0.1]) {
  for (const n of [5, 10, 20]) {
    const s = LinearSystem.fromVariant(n, d);
    const { results } = solveAll(s, { eps: EPS, minTime: 0, record: false });
    solutions.push({
      d, n, A: s.A, b: s.b,
      x: Object.fromEntries(Object.values(results).map((r) => [r.id, r.x])),
      rho: spectrum.find((r) => r.d === d && r.n === n),
    });
  }
}

const out = [
  '# Результати аналітичного тестування',
  '',
  `Node.js ${process.versions.node}, ${os.cpus()[0].model.trim()}. ε = 1e-10, x⁽⁰⁾ = 0.`,
  'Час — середнє повторних запусків без запису кроків протягом 200 мс.',
  '',
  '| d | n | Метод | Ітерацій | ‖Ax − b‖₂ | ‖x − x*‖₂ | Час, мс |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${fix(r.d, r.d === 1 ? 0 : 1)} | ${r.n} | ${r.name} | ${r.iterations ?? '—'} | ${num(r.residual)} | ${num(r.error)} | ${fix(r.timeMs, 4)} |`),
  '',
  '## Спектральний радіус матриці переходу',
  '',
  '| d | n | Якобі | Зейдель |',
  '| --- | --- | --- | --- |',
  ...spectrum.map((r) => `| ${String(r.d).replace('.', ',')} | ${r.n} | ${fix(r.jacobi, 4)} | ${fix(r.seidel, 4)} |`),
  '',
  '## Кількість ітерацій залежно від d (n = 20)',
  '',
  '| d | Якобі | Зейдель |',
  '| --- | --- | --- |',
  ...sweep.map((r) => `| ${String(r.d).replace('.', ',')} | ${r.jacobi} | ${r.seidel} |`),
  '',
];
fs.writeFileSync(path.join(docs, 'metrics.md'), out.join('\n'));
fs.writeFileSync(path.join(docs, 'results.json'), JSON.stringify({ rows: rows.map(({ x, ...r }) => r), spectrum, sweep, solutions }));
console.log(out.join('\n'));
