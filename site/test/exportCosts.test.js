import test from 'node:test';
import assert from 'node:assert/strict';
import { createCostsExport, PURCHASE_UNITS_FIELD } from '../src/exportCosts.js';

test('exporta as compras e quantidades por batata, mantendo os dados locais separados', async () => {
  const roomId = '7955b9be-2c93-453c-9fa4-3a6dbd6093fe';
  const file = await createCostsExport({
    roomId, revision: 8,
    fields: { 'ingredients.batata.price': 3.98, 'ingredients.batata.packageSize': 1000 },
  }, {
    [PURCHASE_UNITS_FIELD]: { batata: 'g' },
    'ingredients.presunto.price': 19.9,
    'ingredients.presunto.packageSize': 500,
    'ingredients.embalagem-x-salada.price': 20,
    'ingredients.embalagem-x-salada.packageSize': 50,
    'ingredients.embalagem-x-salada.amount': 1,
    'recipes.pizza.milho': 24,
  });
  const potato = file.baseline.items.find(({ id }) => id === 'batata');
  assert.equal(potato.unit, 'kg');
  assert.equal(potato.quantity, 1000);
  assert.equal(potato.paid, 398);
  const preferred = file.device.items.find(({ id }) => id === 'batata');
  assert.equal(preferred.unit, 'g');
  assert.equal(preferred.quantity, 1000);
  assert.equal(preferred.paid, 398);
  const ham = file.device.items.find(({ id }) => id === 'presunto');
  assert.equal(ham.paid, 1990);
  assert.equal(ham.quantity, 500);
  assert.equal(file.device.items.find(({ id }) => id === 'embalagem-x-salada').perOrder, 1);
  const chicken = file.baseline.recipes.find(({ id }) => id === 'frango');
  assert.equal(chicken.lines.find(({ itemId }) => itemId === 'frango').quantity, 105);
  const pizza = file.device.recipes.find(({ id }) => id === 'pizza');
  assert.equal(pizza.lines.find(({ itemId }) => itemId === 'milho').quantity, 24);
  assert.match(file.source, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(file).includes(roomId));
});
