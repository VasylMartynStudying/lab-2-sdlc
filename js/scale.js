// Автомасштабування осей: програма сама визначає min і max за видимими даними.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Slae = Object.assign(root.Slae || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function extent(values) {
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
      if (!Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return min <= max ? { min, max } : null;
  }

  /** Лінійна вісь: min…max із відступом pad (частка розмаху). */
  function linearRange(values, pad = 0.08) {
    const e = extent(values);
    if (!e) return { min: -1, max: 1 };
    const maxAbs = Math.max(Math.abs(e.min), Math.abs(e.max));
    const span = e.max - e.min;
    // Розмах на рівні 1e-12 від масштабу значень — шум округлення, а не сигнал.
    if (span <= 1e-12 * Math.max(maxAbs, 1)) {
      const mid = maxAbs < 1e-12 ? 0 : (e.min + e.max) / 2;
      const half = Math.max(Math.abs(mid) * 0.5, 1);
      return { min: mid - half, max: mid + half };
    }
    return { min: e.min - span * pad, max: e.max + span * pad };
  }

  /**
   * Логарифмічна вісь: межі в показниках степеня 10, округлені до цілих декад.
   * Нулі та від’ємні значення логарифма не мають і в розрахунок не входять.
   */
  function logRange(values) {
    const e = extent(Array.from(values).filter((v) => v > 0));
    if (!e) return { min: -1, max: 1 };
    let min = Math.floor(Math.log10(e.min));
    let max = Math.ceil(Math.log10(e.max));
    if (min === max) {
      min -= 1;
      max += 1;
    }
    return { min, max };
  }

  /** Поділки з кроком 1, 2 або 5 · 10ᵏ. integer — лише цілі (номери). */
  function niceTicks(min, max, count = 6, integer = false) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min)) return [];
    const raw = (max - min) / Math.max(1, count - 1);
    const pow = 10 ** Math.floor(Math.log10(raw));
    const frac = raw / pow;
    let step = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10) * pow;
    if (integer) step = Math.max(1, Math.round(step));
    const ticks = [];
    const start = Math.ceil(min / step - 1e-9);
    for (let k = start; k * step <= max + step * 1e-6; k++) ticks.push(Number((k * step).toPrecision(12)));
    return ticks;
  }

  /** Показники степеня для підписів логарифмічної осі. */
  function logTicks(min, max, count = 8) {
    const step = Math.max(1, Math.ceil((max - min) / count));
    const ticks = [];
    for (let e = min; e <= max; e += step) ticks.push(e);
    return ticks;
  }

  /** Спільні межі для всіх серій вигляду { points: [[x, y], …] }. */
  function seriesBounds(series, options = {}) {
    const xs = [];
    const ys = [];
    for (const item of series) {
      for (const [x, y] of item.points) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        xs.push(x);
        ys.push(y);
      }
    }
    const x = linearRange(xs, options.padX ?? 0.03);
    const y = options.logY ? logRange(ys) : linearRange(ys, options.padY ?? 0.08);
    return { xMin: x.min, xMax: x.max, yMin: y.min, yMax: y.max };
  }

  return { extent, linearRange, logRange, niceTicks, logTicks, seriesBounds };
});
