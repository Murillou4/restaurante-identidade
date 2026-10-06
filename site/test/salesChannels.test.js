import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultFields, estimate } from '../src/budgetCatalog.js';
import { defaultFields as sharedDefaults } from '../src/sharedBudgetDefaults.js';
import { defaultChannelFields, estimateChannel, compareChannels } from '../src/salesChannels.js';

const fixture = (changes = {}) => ({ ...defaultFields, ...defaultChannelFields, ...changes });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const cheap = (changes = {}) => fixture({
  ...Object.fromEntries(Object.keys(defaultFields).filter(path => path.startsWith('ingredients.') && path.endsWith('.price')).map(path => [path, 0])),
  'settings.lossPercent': 0, 'settings.energyPerUnit': 0, 'settings.laborPerUnit': 9,
  'settings.fixedMonthly': 0, 'settings.targetMarginPercent': 0,
  'channel.basicCommissionPercent': 0, 'channel.paymentPercent': 0, ...changes,
});

test('venda direta preserva os valores do caderno, sem duplicar taxas nem aplicar mensalidade', () => {
  const values = fixture({ 'settings.feePercent': 15, 'settings.deliverySubsidy': 4 });
  const direct = estimateChannel(values, 'direct');
  const previous = estimate(values);
  for (const key of ['ingredientCost', 'lossCost', 'variableCost', 'fullCost', 'feeCost', 'suggestedPrice', 'netUnit', 'netMonthly', 'breakEvenUnits']) close(direct[key], previous[key]);
  assert.equal(direct.channel.monthly, 0);
  assert.equal(direct.channel.totalFeePercent, 15);
});

test('comissão e pagamento online substituem a taxa genérica, com participação de faturamento 0/50/100%', () => {
  for (const [share, expected] of [[0, 12], [50, 13.6], [100, 15.2]]) {
    const result = estimateChannel(fixture({ 'settings.feePercent': 15, 'channel.onlineSharePercent': share }), 'ifood-basic');
    assert.equal(result.valid, true);
    close(result.channel.totalFeePercent, expected);
    close(result.feeCost, 25 * expected / 100);
    close(result.channel.commissionCost, 3);
    close(result.channel.paymentCost, 25 * 3.2 * share / 10000);
    close(result.feeCost, result.channel.commissionCost + result.channel.paymentCost + result.channel.otherFeeCost);
  }
  const delivery = estimateChannel(fixture(), 'ifood-delivery');
  close(delivery.channel.totalFeePercent, 26.2);
  close(delivery.channel.commissionCost, 5.75);
});

test('mensalidade somente acima de R$ 1.800, e carência se aplica aos dois planos', () => {
  const base = fixture({ 'settings.chosenPrice': 25, 'settings.unitsMonthly': 72 });
  for (const [id, monthly] of [['ifood-basic', 110], ['ifood-delivery', 150]]) {
    assert.equal(estimateChannel(base, id).channel.monthly, 0);
    assert.equal(estimateChannel({ ...base, 'settings.chosenPrice': 25.01 }, id).channel.monthly, monthly);
    const exempt = estimateChannel({ ...base, 'settings.chosenPrice': 25.01, 'channel.monthlyExempt': 1 }, id);
    assert.equal(exempt.channel.monthly, 0);
    assert.equal(exempt.channel.suggestedMonthly, 0);
    assert.equal(exempt.channel.monthlyStatus, 'exempt');
  }
});

test('Entrega iFood não soma entrega própria; promoção e subsídio entram uma única vez', () => {
  const values = fixture({ 'settings.deliverySubsidy': 6, 'channel.ifoodDeliverySubsidy': 2, 'channel.promotionPerUnit': 1.5 });
  const baseline = estimateChannel(fixture(), 'ifood-delivery');
  const delivery = estimateChannel(values, 'ifood-delivery');
  const basic = estimateChannel(values, 'ifood-basic');
  close(delivery.variableCost, baseline.variableCost + 2 + 1.5);
  close(basic.variableCost, baseline.variableCost + 6 + 1.5);
  assert.equal(delivery.settings.deliverySubsidy, 2);
  assert.equal(delivery.settings.laborPerUnit, 2);
  close(delivery.packagingCost, baseline.packagingCost);
  close(delivery.costs.fillingsTotal, baseline.costs.fillingsTotal);
});

test('taxas personalizadas e impostos entram separados, incluindo taxa opcional', () => {
  const values = fixture({ 'channel.basicCommissionPercent': 10, 'channel.paymentPercent': 3.5, 'channel.onlineSharePercent': 50, 'channel.otherFeePercent': 1, 'settings.taxPercent': 4 });
  const result = estimateChannel(values, 'ifood-basic');
  close(result.channel.totalFeePercent, 12.75);
  close(result.taxCost, 1);
  close(result.channel.otherFeeCost, 0.25);
  close(result.totalPercentCost, 25 * 0.1675);
  close(result.netMonthly, result.contribution * 200 - 410);
});

