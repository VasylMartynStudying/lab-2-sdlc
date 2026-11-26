"""Незалежна перевірка результатів бібліотекою numpy (лише для перевірки).

Спочатку: npm run metrics
Потім:    python3 scripts/verify.py
"""
import json
from pathlib import Path

import numpy as np

data = json.loads((Path(__file__).parent.parent / "docs" / "results.json").read_text())
failed = False
print("d    n   матриця  b         |x-numpy| Гаусс  Якобі     Зейдель   rho J (numpy/JS)  rho GS (numpy/JS)")
for case in data["solutions"]:
    n, d = case["n"], case["d"]
    # Система будується заново, незалежно від коду JavaScript.
    i, j = np.indices((n, n)) + 1
    A = np.exp(-((i - j) ** 2.0))
    np.fill_diagonal(A, 0)
    np.fill_diagonal(A, A.sum(axis=1) + d)
    exact = (-1.0) ** np.arange(1, n + 1) * np.arange(1, n + 1)
    b = A @ exact
    ref = np.linalg.solve(A, b)
    errors = {k: np.max(np.abs(np.array(v) - ref)) for k, v in case["x"].items()}
    D = np.diag(np.diag(A))
    L, U = np.tril(A, -1), np.triu(A, 1)
    radius = lambda M: max(abs(np.linalg.eigvals(M)))
    rj = radius(-np.linalg.solve(D, L + U))
    rs = radius(-np.linalg.solve(D + L, U))
    dA = np.max(np.abs(A - np.array(case["A"])))
    db = np.max(np.abs(b - np.array(case["b"])))
    print(f"{d:<4} {n:<3} {dA:.1e}  {db:.1e}   {errors['gauss']:.1e}          "
          f"{errors['jacobi']:.1e}   {errors['seidel']:.1e}   "
          f"{rj:.4f}/{case['rho']['jacobi']:.4f}     {rs:.4f}/{case['rho']['seidel']:.4f}")
    failed |= max(dA, db) > 1e-12 or errors["gauss"] > 1e-11 or max(errors.values()) > 1e-8
    failed |= abs(rj - case["rho"]["jacobi"]) > 0.005 or abs(rs - case["rho"]["seidel"]) > 0.005

print("ПЕРЕВІРКУ НЕ ПРОЙДЕНО" if failed else "Перевірку пройдено.")
raise SystemExit(failed)
