// Лінійний графік на Canvas 2D з автомасштабом і, за потреби, логарифмічною віссю Y.
(function (root, factory) {
  const api = factory(root);
  root.Slae = Object.assign(root.Slae || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const FONT = '"Segoe UI", Ubuntu, Cantarell, "Noto Sans", sans-serif';
  const SUPERSCRIPT = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

  function power10(e) {
    return '10' + String(e).split('').map((c) => SUPERSCRIPT[c]).join('');
  }

  function formatTick(v) {
    const abs = Math.abs(v);
    if (abs !== 0 && (abs >= 1e5 || abs < 1e-3)) return v.toExponential(1);
    return String(Number(v.toPrecision(6)));
  }

  /** Підготовка полотна з урахуванням щільності пікселів. */
  function prepareCanvas(canvas) {
    const dpr = root.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    const w = Math.round(width * dpr);
    const h = Math.round(height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    return { ctx, w: width, h: height };
  }

  class Chart {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.options = options; // { xLabel, yLabel, logY, integerX, empty }
      this.series = [];
      if (root.ResizeObserver) new root.ResizeObserver(() => this.draw()).observe(canvas);
    }

    /** series: [{ label, color, points, dash, marker, line, size }] */
    setSeries(series) {
      this.series = series;
      this.draw();
    }

    draw() {
      const { ctx, w, h } = prepareCanvas(this.canvas);
      if (w < 60 || h < 60) return;
      ctx.font = `13px ${FONT}`;
      const series = this.series.filter((s) => s.points.length);
      if (!series.length) {
        ctx.fillStyle = '#5d6b80';
        ctx.textAlign = 'center';
        ctx.fillText(this.options.empty || 'Немає даних для графіка', w / 2, h / 2);
        return;
      }
      const { logY, integerX, xLabel, yLabel } = this.options;
      const b = root.Slae.seriesBounds(series, { logY });

      // Легенда з перенесенням рядків.
      let lx = 12;
      let ly = 16;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (const s of series) {
        const width = 30 + ctx.measureText(s.label).width + 14;
        if (lx + width > w && lx > 12) {
          lx = 12;
          ly += 20;
        }
        this._stroke(ctx, s, [[lx, ly], [lx + 24, ly]]);
        if (s.marker) this._marker(ctx, s, lx + 12, ly);
        ctx.fillStyle = '#172033';
        ctx.fillText(s.label, lx + 30, ly);
        lx += width;
      }

      const plot = { x: 70, y: ly + 18, w: w - 86, h: h - ly - 66 };
      const sx = (x) => plot.x + ((x - b.xMin) / (b.xMax - b.xMin)) * plot.w;
      const toAxis = (y) => (logY ? (y > 0 ? Math.log10(y) : b.yMin) : y);
      const sy = (y) => plot.y + plot.h - ((toAxis(y) - b.yMin) / (b.yMax - b.yMin)) * plot.h;

      ctx.strokeStyle = '#e1e7f0';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#42506a';
      const yTicks = logY ? root.Slae.logTicks(b.yMin, b.yMax) : root.Slae.niceTicks(b.yMin, b.yMax, 6);
      ctx.textAlign = 'right';
      for (const t of yTicks) {
        const py = plot.y + plot.h - ((t - b.yMin) / (b.yMax - b.yMin)) * plot.h;
        ctx.beginPath();
        ctx.moveTo(plot.x, py);
        ctx.lineTo(plot.x + plot.w, py);
        ctx.stroke();
        ctx.fillText(logY ? power10(t) : formatTick(t), plot.x - 8, py);
      }
      ctx.textAlign = 'center';
      const xCount = Math.max(3, Math.min(12, Math.floor(plot.w / 60)));
      for (const t of root.Slae.niceTicks(b.xMin, b.xMax, xCount, integerX)) {
        ctx.beginPath();
        ctx.moveTo(sx(t), plot.y);
        ctx.lineTo(sx(t), plot.y + plot.h);
        ctx.stroke();
        ctx.fillText(formatTick(t), sx(t), plot.y + plot.h + 14);
      }
      ctx.strokeStyle = '#8a97ab';
      ctx.strokeRect(plot.x, plot.y, plot.w, plot.h);
      ctx.fillStyle = '#172033';
      ctx.fillText(xLabel || '', plot.x + plot.w / 2, h - 10);
      ctx.save();
      ctx.translate(13, plot.y + plot.h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(yLabel || '', 0, 0);
      ctx.restore();

      for (const s of series) {
        // Дуже довгі ряди проріджуються: на піксель досить кількох точок.
        const stride = Math.max(1, Math.floor(s.points.length / (plot.w * 3)));
        const points = [];
        for (let i = 0; i < s.points.length; i += stride) points.push(s.points[i]);
        if (stride > 1) points.push(s.points[s.points.length - 1]);
        const pixels = points.map(([x, y]) => (Number.isFinite(y) ? [sx(x), sy(y)] : null));
        if (s.line !== false) this._stroke(ctx, s, pixels);
        if (s.marker && points.length <= 80) {
          for (const p of pixels) if (p) this._marker(ctx, s, p[0], p[1]);
        }
      }
    }

    _stroke(ctx, s, pixels) {
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width || 2;
      ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      let pen = false;
      for (const p of pixels) {
        if (!p) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
        pen = true;
      }
      ctx.stroke();
      ctx.restore();
    }

    /** Різні форми маркерів, щоб збіжні криві залишались розрізнюваними. */
    _marker(ctx, s, x, y) {
      const r = s.size || 4;
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      if (s.marker === 'dot') {
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
      } else if (s.marker === 'ring') {
        ctx.arc(x, y, r + 2.5, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (s.marker === 'square') {
        ctx.strokeRect(x - r - 0.5, y - r - 0.5, 2 * r + 1, 2 * r + 1);
      } else {
        ctx.moveTo(x - r, y - r);
        ctx.lineTo(x + r, y + r);
        ctx.moveTo(x - r, y + r);
        ctx.lineTo(x + r, y - r);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  return { Chart, prepareCanvas, formatTick };
});
