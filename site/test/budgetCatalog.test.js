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
