/** Pure estimates for one portion. Currency is never rounded inside the model. */
export const DEFAULT_BUDGET_SETTINGS = Object.freeze({
  potatoGrams: 450,
  oilMl: 5,
  saltGrams: 2,
  cheeseGrams: 40,
  fillingTotalGrams: 150,
  lossPercent: 8,
  energyPerUnit: 0.8,
  packagingPerUnit: 1.8,
  laborPerUnit: 2,
  deliverySubsidy: 0,
  fixedMonthly: 300,
  unitsMonthly: 200,
  taxPercent: 0,
  feePercent: 0,
  targetMarginPercent: 25,
  chosenPrice: 25,
});

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const percentageFields = new Set(['lossPercent', 'taxPercent', 'feePercent', 'targetMarginPercent']);
const unitDivisors = { g: 1000, ml: 1000, un: 1 };

function addAlert(alerts, code, field, message, severity = 'error') {
  alerts.push({ code, field, message, severity });
}

/**
 * Divide a single total among up to three fillings; cheese is a separate row.
 * Custom amounts are explicit grams for every selected ID and must sum to total.
 * Unselected IDs in customAmounts are ignored, allowing saved configurations.
 */
export function distributeFillings(ids, totalGrams = 150, customAmounts = {}) {
  const alerts = [];
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3) {
    addAlert(alerts, 'FILLING_COUNT', 'fillings', 'Escolha de um a três recheios.');
  } else if (ids.some((id) => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length) {
    addAlert(alerts, 'FILLING_IDS', 'fillings', 'Os recheios precisam ter identificadores únicos.');
  }
  if (!isFiniteNumber(totalGrams) || totalGrams <= 0) {
    addAlert(alerts, 'FILLING_TOTAL', 'fillingTotalGrams', 'O peso total dos recheios precisa ser maior que zero.');
  }
  if (!isObject(customAmounts)) {
    addAlert(alerts, 'FILLING_AMOUNTS', 'recipeAmounts', 'Informe as porções personalizadas por recheio.');
  }
  if (alerts.length) return { valid: false, alerts, portions: [], totalGrams: null };

  const custom = ids.some((id) => Object.hasOwn(customAmounts, id));
  const portions = ids.map((id) => ({ id, grams: custom ? customAmounts[id] : totalGrams / ids.length }));
  for (const portion of portions) {
    if (!isFiniteNumber(portion.grams) || portion.grams < 0) {
      addAlert(alerts, 'FILLING_AMOUNT', `recipeAmounts.${portion.id}`, 'Informe um peso válido para cada recheio selecionado.');
    }
  }
  if (!alerts.length) {
    const sum = portions.reduce((total, portion) => total + portion.grams, 0);
    const tolerance = Number.EPSILON * Math.max(1, totalGrams, Math.abs(sum)) * ids.length * 4;
    if (!Number.isFinite(sum) || Math.abs(sum - totalGrams) > tolerance) {
      addAlert(alerts, 'FILLING_SUM', 'recipeAmounts', 'A soma das porções precisa ser igual ao peso total dos recheios.');
    }
  }
  return {
    valid: alerts.length === 0,
    alerts,
    portions,
    totalGrams: alerts.length ? null : portions.reduce((total, portion) => total + portion.grams, 0),
  };
}

/**
 * unitPrice is R$/kg for g, R$/L for ml and R$/unit for un. quantity is the
 * desired net amount; yieldPercent adjusts the purchase amount exactly once.
 * lossPercent is an additional cost reserve over ingredients, not another
 * preparation yield. Do not enter the same physical loss in both fields.
 * Per-unit extras must not also appear as rows (e.g. packaging in both places).
 */
