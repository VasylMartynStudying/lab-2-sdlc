// Критичне завдання: метод Гаусса на системі варіанта з a₁₁ = 0 та з малим a₁₁.
// Наївна версія (без вибору головного елемента) залишена тут лише для порівняння.
const { LinearSystem } = require('../js/system.js');
const { matVec } = require('../js/matrix.js');
const { GaussSolver } = require('../js/gauss.js');

function gaussNaive(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let k = 0; k < n - 1; k++) {
    for (let i = k + 1; i < n; i++) {
      const factor = M[i][k] / M[k][k];
      for (let j = k; j <= n; j++) M[i][j] -= factor * M[k][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) sum -= M[i][j] * x[j];
    x[i] = sum / M[i][i];
  }
  return x;
}

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

for (const n of [5, 10, 20]) {
  const cases = [
    ['рядки 1 і 2 переставлено', swapped(n)],
    ['a11 = 0', withA11(0, n)],
    ['a11 = 1e-17', withA11(1e-17, n)],
  ];
  for (const [name, system] of cases) {
    console.log(`\nn = ${n}, ${name} (a11 = ${Number(system.A[0][0].toPrecision(4))})`);
    const methods = {
      'без вибору  ': () => gaussNaive(system.A, system.b),
      'з вибором   ': () => new GaussSolver().solve(system).x,
    };
    for (const [method, solve] of Object.entries(methods)) {
      const x = solve();
      console.log(`  ${method} x₁..x₃ = [${x.slice(0, 3).map((v) => Number(v.toPrecision(6))).join('; ')}]`
        + `  ‖x − x*‖ = ${system.errorNorm(x).toExponential(3)}`);
    }
  }
}
