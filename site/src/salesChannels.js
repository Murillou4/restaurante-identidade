import { defaultFields, estimate, getSettings } from './budgetCatalog.js';

export const salesChannels = [
  { id: 'direct', name: 'Direto / personalizado', description: 'Usa as taxas e o custo de entrega cadastrados na Operação.' },
  { id: 'ifood-basic', name: 'iFood Básico', description: 'Comissão do aplicativo e entrega feita pela própria loja.' },
  { id: 'ifood-delivery', name: 'Entrega iFood', description: 'Comissão com logística iFood e eventuais subsídios pagos pela loja.' },
];

export const defaultChannelFields = Object.freeze({
  'channel.plan': 'direct',
  'channel.onlineSharePercent': 100,
  'channel.paymentPercent': 3.2,
  'channel.basicCommissionPercent': 12,
  'channel.deliveryCommissionPercent': 23,
  'channel.basicMonthly': 110,
  'channel.deliveryMonthly': 150,
  'channel.monthlyThreshold': 1800,
  'channel.monthlyExempt': 0,
  'channel.ifoodDeliverySubsidy': 0,
  'channel.otherFeePercent': 0,
  'channel.promotionPerUnit': 0,
});

const percentageFields = new Set(['onlineSharePercent', 'paymentPercent', 'basicCommissionPercent', 'deliveryCommissionPercent', 'otherFeePercent']);
const financialFields = ['ingredientCost', 'lossCost', 'variableCost', 'fixedCostPerUnit', 'fullCost', 'percentRate', 'suggestedPrice', 'chosenPrice', 'taxCost', 'feeCost', 'totalPercentCost', 'contribution', 'contributionMarginPercent', 'netUnit', 'netMonthly', 'breakEvenUnits'];
const finite = value => Number.isFinite(value) ? value : null;
const alert = (code, field, message, severity = 'error') => ({ code, field, message, severity });
const noise = value => Number.EPSILON * Math.max(1, Math.abs(value)) * 4;
const aboveThreshold = (gross, threshold) => gross - threshold > noise(Math.max(Math.abs(gross), Math.abs(threshold)));
const ceilPortions = value => Math.max(0, Math.ceil(value - noise(value)));
const ceilPrice = value => Number.isFinite(value) && value >= 0 && Number.isFinite(value * 100)
  ? Math.ceil(value * 100 - noise(value * 100)) / 100
  : null;

function readParameters(values) {
  const parameters = {};
  const alerts = [];
  const plan = values['channel.plan'] === undefined ? defaultChannelFields['channel.plan'] : values['channel.plan'];
  if (!salesChannels.some(channel => channel.id === plan)) alerts.push(alert('CHANNEL_PLAN', 'channel.plan', 'Escolha um canal de venda válido.'));
  for (const [path, initial] of Object.entries(defaultChannelFields)) {
    if (path === 'channel.plan') continue;
    const field = path.slice(8);
    const value = values[path] === undefined ? initial : values[path];
    let valid = typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10000000;
    if (percentageFields.has(field)) valid = valid && value <= 100;
    if (field === 'monthlyExempt') valid = valid && (value === 0 || value === 1);
    if (!valid) alerts.push(alert('CHANNEL_VALUE', path, field === 'monthlyExempt'
      ? 'A carência simulada precisa estar desligada (0) ou ligada (1).'
      : percentageFields.has(field) ? 'Informe um percentual do canal entre 0 e 100.' : 'Informe um valor do canal entre 0 e 10.000.000.'));
    parameters[field] = valid ? value : NaN;
  }
  return { parameters, alerts };
}

function invalidResult(result, channel, alerts) {
  const invalid = { ...result, valid: false, alerts: [...result.alerts, ...alerts], channel: { ...channel } };
  for (const field of financialFields) invalid[field] = null;
  invalid.rows = result.rows.map(row => ({ ...row, cost: null }));
  invalid.costs = {
    base: Object.fromEntries(Object.keys(result.costs.base).map(id => [id, null])),
    cheese: null,
    fillings: result.costs.fillings.map(item => ({ ...item, cost: null })),
    fillingsTotal: null,
  };
  for (const field of ['commissionCost', 'paymentCost', 'otherFeeCost', 'monthly', 'grossMonthly', 'suggestedMonthly', 'suggestedGrossMonthly']) invalid.channel[field] = null;
  invalid.channel.monthlyStatus = 'invalid';
  return invalid;
}