export function calculateBudget(input = {}) {
  const alerts = [];
  const rawSettings = input?.settings === undefined ? {} : input.settings;
  if (!isObject(rawSettings)) {
    addAlert(alerts, 'SETTINGS_OBJECT', 'settings', 'Informe os ajustes do orçamento.');
  }
  const settings = {};
  for (const [field, defaultValue] of Object.entries(DEFAULT_BUDGET_SETTINGS)) {
    const value = isObject(rawSettings) && rawSettings[field] !== undefined ? rawSettings[field] : defaultValue;
    let valid = isFiniteNumber(value) && value >= 0;
    if (percentageFields.has(field)) valid = valid && value <= 100;
    if (field === 'unitsMonthly') valid = valid && Number.isSafeInteger(value) && value > 0;
    if (!valid) {
      const message = field === 'unitsMonthly'
        ? 'A quantidade mensal precisa ser um número inteiro maior que zero.'
        : percentageFields.has(field)
          ? 'Informe um percentual entre 0 e 100.'
          : 'Informe um número válido, maior ou igual a zero.';
      addAlert(alerts, 'SETTING_VALUE', `settings.${field}`, message);
    }
    settings[field] = valid ? value : null;
  }

  const finiteResult = (value, field) => {
    if (Number.isFinite(value)) return value;
    addAlert(alerts, 'CALCULATION_RANGE', field, 'Os valores informados excedem o limite deste cálculo.');
    return null;
  };
  const hasRows = Array.isArray(input?.rows) && input.rows.length > 0;
  if (!hasRows) addAlert(alerts, 'ROWS_REQUIRED', 'rows', 'Inclua pelo menos um insumo para calcular a porção.');

  const rows = hasRows ? input.rows.map((row, index) => {
    const source = isObject(row) ? row : {};
    const field = `rows.${index}`;
    const quantityValid = isFiniteNumber(source.quantity) && source.quantity >= 0;
    const priceValid = isFiniteNumber(source.unitPrice) && source.unitPrice >= 0;
    const unitValid = Object.hasOwn(unitDivisors, source.unit);
    const yieldPercent = source.yieldPercent === undefined ? 100 : source.yieldPercent;
    const yieldValid = isFiniteNumber(yieldPercent) && yieldPercent > 0 && yieldPercent <= 100;
    if (!quantityValid) addAlert(alerts, 'ROW_QUANTITY', `${field}.quantity`, 'Informe uma quantidade válida, maior ou igual a zero.');
    if (!priceValid) addAlert(alerts, 'ROW_PRICE', `${field}.unitPrice`, 'Informe um preço válido, maior ou igual a zero.');
    if (!unitValid) addAlert(alerts, 'ROW_UNIT', `${field}.unit`, 'Use g, ml ou un como unidade.');
    if (!yieldValid) addAlert(alerts, 'ROW_YIELD', `${field}.yieldPercent`, 'O rendimento precisa ser maior que zero e até 100%.');

    const purchaseQuantity = quantityValid && yieldValid
      ? finiteResult(source.quantity / (yieldPercent / 100), `${field}.purchaseQuantity`)
      : null;
    const cost = purchaseQuantity !== null && priceValid && unitValid
      ? finiteResult(purchaseQuantity / unitDivisors[source.unit] * source.unitPrice, `${field}.cost`)
      : null;
    return {
      id: source.id ?? `row-${index}`,
      name: source.name ?? source.id ?? `Insumo ${index + 1}`,
      quantity: quantityValid ? source.quantity : null,
      unitPrice: priceValid ? source.unitPrice : null,
      unit: unitValid ? source.unit : null,
      yieldPercent: yieldValid ? yieldPercent : null,
      purchaseQuantity,
      cost,
    };
  }) : [];

  const ingredientCost = hasRows && rows.every((row) => row.cost !== null)
    ? finiteResult(rows.reduce((total, row) => total + row.cost, 0), 'ingredientCost')
    : null;
  const lossCost = ingredientCost !== null && settings.lossPercent !== null
    ? finiteResult(ingredientCost * (settings.lossPercent / 100), 'lossCost')
    : null;
  const extras = ['energyPerUnit', 'packagingPerUnit', 'laborPerUnit', 'deliverySubsidy'];
  const variableCost = ingredientCost !== null && lossCost !== null && extras.every((field) => settings[field] !== null)
    ? finiteResult(ingredientCost + lossCost + extras.reduce((total, field) => total + settings[field], 0), 'variableCost')
    : null;
  const fixedCostPerUnit = settings.fixedMonthly !== null && settings.unitsMonthly !== null
    ? finiteResult(settings.fixedMonthly / settings.unitsMonthly, 'fixedCostPerUnit')
    : null;
  const fullCost = variableCost !== null && fixedCostPerUnit !== null
    ? finiteResult(variableCost + fixedCostPerUnit, 'fullCost')
    : null;
  const percentRate = settings.taxPercent !== null && settings.feePercent !== null
    ? (settings.taxPercent + settings.feePercent) / 100
    : null;
  const denominator = percentRate !== null && settings.targetMarginPercent !== null
    ? 1 - (settings.taxPercent + settings.feePercent + settings.targetMarginPercent) / 100
    : null;
  if (denominator !== null && denominator <= 0) {
    addAlert(alerts, 'PRICE_DENOMINATOR', 'settings.targetMarginPercent', 'Taxas, impostos e margem desejada precisam somar menos de 100%.');
  }
  const suggestedPrice = fullCost !== null && denominator !== null && denominator > 0
    ? finiteResult(fullCost / denominator, 'suggestedPrice')
    : null;
  const chosenPrice = settings.chosenPrice;
  const taxCost = chosenPrice !== null && settings.taxPercent !== null
    ? finiteResult(chosenPrice * settings.taxPercent / 100, 'taxCost')
    : null;
  const feeCost = chosenPrice !== null && settings.feePercent !== null
    ? finiteResult(chosenPrice * settings.feePercent / 100, 'feeCost')
    : null;
  const totalPercentCost = taxCost !== null && feeCost !== null
    ? finiteResult(taxCost + feeCost, 'totalPercentCost')
    : null;
  const contribution = chosenPrice !== null && totalPercentCost !== null && variableCost !== null
    ? finiteResult(chosenPrice - totalPercentCost - variableCost, 'contribution')
    : null;
  const contributionMarginPercent = contribution !== null && chosenPrice > 0
    ? finiteResult(contribution / chosenPrice * 100, 'contributionMarginPercent')
    : null;
  const netUnit = contribution !== null && fixedCostPerUnit !== null
    ? finiteResult(contribution - fixedCostPerUnit, 'netUnit')
    : null;
  const netMonthly = contribution !== null && settings.unitsMonthly !== null && settings.fixedMonthly !== null
    ? finiteResult(contribution * settings.unitsMonthly - settings.fixedMonthly, 'netMonthly')
    : null;
  let breakEvenUnits = null;
  if (contribution !== null && contribution > 0 && settings.fixedMonthly !== null) {
    const ratio = finiteResult(settings.fixedMonthly / contribution, 'breakEvenUnits');
    if (ratio !== null) {
      // Integer portion count; tolerate only floating-point noise at an integer.
      breakEvenUnits = Math.max(0, Math.ceil(ratio - Number.EPSILON * Math.max(1, Math.abs(ratio)) * 4));
    }
  } else if (contribution !== null && contribution <= 0) {
    addAlert(alerts, 'NONPOSITIVE_CONTRIBUTION', 'chosenPrice', 'O preço não cobre os custos variáveis e as taxas; não há ponto de equilíbrio com estes valores.', 'warning');
  }
  if (netMonthly !== null && netMonthly < 0) {
    addAlert(alerts, 'NEGATIVE_MONTHLY_RESULT', 'netMonthly', 'O resultado mensal estimado é negativo neste cenário.', 'warning');
  }

  return {
    valid: !alerts.some((alert) => alert.severity === 'error'),
    alerts, settings, rows,
    ingredientCost, lossCost, variableCost, fixedCostPerUnit, fullCost,
    percentRate, suggestedPrice, chosenPrice, taxCost, feeCost, totalPercentCost,
    contribution, contributionMarginPercent, netUnit, netMonthly, breakEvenUnits,
  };
}