test('o preço sugerido avalia sua própria mensalidade, não a do preço testado', () => {
  const result = estimateChannel(cheap({ 'settings.chosenPrice': 25, 'settings.unitsMonthly': 100 }), 'ifood-basic');
  assert.equal(result.channel.monthly, 110);
  assert.equal(result.suggestedPrice, 9);
  assert.equal(result.channel.suggestedMonthly, 0);
  assert.equal(result.channel.suggestedGrossMonthly, 900);
  const reverse = estimateChannel(cheap({ 'settings.laborPerUnit': 19, 'settings.chosenPrice': 10, 'settings.unitsMonthly': 100 }), 'ifood-basic');
  assert.equal(reverse.channel.monthly, 0);
  assert.equal(reverse.suggestedPrice, 20.1);
  assert.equal(reverse.channel.suggestedMonthly, 110);
});

test('recomendação ao centavo respeita o limiar após arredondar e preserva a margem', () => {
  const exact = estimateChannel(cheap({ 'settings.laborPerUnit': 18, 'settings.unitsMonthly': 100 }), 'ifood-basic');
  assert.equal(exact.suggestedPrice, 18);
  assert.equal(exact.channel.suggestedMonthly, 0);
  const crossed = estimateChannel(cheap({ 'settings.laborPerUnit': 18.00001, 'settings.unitsMonthly': 100 }), 'ifood-basic');
  assert.equal(crossed.suggestedPrice, 19.11);
  assert.equal(crossed.channel.suggestedMonthly, 110);
  const normal = estimateChannel(fixture(), 'ifood-delivery');
  const recommended = estimateChannel(fixture({ 'settings.chosenPrice': normal.suggestedPrice }), 'ifood-delivery');
  assert.ok(recommended.netUnit / recommended.chosenPrice >= 0.25);
});

test('equilíbrio usa mensalidade no próprio volume e avisa quando o limiar causa nova perda', () => {
  const result = estimateChannel(cheap({ 'settings.laborPerUnit': 19, 'settings.fixedMonthly': 300, 'settings.chosenPrice': 25, 'settings.unitsMonthly': 200 }), 'ifood-basic');
  assert.equal(result.channel.monthly, 110);
  assert.equal(result.breakEvenUnits, 50);
  const gap = estimateChannel(cheap({ 'settings.laborPerUnit': 21, 'settings.fixedMonthly': 280, 'settings.chosenPrice': 25, 'settings.unitsMonthly': 200 }), 'ifood-basic');
  assert.equal(gap.breakEvenUnits, 70);
  assert.ok(gap.alerts.some(item => item.code === 'CHANNEL_BREAK_EVEN_GAP' && /98 vendas/.test(item.message)));
  const paid = estimateChannel(cheap({ 'settings.laborPerUnit': 21, 'settings.fixedMonthly': 300, 'settings.chosenPrice': 25, 'settings.unitsMonthly': 200 }), 'ifood-basic');
  assert.equal(paid.breakEvenUnits, 103);
});

test('cada canal e cada receita recebem uma projeção independente, mantendo a composição', () => {
  const values = fixture({ 'simulation.fillings': ['frango', 'bacon', 'carne-sol'] });
  const results = compareChannels(values);
  assert.deepEqual(results.map(result => result.channel.id), ['direct', 'ifood-basic', 'ifood-delivery']);
  for (const result of results) {
    assert.equal(result.valid, true);
    close(result.ingredientCost, results[0].ingredientCost);
    assert.deepEqual(result.portions.map(portion => portion.grams), [50, 50, 50]);
  }
  const custom = estimateChannel(values, 'ifood-basic', { fillings: ['milho'], cheese: 'nenhum', palha: 0 });
  assert.deepEqual(custom.selectedFillings, ['milho']);
  assert.equal(custom.costs.cheese, 0);
});

test('campos novos integram os defaults compartilhados, preservando os 138 anteriores', () => {
  assert.equal(Object.keys(sharedDefaults).length, 150);
  for (const [path, value] of Object.entries(defaultFields)) assert.deepEqual(sharedDefaults[path], value);
  assert.equal(sharedDefaults['channel.plan'], 'direct');
  assert.equal(sharedDefaults['channel.paymentPercent'], 3.2);
});

test('valores inválidos não viram custo zero ou projeção plausível', () => {
  for (const changes of [
    { 'channel.plan': 'outro' }, { 'channel.paymentPercent': NaN }, { 'channel.onlineSharePercent': 101 },
    { 'channel.monthlyExempt': true }, { 'channel.basicMonthly': -1 }, { 'channel.promotionPerUnit': Infinity },
    { 'channel.ifoodDeliverySubsidy': '2' }, { 'channel.monthlyThreshold': 10000001 },
    { 'settings.unitsMonthly': 0 }, { 'ingredients.frango.yieldPercent': 0 },
    { 'channel.basicCommissionPercent': 75 },
  ]) {
    const result = estimateChannel(fixture(changes), 'ifood-basic');
    assert.equal(result.valid, false, JSON.stringify(changes));
    assert.equal(result.netMonthly, null);
    assert.equal(result.suggestedPrice, null);
    assert.equal(result.costs.fillingsTotal, null);
    assert.equal(result.channel.monthly, null);
  }
  assert.equal(estimateChannel(null).valid, false);
});
