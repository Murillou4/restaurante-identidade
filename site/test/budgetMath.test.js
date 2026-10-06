import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBudget, distributeFillings } from '../src/budgetMath.js';

const zeroExtras = {
  lossPercent: 0, energyPerUnit: 0, packagingPerUnit: 0, laborPerUnit: 0,
  deliverySubsidy: 0, fixedMonthly: 0, unitsMonthly: 100,
  taxPercent: 0, feePercent: 0, targetMarginPercent: 0, chosenPrice: 20,
};
const oneRealRow = { id: 'base', name: 'Insumo', quantity: 100, unitPrice: 10, unit: 'g' };
const near = (actual, expected, tolerance = 1e-10) => {
  assert.equal(typeof actual, 'number');
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
};

test('manual scenario: ingredients, reserve, extras, taxes and fixed costs are counted once', () => {
  const result = calculateBudget({
    rows: [
      { id: 'potato', quantity: 500, unitPrice: 4, unit: 'g' },
      { id: 'filling', quantity: 100, unitPrice: 40, unit: 'g' },
      { id: 'cheese', quantity: 50, unitPrice: 20, unit: 'g' },
    ],
    settings: {
      lossPercent: 10, energyPerUnit: 1, packagingPerUnit: 2, laborPerUnit: 3,
      deliverySubsidy: 1, fixedMonthly: 100, unitsMonthly: 100,
      taxPercent: 5, feePercent: 5, targetMarginPercent: 20, chosenPrice: 30,
    },
  });
  assert.equal(result.valid, true);
  near(result.ingredientCost, 7);
  near(result.lossCost, 0.7);
  near(result.variableCost, 14.7);
  near(result.fixedCostPerUnit, 1);
  near(result.fullCost, 15.7);
  near(result.percentRate, 0.1);
  near(result.suggestedPrice, 15.7 / 0.7);
  near(result.taxCost, 1.5);
  near(result.feeCost, 1.5);
  near(result.totalPercentCost, 3);
  near(result.contribution, 12.3);
  near(result.contributionMarginPercent, 41);
  near(result.netUnit, 11.3);
  near(result.netMonthly, 1130);
  assert.equal(result.breakEvenUnits, 9);
});

test('yield adjusts net quantity once, with kg, liter and unit prices converted correctly', () => {
  const result = calculateBudget({
    rows: [
      { id: 'meat', quantity: 100, unitPrice: 40, unit: 'g', yieldPercent: 50 },
      { id: 'oil', quantity: 50, unitPrice: 10, unit: 'ml' },
      { id: 'box', quantity: 1, unitPrice: 2, unit: 'un' },
    ],
    settings: zeroExtras,
  });
  assert.equal(result.valid, true);
  near(result.rows[0].purchaseQuantity, 200);
  near(result.rows[0].cost, 8);
  near(result.rows[1].cost, 0.5);
  near(result.rows[2].cost, 2);
  near(result.ingredientCost, 10.5);
  near(result.suggestedPrice, 10.5);
});

test('intermediate money is not truncated to cents', () => {
  const result = calculateBudget({
    rows: [
      { id: 'a', quantity: 1, unitPrice: 1, unit: 'g' },
      { id: 'b', quantity: 1, unitPrice: 0.33333, unit: 'ml' },
    ],
    settings: { ...zeroExtras, lossPercent: 8 },
  });
  near(result.ingredientCost, 0.00133333);
  near(result.lossCost, 0.0001066664);
  near(result.variableCost, 0.0014399964);
  assert.notEqual(result.variableCost, 0);
});

test('desired margin uses sale price as its denominator, not markup over cost', () => {
  const result = calculateBudget({ rows: [{ ...oneRealRow, quantity: 1000 }], settings: { ...zeroExtras, targetMarginPercent: 25 } });
  near(result.fullCost, 10);
  near(result.suggestedPrice, 10 / 0.75);
  near((result.suggestedPrice - result.fullCost) / result.suggestedPrice, 0.25);
  assert.notEqual(result.suggestedPrice, 12.5);
});

test('invalid price denominator has a useful alert and no fabricated suggested price', () => {
  const result = calculateBudget({ rows: [oneRealRow], settings: { ...zeroExtras, taxPercent: 30, feePercent: 30, targetMarginPercent: 40 } });
  assert.equal(result.valid, false);
  assert.equal(result.suggestedPrice, null);
  assert.ok(result.alerts.some((alert) => alert.code === 'PRICE_DENOMINATOR'));
  near(result.fullCost, 1);
  near(result.totalPercentCost, 12);
  near(result.contribution, 7);
  const floatingBoundary = calculateBudget({ rows: [oneRealRow], settings: { ...zeroExtras, taxPercent: 58, targetMarginPercent: 42 } });
  assert.equal(floatingBoundary.valid, false);
  assert.equal(floatingBoundary.suggestedPrice, null);
});

test('invalid ingredient inputs cannot silently understate the budget', () => {
  for (const override of [{ quantity: -1 }, { unitPrice: Infinity }, { unit: 'kg' }, { yieldPercent: 0 }, { yieldPercent: 101 }]) {
    const result = calculateBudget({ rows: [{ ...oneRealRow, ...override }], settings: zeroExtras });
    assert.equal(result.valid, false);
    assert.equal(result.ingredientCost, null);
    assert.equal(result.fullCost, null);
    assert.equal(result.suggestedPrice, null);
  }
  const missing = calculateBudget({ rows: [], settings: zeroExtras });
  assert.equal(missing.valid, false);
  assert.equal(missing.ingredientCost, null);
});

