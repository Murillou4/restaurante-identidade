import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultFields, estimate, ingredients, presets } from '../src/budgetCatalog.js';
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('cesta usa peso cru comprado da batata e não aumenta compra por perda do forno', () => {
  const result = estimate({ ...defaultFields, 'ingredients.batata.yieldPercent': 80 });
  const potato = result.rows.find((row) => row.id === 'batata');
  assert.equal(potato.purchaseQuantity, 450);
  close(potato.cost, 450 / 160 * 1.15);
});

test('todos os recheios dividem a mesma porção e o custo do queijo é adicional', () => {
  const values = { ...defaultFields, 'simulation.fillings': ['frango', 'bacon', 'calabresa'], 'simulation.cheeseId': 'nenhum', 'settings.greensGrams': 0, 'settings.saltGrams': 0, 'settings.oilMl': 0 };
  for (const item of ingredients) {
    values[`ingredients.${item.id}.price`] = 10;
    values[`ingredients.${item.id}.packageSize`] = 1000;
    values[`ingredients.${item.id}.yieldPercent`] = 100;
  }
  const plain = estimate(values);
  assert.deepEqual(plain.portions.map((portion) => portion.grams), [50, 50, 50]);
  close(plain.ingredientCost, 6);
  const cheese = estimate({ ...values, 'simulation.cheeseId': 'mucarela' });
  close(cheese.ingredientCost - plain.ingredientCost, 0.4);
});

test('embalagem entra uma vez e não recebe reserva de perda do ingrediente', () => {
  const withoutLoss = estimate({ ...defaultFields, 'settings.lossPercent': 0 });
  close(withoutLoss.packagingCost, 1.9769);
  close(withoutLoss.variableCost, withoutLoss.ingredientCost + 1.9769 + 0.8 + 2);
  const withLoss = estimate(defaultFields);
  close(withLoss.variableCost - withoutLoss.variableCost, withLoss.ingredientCost * 0.05);
});

test('combinações propostas têm cálculo válido e receita vazia bloqueia resultado completo', () => {
  for (const preset of presets) assert.equal(estimate(defaultFields, preset).valid, true, preset.name);
  const invalid = { ...defaultFields };
  for (const key of Object.keys(invalid)) if (key.startsWith('recipes.frango.')) invalid[key] = 0;
  assert.equal(estimate(invalid).valid, false);
  assert.ok(estimate(invalid).alerts.some((alert) => alert.message.includes('Frango')));
});

test('custos dos componentes somam apenas ingredientes e preservam o total da porção', () => {
  for (const preset of presets) {
    const result = estimate(defaultFields, preset);
    const base = Object.values(result.costs.base).reduce((sum, value) => sum + value, 0);
    close(base + result.costs.cheese + result.costs.fillingsTotal, result.ingredientCost);
    close(result.costs.fillings.reduce((sum, item) => sum + item.cost, 0), result.costs.fillingsTotal);
  }
  const regular = estimate(defaultFields);
  close(regular.fullCost, 16.37566837254902);
  const expensiveOperation = estimate({ ...defaultFields, 'settings.lossPercent': 40, 'settings.energyPerUnit': 8, 'settings.packagingPerUnit': 7, 'settings.laborPerUnit': 15, 'settings.fixedMonthly': 1000 });
  assert.deepEqual(expensiveOperation.costs, regular.costs);
  assert.ok(expensiveOperation.fullCost > regular.fullCost);
});

test('cobertura de requeijão não absorve o requeijão dentro do recheio', () => {
  const result = estimate({ ...defaultFields, 'simulation.cheeseId': 'requeijao' });
  close(result.costs.cheese, 40 / 180 * 8.99);
  const combined = result.rows.find((row) => row.id === 'requeijao');
  assert.equal(combined.quantity, 73);
  close(combined.cost - result.costs.cheese, 33 / 180 * 8.99);
  assert.ok(result.costs.fillings[0].cost > combined.cost - result.costs.cheese);
});

