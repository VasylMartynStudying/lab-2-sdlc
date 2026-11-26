// Критичне завдання: метод Гаусса на системі варіанта з a₁₁ = 0.
const { LinearSystem } = require('../js/system.js');
const { matVec } = require('../js/matrix.js');
const gauss = require('../js/gauss.js');

function withA11(value, n) {
  const s = LinearSystem.fromVariant(n, 1);
  const A = s.A.map((row) => row.slice());
  A[0][0] = value;
  return new LinearSystem(A, matVec(A, s.exact), s.exact);
}

function swapped(n) {
  const s = LinearSystem.fromVariant(n, 1);
  const order = (v) => [v[1], v[0], ...v.slice(2)];
  return new LinearSystem(order(s.A), order(s.b), s.exact);
}

const cases = [
  ['рядки 1 і 2 переставлено', swapped(5)],
  ['a11 = 0', withA11(0, 5)],
  ['a11 = 1e-17', withA11(1e-17, 5)],
];

for (const [name, system] of cases) {
  console.log(`\n${name}: a11 = ${system.A[0][0]}`);
  for (const [method, solve] of Object.entries(gauss)) {
    if (typeof solve !== 'function') continue;
    const out = solve(system.A, system.b);
    const x = Array.isArray(out) ? out : out.x;
    console.log(`  ${method}`);
    console.log(`    x = [${x.map((v) => Number(v.toPrecision(6))).join(', ')}]`);
    console.log(`    ‖x − x*‖ = ${system.errorNorm(x).toExponential(3)}`);
  }
}
