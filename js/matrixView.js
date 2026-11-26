// Малювання розширеної матриці на кроці методу Гаусса.
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Slae = Object.assign(root.Slae || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const MONO = 'ui-monospace, "Ubuntu Mono", monospace';

  /** Короткий запис числа. Ненульове значення ніколи не показується як «0». */
  function short(v, digits) {
    if (v === 0) return '0';
    const abs = Math.abs(v);
    if (abs >= 1000 || abs < 0.5 * 10 ** -digits) return v.toExponential(0);
    return String(Number(v.toFixed(digits)));
  }

  class MatrixView {
    constructor(canvas) {
      this.canvas = canvas;
      this.step = null;
      if (root.ResizeObserver) new root.ResizeObserver(() => this.draw()).observe(canvas);
    }

    show(step) {
      this.step = step;
      this.draw();
    }

    /** Розмір клітинки обчислюється з полотна, тому матриця завжди вся на екрані. */
    draw() {
      const { ctx, w, h } = root.Slae.prepareCanvas(this.canvas);
      const step = this.step;
      if (!step || w < 40 || h < 40) return;
      const M = step.matrix;
      const n = M.length;
      const left = 28;
      const top = 22;
      const gap = 8; // проміжок перед стовпцем b
      const back = step.type === 'back';
      const xHeight = back ? 40 : 0;
      const cw = Math.min(90, (w - left - gap - 4) / (n + 1));
      const ch = Math.min(46, (h - top - xHeight - 8) / n);
      const cx = (j) => left + j * cw + (j === n ? gap : 0);
      const cy = (i) => top + i * ch;
      const numbers = cw >= 30 && ch >= 15;
      let max = 0;
      for (const row of M) for (let j = 0; j < n; j++) max = Math.max(max, Math.abs(row[j]));

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `11px ${MONO}`;
      ctx.fillStyle = '#5d6b80';
      for (let j = 0; j <= n; j++) ctx.fillText(j === n ? 'b' : String(j + 1), cx(j) + cw / 2, 10);
      for (let i = 0; i < n; i++) ctx.fillText(String(i + 1), 12, cy(i) + ch / 2);

      for (let i = 0; i < n; i++) {
        for (let j = 0; j <= n; j++) {
          const v = M[i][j];
          // Інтенсивність клітинки — модуль відносно найбільшого в матриці.
          const alpha = j < n && max > 0 ? Math.sqrt(Math.min(1, Math.abs(v) / max)) * 0.35 : 0.06;
          let fill = v === 0 ? '#f1f3f6' : `rgba(29, 95, 191, ${alpha.toFixed(3)})`;
          if (step.type === 'pivot' && j === step.k && i >= step.k) fill = '#ffe8a3';
          if ((step.type === 'pivot' || step.type === 'eliminate') && i === (step.type === 'pivot' ? step.row : step.k)) fill = '#ffe8a3';
          if (step.type === 'eliminate' && i === step.row) fill = j === step.k ? '#8fd6a4' : '#d4f1dc';
          if (step.type === 'swap' && (i === step.row || i === step.other)) fill = '#e4d4fb';
          if (back && i === step.row) fill = '#d4f1dc';
          const isPivot = (step.type === 'pivot' && i === step.row && j === step.k)
            || ((step.type === 'eliminate' || step.type === 'swap') && i === step.k && j === step.k)
            || (back && i === step.row && j === step.row);
          if (isPivot) fill = '#ff9f1c';
          ctx.fillStyle = fill;
          ctx.fillRect(cx(j), cy(i), cw - 1, ch - 1);
          if (isPivot) {
            ctx.strokeStyle = '#8a3b00';
            ctx.lineWidth = 2;
            ctx.strokeRect(cx(j) + 1, cy(i) + 1, cw - 3, ch - 3);
          }
          if (numbers) {
            ctx.fillStyle = v === 0 ? '#98a3b5' : '#172033';
            const size = Math.max(8, Math.min(14, cw / 5.2));
            ctx.font = `${isPivot ? 'bold ' : ''}${size}px ${MONO}`;
            ctx.fillText(short(v, cw >= 52 ? 3 : 1), cx(j) + cw / 2, cy(i) + ch / 2);
          }
        }
      }

      if (back) {
        const y = cy(n) + 12;
        ctx.font = `${Math.max(8, Math.min(13, cw / 5))}px ${MONO}`;
        ctx.fillStyle = '#5d6b80';
        ctx.fillText('x', 12, y + 10);
        for (let j = 0; j < n; j++) {
          const solved = j >= step.solvedFrom;
          ctx.fillStyle = solved ? '#d4f1dc' : '#f1f3f6';
          ctx.fillRect(cx(j), y, cw - 1, 22);
          ctx.fillStyle = '#172033';
          if (cw >= 18) ctx.fillText(solved ? short(step.x[j], cw >= 52 ? 3 : 0) : '?', cx(j) + cw / 2, y + 11);
        }
      }
    }
  }

  return { MatrixView, shortNumber: short };
});