test('cobertura mista divide o peso e sem queijo ou quantidade zero custam zero', () => {
  const mixed = estimate({ ...defaultFields, 'simulation.cheeseId': 'misto' });
  close(mixed.costs.cheese, 20 / 500 * 24.99 + 20 / 1000 * 40);
  const noCheese = estimate({ ...defaultFields, 'simulation.cheeseId': 'nenhum' });
  assert.equal(noCheese.costs.cheese, 0);
  const zero = estimate({ ...defaultFields, 'settings.cheeseGrams': 0, 'settings.oilMl': 0, 'settings.saltGrams': 0, 'settings.greensGrams': 0, 'settings.palhaGrams': 0 });
  assert.equal(zero.costs.cheese, 0);
  for (const id of ['oleo', 'sal', 'cheiro-verde', 'batata-palha']) assert.equal(zero.costs.base[id], 0);
  assert.ok(zero.costs.fillingsTotal > 0);
});

test('três recheios custeiam sua parcela com preço editado e rendimento aplicado uma vez', () => {
  const values = { ...defaultFields, 'simulation.fillings': ['frango', 'bacon', 'calabresa'], 'simulation.cheeseId': 'nenhum' };
  for (const item of ingredients.filter((item) => item.type === 'food')) {
    values[`ingredients.${item.id}.price`] = 10;
    values[`ingredients.${item.id}.packageSize`] = 1000;
    values[`ingredients.${item.id}.yieldPercent`] = 100;
  }
  Object.assign(values, {
    'ingredients.frango.price': 20, 'ingredients.frango.yieldPercent': 50,
    'ingredients.bacon.price': 30, 'ingredients.bacon.yieldPercent': 75,
    'ingredients.calabresa.price': 40, 'ingredients.calabresa.yieldPercent': 80,
  });
  const result = estimate(values);
  assert.equal(result.valid, true);
  assert.deepEqual(result.costs.fillings.map(({ id, grams }) => ({ id, grams })), [{ id: 'frango', grams: 50 }, { id: 'bacon', grams: 50 }, { id: 'calabresa', grams: 50 }]);
  // Each cream's remaining ingredients cost R$ 10/kg with full yield.
  close(result.costs.fillings[0].cost, 35 / 0.5 / 1000 * 20 + 15 / 1000 * 10);
  close(result.costs.fillings[1].cost, 20 / 0.75 / 1000 * 30 + 30 / 1000 * 10);
  close(result.costs.fillings[2].cost, 37.5 / 0.8 / 1000 * 40 + 12.5 / 1000 * 10);
  close(result.costs.fillingsTotal, 4.65);
  close(result.ingredientCost, 4.59 + 4.65);
});

test('receita inválida mantém seu custo e o total dos recheios como null', () => {
  const empty = { ...defaultFields, 'simulation.fillings': ['frango', 'bacon'] };
  for (const key of Object.keys(empty)) if (key.startsWith('recipes.frango.')) empty[key] = 0;
  const result = estimate(empty);
  assert.equal(result.valid, false);
  assert.deepEqual(result.costs.fillings[0], { id: 'frango', grams: 75, cost: null });
  assert.ok(result.costs.fillings[1].cost > 0);
  assert.equal(result.costs.fillingsTotal, null);
  assert.ok(result.costs.base.batata > 0);
  const missing = estimate({ ...defaultFields, 'recipes.frango.frango': undefined });
  assert.equal(missing.costs.fillings[0].cost, null);
  assert.equal(missing.costs.fillingsTotal, null);
});

test('preço, quantidade ou rendimento inválidos não viram custos zero', () => {
  const invalidBase = estimate({ ...defaultFields, 'settings.potatoGrams': NaN });
  assert.equal(invalidBase.costs.base.batata, null);
  const invalidCheese = estimate({ ...defaultFields, 'simulation.cheeseId': 'misto', 'ingredients.cheddar.price': NaN });
  assert.equal(invalidCheese.costs.cheese, null);
  for (const changes of [{ 'ingredients.frango.price': NaN }, { 'ingredients.frango.yieldPercent': 0 }]) {
    const result = estimate({ ...defaultFields, ...changes });
    assert.equal(result.costs.fillings[0].cost, null);
    assert.equal(result.costs.fillingsTotal, null);
  }
  const missingSelection = estimate({ ...defaultFields, 'simulation.fillings': [] });
  assert.equal(missingSelection.costs.fillingsTotal, null);
  assert.deepEqual(missingSelection.costs.fillings, []);
});