test('settings validate monthly quantity, numeric type and percentages', () => {
  for (const unitsMonthly of [0, -1, 1.5, NaN]) {
    const result = calculateBudget({ rows: [oneRealRow], settings: { ...zeroExtras, unitsMonthly } });
    assert.equal(result.valid, false);
    assert.equal(result.fixedCostPerUnit, null);
    assert.equal(result.netMonthly, null);
  }
  for (const chosenPrice of [NaN, Infinity, -1, '25']) {
    const result = calculateBudget({ rows: [oneRealRow], settings: { ...zeroExtras, chosenPrice } });
    assert.equal(result.valid, false);
    assert.equal(result.chosenPrice, null);
    assert.equal(result.contribution, null);
  }
  assert.equal(calculateBudget({ rows: [oneRealRow], settings: { ...zeroExtras, feePercent: 101 } }).valid, false);
  assert.equal(calculateBudget({ rows: [oneRealRow], settings: { ...zeroExtras, lossPercent: -1 } }).valid, false);
});

test('nonpositive contribution cannot produce a break-even point', () => {
  for (const chosenPrice of [0, 1]) {
    const result = calculateBudget({ rows: [oneRealRow], settings: { ...zeroExtras, chosenPrice, fixedMonthly: 100 } });
    assert.equal(result.valid, true);
    assert.equal(result.breakEvenUnits, null);
    assert.ok(result.alerts.some((alert) => alert.code === 'NONPOSITIVE_CONTRIBUTION'));
    assert.ok(result.alerts.some((alert) => alert.code === 'NEGATIVE_MONTHLY_RESULT'));
    if (chosenPrice === 0) assert.equal(result.contributionMarginPercent, null);
  }
});

test('break-even integer avoids an extra portion caused only by floating-point noise', () => {
  const row = { id: 'a', quantity: 0, unitPrice: 0, unit: 'g' };
  const result = calculateBudget({ rows: [row], settings: { ...zeroExtras, fixedMonthly: 0.07, chosenPrice: 0.01 } });
  assert.equal(result.breakEvenUnits, 7);
  const above = calculateBudget({ rows: [row], settings: { ...zeroExtras, fixedMonthly: 0.0700001, chosenPrice: 0.01 } });
  assert.equal(above.breakEvenUnits, 8);
  const noFixedCosts = calculateBudget({ rows: [row], settings: zeroExtras });
  assert.equal(noFixedCosts.breakEvenUnits, 0);
});

test('one, two and three fillings share one total rather than multiplying it', () => {
  for (const [ids, amount] of [[['a'], 150], [['a', 'b'], 75], [['a', 'b', 'c'], 50]]) {
    const result = distributeFillings(ids);
    assert.equal(result.valid, true);
    assert.equal(result.totalGrams, 150);
    assert.deepEqual(result.portions.map((portion) => portion.grams), ids.map(() => amount));
  }
  const split = distributeFillings(['a', 'b'], 150, { a: 50, b: 100, oldUnselectedRecipe: 999 });
  assert.equal(split.valid, true);
  assert.deepEqual(split.portions, [{ id: 'a', grams: 50 }, { id: 'b', grams: 100 }]);
});

test('custom filling totals, IDs and counts are validated instead of silently adjusted', () => {
  const cases = [
    [[], 150, {}],
    [['a', 'b', 'c', 'd'], 150, {}],
    [['a', 'a'], 150, {}],
    [['a'], 0, {}],
    [['a', 'b'], 150, { a: 50 }],
    [['a', 'b'], 150, { a: 50, b: 99 }],
    [['a', 'b'], 150, { a: -1, b: 151 }],
    [['a'], 150, null],
  ];
  for (const args of cases) {
    const result = distributeFillings(...args);
    assert.equal(result.valid, false);
    assert.equal(result.totalGrams, null);
    assert.ok(result.alerts.length > 0);
  }
});

test('combination portions price one 150g filling and separate cheese', () => {
  const split = distributeFillings(['a', 'b', 'c']);
  const prices = { a: 10, b: 20, c: 30 };
  const rows = split.portions.map(({ id, grams }) => ({ id, quantity: grams, unitPrice: prices[id], unit: 'g' }));
  rows.push({ id: 'cheese', quantity: 40, unitPrice: 25, unit: 'g' });
  const result = calculateBudget({ rows, settings: zeroExtras });
  near(result.ingredientCost, 4);
  assert.equal(rows.slice(0, 3).reduce((total, row) => total + row.quantity, 0), 150);
});

test('input objects remain unchanged and overflowing costs fail explicitly', () => {
  const input = { rows: [oneRealRow], settings: { ...zeroExtras } };
  const original = structuredClone(input);
  calculateBudget(input);
  assert.deepEqual(input, original);
  const result = calculateBudget({ rows: [{ ...oneRealRow, quantity: 1e308, unitPrice: 1e308 }], settings: zeroExtras });
  assert.equal(result.valid, false);
  assert.equal(result.ingredientCost, null);
  assert.ok(result.alerts.some((alert) => alert.code === 'CALCULATION_RANGE'));
});
