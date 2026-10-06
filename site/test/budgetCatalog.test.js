import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultFields, estimate, getIngredientPriceEdit, ingredientValues, ingredients, presets } from '../src/budgetCatalog.js';
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

test('leitura por kg preserva a referência antiga da batata de R$ 1,15 por 160 g', () => {
  const potato = ingredients.find((item) => item.id === 'batata');
  const before = structuredClone(defaultFields);
  const data = ingredientValues(potato, defaultFields);
  close(data.unitPrice, 7.1875);
  assert.equal(data.price, 1.15);
  assert.equal(data.packageSize, 160);
  close(estimate(defaultFields).costs.base.batata, 3.234375);
  assert.deepEqual(defaultFields, before);
});

test('editar preço por kg da batata altera preço e base juntos e custa R$ 2,6955 por 450 g', () => {
  const potato = ingredients.find((item) => item.id === 'batata');
  const changes = getIngredientPriceEdit(potato, 5.99);
  assert.deepEqual(changes, { 'ingredients.batata.price': 5.99, 'ingredients.batata.packageSize': 1000 });
  const values = { ...defaultFields, ...changes };
  close(ingredientValues(potato, values).unitPrice, 5.99);
  close(estimate(values).costs.base.batata, 2.6955);
  assert.equal(defaultFields['ingredients.batata.packageSize'], 160);
  assert.equal(potato.price, 1.15);
});

test('editar óleo por litro normaliza 1000 ml e custa R$ 0,05 em 5 ml', () => {
  const oil = ingredients.find((item) => item.id === 'oleo');
  const changes = getIngredientPriceEdit(oil, 10);
  assert.deepEqual(changes, { 'ingredients.oleo.price': 10, 'ingredients.oleo.packageSize': 1000 });
  const values = { ...defaultFields, ...changes };
  close(ingredientValues(oil, values).unitPrice, 10);
  close(estimate(values).costs.base.oleo, 0.05);
});

test('embalagem por unidade mantém a quantidade de dois guardanapos por pedido', () => {
  const napkin = ingredients.find((item) => item.id === 'guardanapo');
  const original = ingredientValues(napkin, defaultFields);
  close(original.unitPrice, 0.056);
  assert.equal(original.amount, 2);
  const changes = getIngredientPriceEdit(napkin, 0.1);
  assert.deepEqual(changes, { 'ingredients.guardanapo.price': 0.1, 'ingredients.guardanapo.packageSize': 1 });
  assert.equal(Object.hasOwn(changes, 'ingredients.guardanapo.amount'), false);
  const result = estimate({ ...defaultFields, ...changes });
  const edited = result.packaging.find((item) => item.id === 'guardanapo');
  assert.equal(edited.amount, 2);
  close(edited.unitPrice * edited.amount, 0.2);
  close(result.packagingCost, 2.0649);
});

test('muçarela de 500 g por R$ 24,99 aparece como R$ 49,98/kg sem mudar o custo', () => {
  const cheese = ingredients.find((item) => item.id === 'mucarela');
  const before = estimate(defaultFields);
  const unitPrice = ingredientValues(cheese, defaultFields).unitPrice;
  close(unitPrice, 49.98);
  assert.equal(defaultFields['ingredients.mucarela.packageSize'], 500);
  const values = { ...defaultFields, ...getIngredientPriceEdit(cheese, unitPrice) };
  assert.equal(values['ingredients.mucarela.packageSize'], 1000);
  close(estimate(values).costs.cheese, 1.9992);
  close(estimate(values).fullCost, before.fullCost);
});

test('salvar e reabrir preços normalizados mantém os custos e aceita caderno com bases antigas e novas', () => {
  const before = estimate(defaultFields);
  const changes = Object.assign({}, ...ingredients.map((item) => getIngredientPriceEdit(item, ingredientValues(item, defaultFields).unitPrice)));
  const reopened = JSON.parse(JSON.stringify({ ...defaultFields, ...changes }));
  const after = estimate(reopened);
  assert.equal(after.valid, true);
  close(after.ingredientCost, before.ingredientCost);
  close(after.packagingCost, before.packagingCost);
  close(after.fullCost, before.fullCost);
  close(after.suggestedPrice, before.suggestedPrice);
  for (const item of ingredients) {
    assert.equal(reopened[`ingredients.${item.id}.packageSize`], item.unit === 'un' ? 1 : 1000);
    close(ingredientValues(item, reopened).unitPrice, ingredientValues(item, defaultFields).unitPrice);
  }
  const potato = ingredients.find((item) => item.id === 'batata');
  const mixed = JSON.parse(JSON.stringify({ ...defaultFields, ...getIngredientPriceEdit(potato, 5.99) }));
  assert.equal(mixed['ingredients.batata.packageSize'], 1000);
  assert.equal(mixed['ingredients.mucarela.packageSize'], 500);
  assert.equal(mixed['ingredients.oleo.packageSize'], 900);
  assert.equal(mixed['ingredients.guardanapo.packageSize'], 50);
  close(estimate(mixed).costs.base.batata, 2.6955);
  close(estimate(mixed).costs.cheese, before.costs.cheese);
  close(estimate(mixed).packagingCost, before.packagingCost);
});

test('edição de preço aceita zero e limite do backend sem arredondar e rejeita números inválidos', () => {
  const potato = ingredients.find((item) => item.id === 'batata');
  for (const price of [0, 0.123456789, 10000000]) {
    const changes = getIngredientPriceEdit(potato, price);
    assert.equal(changes['ingredients.batata.price'], price);
    assert.equal(changes['ingredients.batata.packageSize'], 1000);
  }
  assert.equal(estimate({ ...defaultFields, ...getIngredientPriceEdit(potato, 0) }).costs.base.batata, 0);
  for (const value of [-0.01, 10000000.01, NaN, Infinity, -Infinity, '5.99', '5,99', undefined, null, true, false, {}, []]) {
    assert.equal(getIngredientPriceEdit(potato, value), null, String(value));
  }
});

test('edição só aceita ingredientes e unidades do catálogo, sem criar caminhos de protótipo', () => {
  for (const item of [undefined, null, {}, { id: 'outro', unit: 'g' }, { id: 'constructor', unit: 'g' }, { id: '__proto__', unit: 'g' }, { id: 'frango.price', unit: 'g' }, { id: 'batata', unit: 'kg' }, { id: 'batata', unit: 'un' }, { id: 'batata', unit: 'constructor' }]) {
    assert.equal(getIngredientPriceEdit(item, 10), null);
  }
  const potato = Object.freeze({ ...ingredients.find((item) => item.id === 'batata') });
  const before = structuredClone(potato);
  assert.deepEqual(Object.keys(getIngredientPriceEdit(potato, 5.99)), ['ingredients.batata.price', 'ingredients.batata.packageSize']);
  assert.deepEqual(potato, before);
  assert.equal({}.polluted, undefined);
});
