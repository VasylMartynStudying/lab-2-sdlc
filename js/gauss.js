// Метод Гаусса БЕЗ вибору головного елемента (перша версія для критичного завдання).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Slae = Object.assign(root.Slae || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

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

  return { gaussNaive };
});