// Monthly fees are evaluated again for each candidate price or sales volume;
// the fee at the tested price must not determine a different price's fee.
function firstBreakEven(contribution, chosenPrice, fixedMonthly, monthlyListed, threshold, exempt) {
  if (!(contribution > 0)) return { value: null, alerts: [] };
  const noMonthly = ceilPortions(fixedMonthly / contribution);
  if (exempt || monthlyListed === 0 || chosenPrice === 0) {
    return Number.isSafeInteger(noMonthly) ? { value: noMonthly, alerts: [] }
      : { value: null, alerts: [alert('CHANNEL_BREAK_EVEN_RANGE', 'breakEvenUnits', 'O ponto de equilíbrio excede o limite deste cálculo.')] };
  }
  const edge = threshold / chosenPrice;
  const lastWithoutMonthly = Math.floor(edge + noise(edge));
  const paidCandidate = Math.max(lastWithoutMonthly + 1, ceilPortions((fixedMonthly + monthlyListed) / contribution));
  const first = noMonthly <= lastWithoutMonthly ? noMonthly : paidCandidate;
  if (!Number.isSafeInteger(first)) return { value: null, alerts: [alert('CHANNEL_BREAK_EVEN_RANGE', 'breakEvenUnits', 'O ponto de equilíbrio excede o limite deste cálculo.')] };
  const alerts = [];
  const afterThreshold = contribution * (lastWithoutMonthly + 1) - fixedMonthly - monthlyListed;
  if (noMonthly <= lastWithoutMonthly && afterThreshold < -noise(fixedMonthly + monthlyListed)) {
    alerts.push(alert('CHANNEL_BREAK_EVEN_GAP', 'breakEvenUnits', `O primeiro equilíbrio ocorre antes da mensalidade. Ao ultrapassar o limite de faturamento, o resultado volta a ser negativo até ${paidCandidate} vendas no mês.`, 'warning'));
  }
  return { value: first, alerts };
}

