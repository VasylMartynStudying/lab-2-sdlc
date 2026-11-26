// Перевірка строгої діагональної переваги за рядками.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Slae = Object.assign(root.Slae || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Повертає для кожного рядка |aᵢᵢ|, суму інших модулів і запас між ними.
   * q = max(сума / |aᵢᵢ|) — норма ‖B‖∞ матриці переходу методу Якобі;
   * строга перевага рівносильна q < 1.
   */
  function checkDominance(A) {
    const rows = A.map((row, i) => {
      let off = 0;
      for (let j = 0; j < row.length; j++) if (j !== i) off += Math.abs(row[j]);
      const diag = Math.abs(row[i]);
      return { index: i + 1, diag, off, margin: diag - off, ok: diag > off };
    });
    const violated = rows.filter((r) => !r.ok).map((r) => r.index);
    const zeroDiagonal = rows.filter((r) => r.diag === 0).map((r) => r.index);
    const q = Math.max(...rows.map((r) => (r.diag === 0 ? Infinity : r.off / r.diag)));
    return { strict: violated.length === 0, rows, violated, zeroDiagonal, q };
  }

  return { checkDominance };
});
