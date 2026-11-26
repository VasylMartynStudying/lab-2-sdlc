// Інтерфейс: зчитує параметри, викликає обчислювальні модулі, показує результати.
(function () {
  'use strict';

  const S = window.Slae;
  const $ = (id) => document.getElementById(id);
  const COLORS = { exact: '#111827', gauss: '#1d5fbf', jacobi: '#d9600a', seidel: '#17803d' };
  const NAMES = { gauss: 'Гаусс', jacobi: 'Якобі', seidel: 'Зейдель' };
  const MARKERS = { gauss: 'cross', jacobi: 'square', seidel: 'dot' };
  const STATUS = {
    direct: 'прямий метод',
    converged: 'збігся',
    maxIter: 'ліміт вичерпано',
    diverged: 'розбігся',
  };

  const state = { n: 5, d: 1, custom: false, tab: 'gauss', system: null, results: null };

  const solutionChart = new S.Chart($('solutionChart'), { xLabel: 'номер компоненти i', yLabel: 'xᵢ', integerX: true });
  const convergenceChart = new S.Chart($('convergenceChart'), {
    xLabel: 'номер ітерації k', yLabel: '‖Ax − b‖₂', logY: true, integerX: true,
    empty: 'Увімкніть метод Якобі або Зейделя',
  });
  const iterChart = new S.Chart($('iterChart'), { xLabel: 'номер компоненти i', yLabel: 'xᵢ⁽ᵏ⁾', integerX: true });
  const iterResidual = new S.Chart($('iterResidual'), { xLabel: 'номер ітерації k', yLabel: '‖Ax − b‖₂', logY: true, integerX: true });
  const matrixView = new S.MatrixView($('matrixCanvas'));
  const player = new S.Player(showFrame);

  const fmt = (v) => {
    if (v === null || v === undefined) return '—';
    if (!Number.isFinite(v)) return '∞';
    if (v === 0) return '0';
    const abs = Math.abs(v);
    const text = abs >= 1e5 || abs < 1e-3 ? v.toExponential(2) : String(Number(v.toPrecision(5)));
    return text.replace('.', ',');
  };
  const fmtFull = (v) => String(Number(v.toPrecision(12))).replace('.', ',');
  const parseNumber = (text) => (String(text).trim() === '' ? NaN : Number(String(text).trim().replace(',', '.')));
  const enabled = (id) => document.querySelector(`input[data-method="${id}"]`).checked;

  function message(type, text) {
    const p = document.createElement('p');
    p.className = `message ${type}`;
    p.textContent = text;
    $('messages').append(p);
  }

  function fillTable(table, head, rows) {
    table.textContent = '';
    const thead = table.createTHead().insertRow();
    for (const text of head) {
      const th = document.createElement('th');
      th.textContent = text;
      thead.append(th);
    }
    const body = table.createTBody();
    for (const row of rows) {
      const tr = body.insertRow();
      if (row.bad) tr.className = 'bad';
      for (const text of row.cells || row) tr.insertCell().textContent = text;
    }
  }

  function readOptions() {
    const eps = parseNumber($('eps').value);
    const maxIter = parseNumber($('maxIter').value);
    if (!(eps > 0) || !Number.isFinite(eps)) throw new Error('Точність ε має бути додатним числом, наприклад 1e-10.');
    if (!Number.isInteger(maxIter) || maxIter < 20000 || maxIter > 1000000) {
      throw new Error('Ліміт ітерацій має бути цілим від 20 000 до 1 000 000.');
    }
    return { eps, maxIter };
  }

  /** Показує помилку і прибирає результати, що вже не відповідають вводу. */
  function fail(err) {
    player.stop();
    state.system = null;
    state.results = null;
    $('messages').textContent = '';
    message('error', err.message);
    document.querySelector('.content').classList.add('invalid');
  }

  function markButtons() {
    for (const b of document.querySelectorAll('[data-n]')) {
      b.setAttribute('aria-pressed', String(!state.custom && Number(b.dataset.n) === state.n));
    }
    for (const b of document.querySelectorAll('[data-d]')) {
      b.setAttribute('aria-pressed', String(!state.custom && Number(b.dataset.d) === state.d));
    }
  }

  function loadVariant() {
    try {
      state.custom = false;
      const system = S.LinearSystem.fromVariant(state.n, state.d);
      $('matrix').value = system.toText();
      $('file').value = '';
      solve(system);
    } catch (err) {
      fail(err);
    }
    markButtons();
  }

  function loadText() {
    state.custom = true;
    markButtons();
    try {
      solve(S.LinearSystem.parse($('matrix').value));
    } catch (err) {
      fail(err);
    }
  }

  function loadDemo(kind) {
    const base = S.LinearSystem.fromVariant(state.n, state.d);
    const A = base.A.map((row) => row.slice());
    let b = base.b.slice();
    let exact = base.exact;
    if (kind === 'swap') {
      [A[0], A[1]] = [A[1], A[0]];
      [b[0], b[1]] = [b[1], b[0]];
    } else if (kind === 'zero') {
      A[0][0] = 0;
      b = S.matVec(A, exact);
    } else if (kind === 'singular') {
      A[1] = A[0].map((v) => 2 * v);
      b[1] = 2 * b[0];
      exact = null;
    } else {
      // Позадіагональні елементи вчетверо більші: переваги немає.
      for (let i = 0; i < base.n; i++) for (let j = 0; j < base.n; j++) if (i !== j) A[i][j] *= 4;
      b = S.matVec(A, exact);
    }
    $('matrix').value = new S.LinearSystem(A, b, exact).toText();
    loadText();
  }

  function solve(system) {
    const options = readOptions();
    const dominance = S.checkDominance(system.A);
    const { results, singular } = S.solveAll(system, options);
    state.system = system;
    state.results = results;
    state.dominance = dominance;
    state.options = options;

    $('messages').textContent = '';
    document.querySelector('.content').classList.remove('invalid');
    if (singular) message('error', results.gauss.message);
    if (!dominance.strict) {
      message('warn', `Немає строгої діагональної переваги (рядки: ${dominance.violated.join(', ')}). Збіжність методів Якобі та Зейделя не гарантована.`);
    }
    if (!singular) {
      for (const id of S.METHODS) {
        const r = results[id];
        if (!r.ok) message('error', r.message);
        else if (r.status === 'diverged') message('warn', `${NAMES[id]}: процес розбігся на ітерації ${r.iterations}.`);
        else if (r.status === 'maxIter') message('warn', `${NAMES[id]}: за ${r.iterations} ітерацій точність ε не досягнута.`);
      }
    }
    if (!system.exact) message('info', 'Точний розв’язок не задано: похибка ‖x − x*‖ не обчислюється.');
    render();
    loadAnimation();
  }

  function render() {
    const { system, results, dominance } = state;
    if (!system) return;
    $('title').textContent = state.custom
      ? `Результати: введена система, n = ${system.n}`
      : `Результати: варіант 3, n = ${system.n}, d = ${fmt(state.d)}`;

    fillTable($('metrics'), ['Метод', 'Стан', 'Ітерацій', '‖Ax − b‖₂', '‖x − x*‖₂', 'Час, мс'],
      S.METHODS.map((id) => {
        const r = results[id];
        if (!r.ok) return { bad: true, cells: [NAMES[id], 'не виконано', '—', '—', '—', '—'] };
        return {
          bad: r.status === 'diverged' || r.status === 'maxIter',
          cells: [NAMES[id], STATUS[r.status], r.iterations ?? '—', fmt(r.residual), fmt(r.error), fmt(r.timeMs)],
        };
      }));

    const visible = S.METHODS.filter((id) => enabled(id) && results[id].ok);
    // Розв’язок після розбіжності має порядок 10¹⁰⁰ і сховав би всі інші криві.
    const plotted = visible.filter((id) => results[id].status !== 'diverged');
    const index = (x) => x.map((v, i) => [i + 1, v]);
    const series = [];
    if (system.exact) series.push({ label: 'точний x*', color: COLORS.exact, points: index(system.exact), marker: 'ring', width: 1 });
    for (const id of plotted) {
      series.push({
        label: NAMES[id], color: COLORS[id], points: index(results[id].x), marker: MARKERS[id],
        dash: id === 'gauss' ? [] : id === 'jacobi' ? [8, 6] : [2, 5],
      });
    }
    solutionChart.setSeries(series);
    convergenceChart.setSeries(visible.filter((id) => id !== 'gauss').map((id) => ({
      label: NAMES[id], color: COLORS[id], marker: MARKERS[id], size: 3,
      points: results[id].residuals.map((v, k) => [k, v]),
    })));

    const ids = S.METHODS.filter((id) => enabled(id) && results[id].ok);
    const head = ['i', ...(system.exact ? ['x*'] : []), ...ids.map((id) => NAMES[id])];
    fillTable($('solution'), head, Array.from({ length: system.n }, (_, i) => [
      i + 1,
      ...(system.exact ? [fmtFull(system.exact[i])] : []),
      ...ids.map((id) => (Math.abs(results[id].x[i]) > 1e15 ? fmt(results[id].x[i]) : fmtFull(results[id].x[i]))),
    ]));

    let summary = `${dominance.strict ? 'Строга діагональна перевага є' : 'Строгої діагональної переваги немає'}; q = ‖B‖∞ = ${fmt(dominance.q)}.`;
    if (!dominance.zeroDiagonal.length && !results.gauss.message) {
      summary += ` Спектральний радіус: Якобі ≈ ${fmt(S.spectralRadius(system, 'jacobi'))}, Зейдель ≈ ${fmt(S.spectralRadius(system, 'seidel'))}.`;
    }
    $('dominanceSummary').textContent = summary;
    fillTable($('dominance'), ['Рядок', '|aᵢᵢ|', 'Σ|aᵢⱼ|, j ≠ i', 'Запас', 'Умова'],
      dominance.rows.map((r) => ({ bad: !r.ok, cells: [r.index, fmt(r.diag), fmt(r.off), fmt(r.margin), r.ok ? 'так' : 'ні'] })));
  }

  // ---------- Анімація ----------

  function loadAnimation(frame = 0) {
    // Спочатку відкидаються старі кадри: вони можуть належати іншій вкладці.
    state.frames = null;
    player.stop();
    for (const b of document.querySelectorAll('[data-tab]')) {
      b.setAttribute('aria-pressed', String(b.dataset.tab === state.tab));
    }
    const gauss = state.tab === 'gauss';
    $('gaussView').hidden = !gauss;
    $('iterView').hidden = gauss;
    const r = state.results && state.results[state.tab];
    if (r && r.ok) {
      if (gauss) {
        // Кроки з матрицями записуються лише для анімації, не під час вимірювання.
        state.frames = new S.GaussSolver().solve(state.system, { record: true }).steps;
      } else {
        state.frames = r.history;
      }
    }
    const count = state.frames ? state.frames.length : 0;
    for (const id of ['play', 'prev', 'next', 'seek']) $(id).disabled = count < 2;
    $('seek').max = String(Math.max(0, count - 1));
    if (!count) {
      $('caption').textContent = r ? r.message : '';
      matrixView.show(null);
      iterChart.setSeries([]);
      iterResidual.setSeries([]);
      player.count = 0;
      return;
    }
    player.load(count, frame);
  }

  function gaussCaption(step) {
    const k = step.k + 1;
    switch (step.type) {
      case 'start': return 'Початкова розширена матриця [A | b].';
      case 'pivot': return `Стовпець ${k}: найбільший за модулем елемент — у рядку ${step.row + 1}, значення ${fmt(step.value)}.`;
      case 'swap': return `Переставлено рядки ${step.row + 1} і ${step.other + 1}: головний елемент тепер на діагоналі.`;
      case 'eliminate': return `Рядок ${step.row + 1} − (${fmt(step.factor)}) · рядок ${k}: обнулено елемент у стовпці ${k}.`;
      default: return `Зворотний хід: x${step.row + 1} = ${fmt(step.x[step.row])}.`;
    }
  }

  function showFrame(index, playing) {
    $('play').textContent = playing ? 'Пауза' : 'Пуск';
    $('seek').value = String(index);
    if (!state.frames) return;
    const prefix = `Кадр ${index + 1} / ${state.frames.length}. `;
    if (state.tab === 'gauss') {
      const step = state.frames[index];
      matrixView.show(step);
      $('caption').textContent = prefix + gaussCaption(step);
      return;
    }
    const id = state.tab;
    const r = state.results[id];
    const x = state.frames[index];
    const series = [];
    if (state.system.exact) {
      series.push({ label: 'точний x*', color: COLORS.exact, marker: 'ring', width: 1, points: state.system.exact.map((v, i) => [i + 1, v]) });
    }
    series.push({ label: `${NAMES[id]}, k = ${index}`, color: COLORS[id], marker: MARKERS[id], points: x.map((v, i) => [i + 1, v]) });
    iterChart.setSeries(series); // межі осей перераховуються на кожному кадрі
    iterResidual.setSeries([{
      label: `${NAMES[id]}, ‖Ax − b‖₂`, color: COLORS[id], marker: MARKERS[id], size: 3,
      points: r.residuals.slice(0, index + 1).map((v, k) => [k, v]),
    }]);
    $('caption').textContent = `${prefix}Ітерація ${index}: ‖Ax − b‖₂ = ${fmt(r.residuals[index])}.`;
  }

  // ---------- Події ----------

  for (const b of document.querySelectorAll('[data-n]')) {
    b.addEventListener('click', () => {
      state.n = Number(b.dataset.n);
      loadVariant();
    });
  }
  for (const b of document.querySelectorAll('[data-d]')) {
    b.addEventListener('click', () => {
      state.d = Number(b.dataset.d);
      $('customD').value = '';
      loadVariant();
    });
  }
  $('customD').addEventListener('change', () => {
    const d = parseNumber($('customD').value);
    if (!(d > 0) || !Number.isFinite(d)) {
      fail(new Error('d має бути додатним числом.'));
      return;
    }
    state.d = d;
    loadVariant();
  });
  for (const id of ['eps', 'maxIter']) {
    $(id).addEventListener('change', () => (state.custom ? loadText() : loadVariant()));
  }
  for (const box of document.querySelectorAll('[data-method]')) box.addEventListener('change', render);
  $('solveText').addEventListener('click', loadText);
  $('reset').addEventListener('click', loadVariant);
  $('file').addEventListener('change', async () => {
    const file = $('file').files[0];
    if (!file) return;
    try {
      if (file.size > 200000) throw new Error('Файл завеликий для матриці до 50 × 50.');
      $('matrix').value = await file.text();
      loadText();
    } catch (err) {
      fail(err);
    }
    $('file').value = ''; // той самий файл можна вибрати повторно
  });
  for (const b of document.querySelectorAll('[data-demo]')) b.addEventListener('click', () => loadDemo(b.dataset.demo));

  for (const b of document.querySelectorAll('[data-tab]')) {
    b.addEventListener('click', () => {
      state.tab = b.dataset.tab;
      loadAnimation();
    });
  }
  $('play').addEventListener('click', () => player.toggle());
  $('prev').addEventListener('click', () => { player.stop(); player.seek(player.index - 1); });
  $('next').addEventListener('click', () => { player.stop(); player.seek(player.index + 1); });
  $('seek').addEventListener('input', () => { player.stop(); player.seek(Number($('seek').value)); });
  $('speed').addEventListener('change', () => { player.speed = Number($('speed').value); });

  $('compare').addEventListener('click', () => {
    try {
      const rows = S.compareSizes(readOptions());
      fillTable($('summary'), ['d', 'n', 'Метод', 'Ітерацій', '‖Ax − b‖₂', '‖x − x*‖₂', 'Час, мс'],
        rows.map((r) => [fmt(r.d), r.n, r.name, r.iterations ?? '—', fmt(r.residual), fmt(r.error), fmt(r.timeMs)]));
    } catch (err) {
      fail(err);
    }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
    if (ev.target.matches('textarea, select, input:not([type="checkbox"]):not([type="range"])')) return;
    const sizes = { 1: 5, 2: 10, 3: 20 };
    if (sizes[ev.key]) {
      state.n = sizes[ev.key];
      loadVariant();
    }
  });

  // Параметри адреси задають початковий стан: ?n=20&d=0.1&demo=swap&tab=jacobi&frame=5
  const query = new URLSearchParams(location.search);
  if (query.has('n')) state.n = Number(query.get('n'));
  if (query.has('d')) state.d = Number(query.get('d'));
  if (['gauss', 'jacobi', 'seidel'].includes(query.get('tab'))) state.tab = query.get('tab');
  loadVariant();
  if (query.has('demo')) loadDemo(query.get('demo'));
  if (query.has('frame')) player.seek(Number(query.get('frame')));
})();