export function estimateChannel(values = {}, channelId = values?.['channel.plan'] ?? 'direct', selection) {
  const inputValid = values !== null && typeof values === 'object' && !Array.isArray(values);
  const budgetValues = { ...defaultFields, ...(inputValid ? values : {}) };
  const settings = getSettings(budgetValues);
  const { parameters: params, alerts } = readParameters(inputValid ? values : {});
  if (!inputValid) alerts.push(alert('CHANNEL_INPUT', 'channel', 'Informe os valores do orçamento para comparar os canais.'));
  const definition = salesChannels.find(channel => channel.id === channelId);
  if (!definition) alerts.push(alert('CHANNEL_PLAN', 'channel.plan', 'Escolha um canal de venda válido.'));
  const direct = channelId === 'direct';
  const delivery = channelId === 'ifood-delivery';
  const commissionPercent = direct ? 0 : delivery ? params.deliveryCommissionPercent : params.basicCommissionPercent;
  const paymentPercent = direct ? 0 : params.paymentPercent;
  const onlineSharePercent = direct ? 0 : params.onlineSharePercent;
  const effectivePaymentPercent = paymentPercent * onlineSharePercent / 100;
  const otherFeePercent = direct ? settings.feePercent : params.otherFeePercent;
  const totalFeePercent = direct ? settings.feePercent : commissionPercent + effectivePaymentPercent + otherFeePercent;
  const monthlyListed = direct ? 0 : delivery ? params.deliveryMonthly : params.basicMonthly;
  const exempt = params.monthlyExempt === 1;
  const deliverySubsidy = delivery ? params.ifoodDeliverySubsidy : settings.deliverySubsidy;
  const promotionPerUnit = direct ? 0 : params.promotionPerUnit;
  const grossMonthly = typeof settings.chosenPrice === 'number' && Number.isFinite(settings.chosenPrice) && settings.chosenPrice >= 0
    && Number.isSafeInteger(settings.unitsMonthly) && settings.unitsMonthly > 0
    ? finite(settings.chosenPrice * settings.unitsMonthly) : null;
  const monthlyAt = gross => direct || exempt || !aboveThreshold(gross, params.monthlyThreshold) ? 0 : monthlyListed;
  const monthly = grossMonthly === null ? 0 : monthlyAt(grossMonthly);
  const channel = {
    id: definition?.id ?? channelId,
    name: definition?.name ?? 'Canal inválido',
    commissionPercent: finite(commissionPercent), paymentPercent: finite(paymentPercent), onlineSharePercent: finite(onlineSharePercent),
    effectivePaymentPercent: finite(effectivePaymentPercent), otherFeePercent: finite(otherFeePercent), totalFeePercent: finite(totalFeePercent),
    commissionCost: null, paymentCost: null, otherFeeCost: null,
    monthly: finite(monthly), monthlyListed: finite(monthlyListed), grossMonthly,
    monthlyStatus: direct ? 'not-applicable' : exempt ? 'exempt' : grossMonthly !== null && aboveThreshold(grossMonthly, params.monthlyThreshold) ? 'charged' : 'below-threshold',
    deliverySubsidy: finite(deliverySubsidy), promotionPerUnit: finite(promotionPerUnit), baseFixedMonthly: finite(settings.fixedMonthly),
    suggestedMonthly: null, suggestedGrossMonthly: null,
  };
  const run = monthlyFee => estimate(direct ? budgetValues : {
    ...budgetValues,
    'settings.feePercent': totalFeePercent,
    'settings.fixedMonthly': Number.isFinite(settings.fixedMonthly) ? settings.fixedMonthly + monthlyFee : NaN,
    'settings.deliverySubsidy': deliverySubsidy,
    'settings.laborPerUnit': Number.isFinite(settings.laborPerUnit) ? settings.laborPerUnit + promotionPerUnit : NaN,
  }, selection);
  const tested = run(monthly);
  if (grossMonthly === null) alerts.push(alert('CHANNEL_REVENUE', 'settings.chosenPrice', 'Informe um preço e um volume mensal válidos para calcular o faturamento do canal.'));
  if (alerts.length || !tested.valid) return invalidResult(tested, channel, alerts);
  channel.commissionCost = tested.chosenPrice * commissionPercent / 100;
  channel.paymentCost = tested.chosenPrice * effectivePaymentPercent / 100;
  channel.otherFeeCost = tested.chosenPrice * otherFeePercent / 100;
  if (direct) {
    channel.suggestedMonthly = 0;
    channel.suggestedGrossMonthly = finite(tested.suggestedPrice * settings.unitsMonthly);
    return { ...tested, channel };
  }
  const candidates = [0, monthlyListed].map(monthlyFee => {
    const result = run(monthlyFee);
    const price = result.valid ? ceilPrice(result.suggestedPrice) : null;
    const gross = price === null ? null : finite(price * settings.unitsMonthly);
    return { price, gross, monthly: monthlyFee, consistent: gross !== null && monthlyAt(gross) === monthlyFee };
  }).filter(candidate => candidate.price !== null && candidate.consistent);
  if (!candidates.length) return invalidResult(tested, channel, [alert('CHANNEL_SUGGESTION', 'suggestedPrice', 'Não foi possível calcular um preço consistente com a mensalidade e a margem desejada.')]);
  const suggested = candidates.reduce((lowest, candidate) => candidate.price < lowest.price ? candidate : lowest);
  channel.suggestedMonthly = suggested.monthly;
  channel.suggestedGrossMonthly = suggested.gross;
  const breakEven = firstBreakEven(tested.contribution, tested.chosenPrice, settings.fixedMonthly, monthlyListed, params.monthlyThreshold, exempt);
  if (breakEven.alerts.some(item => item.severity === 'error')) return invalidResult(tested, channel, breakEven.alerts);
  return {
    ...tested,
    settings: { ...tested.settings, laborPerUnit: settings.laborPerUnit },
    suggestedPrice: suggested.price,
    breakEvenUnits: breakEven.value,
    alerts: [...tested.alerts, ...breakEven.alerts],
    channel,
  };
}

export function compareChannels(values, selection) {
  return salesChannels.map(channel => estimateChannel(values, channel.id, selection));
}
