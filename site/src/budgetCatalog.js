import { calculateBudget, distributeFillings, DEFAULT_BUDGET_SETTINGS } from './budgetMath.js';

export const RESEARCH_DATE = '06/10/2026';
export const CUSTOM_CATALOG_FIELD = 'settings.customCatalog';
export const PIZZA_MODE_FIELD = 'simulation.pizza';
export const X_SALAD_PACKAGING_ID = 'embalagem-x-salada';
export const MAX_PURCHASE_PRICE = 10_000_000;
export const MAX_PACKAGE_SIZE = 100_000_000;
export const pizzaPurchaseIds = ['presunto', 'oregano'];
const deviceBudgetField = /^(?:ingredients\.(?:presunto\.|oregano\.|custom-)|recipes\.(?:pizza\.|[^.]+\.(?:presunto$|oregano$|(?:extra-)?custom-)))/;
export const isDeviceBudgetField = (path) => path === PIZZA_MODE_FIELD || path === CUSTOM_CATALOG_FIELD ||
  path.startsWith(`ingredients.${X_SALAD_PACKAGING_ID}.`) || deviceBudgetField.test(path);
const sousa = 'https://www.cardapio.datacaixa.com.br/loja=7655';
const moreira = 'https://www.moreira.com.br/p/';
const jk = 'https://www.embalagensjk.com.br/produto/';
function ingredient(id, name, unit, packageSize, price, store, source, note = '', yieldPercent = 100, status = 'reference', type = 'food', amount = 1) {
  return { id, name, unit, packageSize, price, store, source, note, yieldPercent, status, type, amount };
}
export const ingredients = [
  ingredient('batata', 'Batata inglesa', 'g', 160, 1.15, 'Carrefour Jardim Goiás / Rappi', 'https://www.rappi.com.br/lojas/900129537-carrefour-hiper-express-express', 'Preço por unidade de aproximadamente 160 g. Usado como referência por kg; a batata grande para rechear ainda precisa ser cotada.'),
  ingredient('frango', 'Peito de frango', 'g', 1000, 13.99, 'Sousa · Morada do Sol', sousa, 'A descrição não confirma filé sem osso. Rendimento inicial de 60% é hipótese para desossa e preparo; medir o lote comprado.', 60),
  ingredient('bacon', 'Bacon', 'g', 1000, 34.99, 'Sousa · Morada do Sol', sousa, 'Rendimento de 65% após fritar é hipótese editável.', 65),
  ingredient('calabresa', 'Calabresa grossa', 'g', 1000, 29.99, 'Sousa · Morada do Sol', sousa, 'Rendimento de 90% após preparar é hipótese editável.', 90),
  ingredient('carne-sol', 'Carne de sol', 'g', 1000, 55.99, 'Sousa · Morada do Sol', sousa, 'Manta. Rendimento de 70% após dessalgar e preparar é hipótese editável.', 70),
  ingredient('mucarela', 'Muçarela', 'g', 500, 24.99, 'Sousa · Morada do Sol', sousa, 'Piracanjuba fatiada, pacote de 500 g.'),
  ingredient('requeijao', 'Requeijão cremoso', 'g', 180, 8.99, 'Sousa · Morada do Sol', sousa, 'Boua, pote de 180 g.'),
  ingredient('cheddar', 'Cheddar cremoso', 'g', 1000, 40, 'A cotar', '', 'R$ 40/kg é apenas uma hipótese de simulação. Não encontramos preço local atual confirmado.', 100, 'estimate'),
  ingredient('cebola', 'Cebola', 'g', 1000, 4.97, 'Hiper Moreira · Coimbra', `${moreira}cebola-nacional-kg`),
  ingredient('alho', 'Alho', 'g', 1000, 14.97, 'Hiper Moreira · Coimbra', `${moreira}alho-agranel-kg-a1`),
  ingredient('molho', 'Molho de tomate', 'g', 340, 3.29, 'Hiper Moreira · Coimbra', `${moreira}molho-de-tomate-goialli-340g-tradicional`, 'Goialli tradicional.'),
  ingredient('oleo', 'Óleo de soja', 'ml', 900, 8.99, 'Hiper Moreira · Coimbra', `${moreira}oleo-de-soja-comigo-900ml`, 'Comigo, 900 ml.'),
  ingredient('sal', 'Sal', 'g', 1000, 4, 'A cotar', '', 'R$ 4/kg é uma hipótese de orçamento.', 100, 'estimate'),
  ingredient('manteiga', 'Manteiga', 'g', 500, 31.19, 'Hiper Moreira · Coimbra', `${moreira}manteiga-de-primeira-qualidade-sem-sal-piracanjuba-pote-500g`),
  ingredient('creme', 'Creme de leite', 'g', 200, 3.89, 'Hiper Moreira · Coimbra', `${moreira}creme-de-leite-uht-leve-homogeneizado-italac-caixa-200g`, 'Italac.'),
  ingredient('ketchup', 'Ketchup', 'g', 380, 14.9, 'Hiper Moreira · Coimbra', `${moreira}ketchup-predilecta-zero-squeeze-380g`, 'Referência provisória Predilecta Zero. Cotar ketchup comum antes de definir a receita.'),
  ingredient('mostarda', 'Mostarda', 'g', 190, 11.19, 'Hiper Moreira · Coimbra', `${moreira}mostarda-amarela-quero-squeeze-190g`),
  ingredient('milho', 'Milho verde', 'g', 200, 5.49, 'Nata Online · Goiânia', 'https://www.nataonline.com.br/', 'Fugini 200 g anunciado. Conferir peso drenado: o rendimento de 85% é apenas hipótese.', 85),
  ingredient('brocolis', 'Brócolis', 'g', 300, 11.19, 'Hiper Moreira · Coimbra', `${moreira}brocolis-ramoso`, 'Aliança, 300 g. Rendimento de 85% é hipótese.', 85),
  ingredient('champignon', 'Champignon', 'g', 200, 32.9, 'Hiper Moreira · Coimbra', `${moreira}cogumelo-champignon-em-conserva-fatiado-aica-selecao-premium-vidro-200g`, 'Preço anunciado, porém indisponível. 200 g drenados; não usar 580 g de peso líquido para calcular a porção.', 100, 'unavailable'),
  ingredient('batata-palha', 'Batata palha', 'g', 110, 7.99, 'Hiper Moreira · Coimbra', `${moreira}batata-palha-moinho-fino-tradicional-110g`),
  ingredient('cheiro-verde', 'Cheiro-verde', 'g', 50, 3, 'A cotar', '', 'Preço e peso do maço são hipóteses; pesar antes de lançar o custo real.', 100, 'estimate'),
  ingredient('presunto', 'Presunto', 'g', 1000, null, '', '', '', 100, 'estimate'),
  ingredient('oregano', 'Orégano', 'g', 1000, null, '', '', '', 100, 'estimate'),
  ingredient('pote', 'Bandeja com tampa', 'un', 100, 99.99, 'JK Embalagens · Campinas', `${jk}bandeja-de-aluminio-4p-m170-215x170x40-100x1`, 'Alumínio 1.100 ml com tampa. Altura de 4 cm: testar fechamento com batata grande e recheios.', 100, 'reference', 'packaging'),
  ingredient(X_SALAD_PACKAGING_ID, 'Embalagem plástica de X-salada', 'un', 1, null, '', '', 'Informe quantas embalagens usa por pedido. Deixe 0 se não usar esta embalagem.', 100, 'estimate', 'packaging', 0),
  ingredient('saco', 'Saco para retirada', 'un', 100, 80.5, 'JK Embalagens · Campinas', `${jk}saco-papel-p-delivery-25kg`, '31 × 37 × 18 cm. Testar o conjunto com a bandeja; frete de compra não incluído.', 100, 'reference', 'packaging'),
  ingredient('talher', 'Garfo descartável', 'un', 1000, 60, 'Potência · Goiânia', 'https://www.potenciaembalagens.com.br/descartaveis/garfo-refeicao-linha-pratica-leve', '', 100, 'reference', 'packaging'),
  ingredient('guardanapo', 'Guardanapo', 'un', 50, 2.8, 'JK Embalagens · Campinas', `${jk}guardanapo-30x30-50x1`, 'Florax 30 × 30 cm. Dois por pedido na simulação.', 100, 'reference', 'packaging', 2),
];

export function normalizeMeasureUnit(unit) {
  if (unit === 'g' || unit === 'kg') return 'g';
  if (unit === 'ml' || unit === 'l') return 'ml';
  return unit === 'un' ? 'un' : null;
}

const purchaseMeasures = {
  g: { unit: 'kg', scale: 1000 },
  kg: { unit: 'kg', scale: 1 },
  ml: { unit: 'L', scale: 1000 },
  l: { unit: 'L', scale: 1 },
  un: { unit: 'un', scale: 1 },
};

export function purchaseMeasure(unit) {
  return Object.hasOwn(purchaseMeasures, unit) ? purchaseMeasures[unit] : undefined;
}

export function packageSizeFactor(catalogUnit, purchaseUnit) {
  const baseUnit = normalizeMeasureUnit(catalogUnit);
  if (!baseUnit || baseUnit !== normalizeMeasureUnit(purchaseUnit)) return null;
  return purchaseMeasure(catalogUnit).scale / purchaseMeasure(purchaseUnit).scale;
}

export function readCustomIngredients(values = {}) {
  let parsed;
  try { parsed = JSON.parse(values[CUSTOM_CATALOG_FIELD] || '[]'); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item) =>
    item && typeof item === 'object' &&
    typeof item.id === 'string' && /^custom-[a-f0-9-]{8,64}$/i.test(item.id) &&
    typeof item.name === 'string' && item.name.trim().length > 0 &&
    ['food', 'packaging'].includes(item.type) &&
    ['g', 'kg', 'ml', 'l', 'un'].includes(item.unit) &&
    item.custom === true
  ).map((item) => ({ ...item, category: ['ingredient', 'beverage', 'packaging', 'material'].includes(item.category) ? item.category : (item.type === 'packaging' ? 'packaging' : 'ingredient'), name: item.name.trim() }));
}

export function serializeCustomIngredients(items) {
  return JSON.stringify(items.filter((item) =>
    item && typeof item.id === 'string' && /^custom-[a-f0-9-]{8,64}$/i.test(item.id) &&
    typeof item.name === 'string' && item.name.trim() &&
    ['food', 'packaging'].includes(item.type) && ['g', 'kg', 'ml', 'l', 'un'].includes(item.unit)
  ).map((item) => ({ ...item, category: ['ingredient', 'beverage', 'packaging', 'material'].includes(item.category) ? item.category : (item.type === 'packaging' ? 'packaging' : 'ingredient'), name: item.name.trim(), custom: true })));
}

export const cheeses = [{ id: 'mucarela', name: 'Muçarela' }, { id: 'cheddar', name: 'Cheddar' }, { id: 'requeijao', name: 'Requeijão' }, { id: 'misto', name: 'Muçarela + cheddar' }, { id: 'nenhum', name: 'Sem queijo' }];
export const fillings = [
  { id: 'frango', name: 'Frango cremoso', parts: { frango: 70, requeijao: 22, molho: 5, cebola: 2, alho: 1 } },
  { id: 'bacon', name: 'Creme com bacon', parts: { bacon: 40, requeijao: 55, cebola: 5 } },
  { id: 'calabresa', name: 'Calabresa cremosa', parts: { calabresa: 75, requeijao: 17, molho: 5, cebola: 2, alho: 1 } },
  { id: 'strogonoff', name: 'Strogonoff de frango', parts: { frango: 60, creme: 24, molho: 5, ketchup: 5, mostarda: 2, cebola: 3, alho: 1 } },
  { id: 'carne-sol', name: 'Carne de sol', parts: { 'carne-sol': 75, requeijao: 19, manteiga: 3, cebola: 2, alho: 1 } },
  { id: 'milho', name: 'Milho cremoso', vegetarian: true, parts: { milho: 75, requeijao: 23, cebola: 2 } },
  { id: 'brocolis', name: 'Brócolis cremoso', vegetarian: true, parts: { brocolis: 70, requeijao: 25, manteiga: 3, cebola: 2 } },
  { id: 'champignon', name: 'Champignon cremoso', vegetarian: true, parts: { champignon: 70, requeijao: 25, manteiga: 3, cebola: 2 } },
  { id: 'pizza', name: 'Pizza', parts: { presunto: 68, requeijao: 28, manteiga: 3.5, oregano: 0.5 } },
];
export const menuFlavors = [
  { id: 'pizza', name: 'Pizza', fillings: ['pizza'], cheese: 'mucarela', palha: 0, assembly: 'Requeijão, presunto picado, muçarela, orégano e mais requeijão por cima.' },
  { id: 'bacon', name: 'Bacon', fillings: ['bacon'], cheese: 'misto', assembly: 'Requeijão, bacon picado e frito, muçarela e cheddar.' },
  { id: 'calabresa', name: 'Calabresa', fillings: ['calabresa'], cheese: 'misto', assembly: 'Requeijão, calabresa ralada, muçarela e cheddar.' },
  { id: 'frango', name: 'Frango', fillings: ['frango'], cheese: 'misto', assembly: 'Requeijão, frango refogado e desfiado, mais requeijão e cheddar.' },
];
export const presets = [
  { name: 'Frango cremoso', fillings: ['frango'], cheese: 'mucarela' },
  { name: 'Frango com bacon', fillings: ['frango', 'bacon'], cheese: 'mucarela' },
  { name: 'Calabresa cremosa', fillings: ['calabresa'], cheese: 'mucarela' },
  { name: 'Strogonoff de frango', fillings: ['strogonoff'], cheese: 'mucarela', palha: 10 },
  { name: 'Carne de sol', fillings: ['carne-sol'], cheese: 'mucarela' },
  { name: 'Suprema da Casa', fillings: ['frango', 'bacon', 'calabresa'], cheese: 'misto' },
  { name: 'Vegetariana', fillings: ['milho', 'brocolis'], cheese: 'mucarela' },
];

export const defaultFields = Object.fromEntries([
  [CUSTOM_CATALOG_FIELD, '[]'],
  ...Object.entries({ ...DEFAULT_BUDGET_SETTINGS, packagingPerUnit: 0, palhaGrams: 0, greensGrams: 2, lossPercent: 5 }).map(([id, value]) => [`settings.${id}`, value]),
  ...ingredients.flatMap((item) => [['price', item.price], ['packageSize', item.packageSize], ['yieldPercent', item.yieldPercent], ...(item.type === 'packaging' ? [['amount', item.amount]] : [])].map(([field, value]) => [`ingredients.${item.id}.${field}`, value])),
  ...fillings.flatMap((item) => Object.entries(item.parts).map(([id, value]) => [`recipes.${item.id}.${id}`, value])),
  ['simulation.cheeseId', 'mucarela'], ['simulation.fillings', ['frango']], [PIZZA_MODE_FIELD, false],
]);

export function getSettings(values) {
  return Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith('settings.')).map(([key, value]) => [key.slice(9), value]));
}
export function ingredientValues(item, values) {
  const price = values[`ingredients.${item.id}.price`];
  const packageSize = values[`ingredients.${item.id}.packageSize`];
  const { scale } = purchaseMeasure(item.unit);
  const unitPrice = Number.isFinite(price) ? price / packageSize * scale : NaN;
  return { price, packageSize, yieldPercent: item.id === 'batata' ? 100 : values[`ingredients.${item.id}.yieldPercent`], unitPrice, amount: values[`ingredients.${item.id}.amount`] ?? item.amount };
}

// The price paid and the quantity it covers must be written together.
export function getIngredientPurchaseEdit(item, price, quantity, purchaseUnit, catalog = ingredients) {
  const catalogItem = catalog.find((known) => known.id === item?.id);
  if (!catalogItem || item.unit !== catalogItem.unit) return null;
  if (price !== null || catalogItem.price !== null) {
    if (!Number.isFinite(price) || price < 0 || price > MAX_PURCHASE_PRICE) return null;
  }
  const factor = packageSizeFactor(item.unit, purchaseUnit);
  if (!factor || !Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_PACKAGE_SIZE / factor) return null;
  return {
    [`ingredients.${catalogItem.id}.price`]: price,
    [`ingredients.${catalogItem.id}.packageSize`]: quantity * factor,
  };
}

export function getIngredientPriceEdit(item, unitPrice, catalog = ingredients) {
  const measure = purchaseMeasure(item?.unit);
  if (!measure || !Number.isFinite(unitPrice)) return null;
  return getIngredientPurchaseEdit(item, unitPrice, 1, measure.unit.toLowerCase(), catalog);
}

export function recipePartIds(filling, values, catalog) {
  const savedCustomParts = catalog.filter((item) => {
    const value = values[`recipes.${filling.id}.${item.id}`];
    return item.custom && item.type === 'food' && value !== undefined && value !== 0;
  });
  return [...Object.keys(filling.parts), ...savedCustomParts.map(({ id }) => id)];
}

export function recipeAdditionPath(fillingId, item) {
  return `recipes.${fillingId}.${item.custom ? 'extra-' : ''}${item.id}`;
}

export function recipeAdditions(filling, values, catalog) {
  return catalog.flatMap((item) => {
    const path = recipeAdditionPath(filling.id, item);
    const quantity = values[path];
    return item.type === 'food' && !Object.hasOwn(filling.parts, item.id) && quantity !== undefined && quantity !== 0
      ? [{ item, path, quantity }]
      : [];
  });
}

// Component costs use the same unit conversion and preparation yield as the
// full portion, and exclude its reserve, packaging and operating costs.
function costQuantities(values, quantities, catalog = ingredients) {
  const entries = Object.entries(quantities).filter(([, quantity]) => quantity !== 0);
  if (!entries.length) return 0;
  const rows = [];
  for (const [id, quantity] of entries) {
    const item = catalog.find((ingredient) => ingredient.id === id && ingredient.type === 'food');
    if (!item) return null;
    rows.push({ id, name: item.name, unit: normalizeMeasureUnit(item.unit), quantity, ...ingredientValues(item, values) });
  }
  return calculateBudget({ rows }).ingredientCost;
}

export function estimate(values, selection) {
  const settings = getSettings(values);
  const customIngredients = readCustomIngredients(values);
  const catalog = [...ingredients, ...customIngredients];
  const selectedMenu = selection ?? (values[PIZZA_MODE_FIELD] ? menuFlavors[0] : undefined);
  const selectedFillings = selectedMenu?.fillings ?? values['simulation.fillings'];
  const cheese = selectedMenu?.cheese ?? values['simulation.cheeseId'];
  const portions = distributeFillings(selectedFillings, settings.fillingTotalGrams);
  const baseQuantities = { batata: settings.potatoGrams, oleo: settings.oilMl, sal: settings.saltGrams, 'batata-palha': selectedMenu?.palha ?? settings.palhaGrams, 'cheiro-verde': settings.greensGrams };
  const quantities = { ...baseQuantities };
  const cheeseQuantities = cheese === 'misto'
    ? { mucarela: settings.cheeseGrams / 2, cheddar: settings.cheeseGrams / 2 }
    : cheese === 'nenhum' ? {} : { [cheese]: settings.cheeseGrams };
  const costs = {
    base: Object.fromEntries(Object.entries(baseQuantities).map(([id, quantity]) => [id, costQuantities(values, { [id]: quantity }, catalog)])),
    cheese: costQuantities(values, cheeseQuantities, catalog),
    fillings: [],
    fillingsTotal: null,
  };
  const alerts = [...portions.alerts];
  const add = (id, quantity) => { quantities[id] = (quantities[id] ?? 0) + quantity; };
  for (const [id, quantity] of Object.entries(cheeseQuantities)) add(id, quantity);
  for (const portion of portions.portions) {
    const filling = fillings.find((item) => item.id === portion.id);
    if (!filling) {
      alerts.push({ severity: 'error', message: 'Recheio desconhecido.' });
      costs.fillings.push({ ...portion, cost: null });
      continue;
    }
    const partIds = recipePartIds(filling, values, catalog);
    const parts = partIds.map((id) => [id, values[`recipes.${filling.id}.${id}`]]);
    const additions = recipeAdditions(filling, values, catalog);
    const total = parts.reduce((sum, [, grams]) => sum + grams, 0);
    if (!(total > 0) || parts.some(([, grams]) => !Number.isFinite(grams) || grams < 0)) {
      alerts.push({ severity: 'error', message: `Informe a composição de ${filling.name}.` });
      costs.fillings.push({ ...portion, cost: null });
      continue;
    }
    const fillingQuantities = Object.fromEntries(parts.map(([id, grams]) => [id, portion.grams * grams / total]));
    for (const { item, path, quantity } of additions) {
      if (!Number.isFinite(quantity) || quantity <= 0) {
        alerts.push({ severity: 'error', field: path, message: `Confira a quantidade de ${item.name} na receita.` });
        continue;
      }
      fillingQuantities[item.id] = (fillingQuantities[item.id] ?? 0) + quantity;
    }
    for (const [id, quantity] of Object.entries(fillingQuantities)) add(id, quantity);
    costs.fillings.push({ ...portion, cost: costQuantities(values, fillingQuantities, catalog) });
  }
  if (portions.valid && costs.fillings.every((item) => Number.isFinite(item.cost))) {
    const total = costs.fillings.reduce((sum, item) => sum + item.cost, 0);
    costs.fillingsTotal = Number.isFinite(total) ? total : null;
  }
  const rows = catalog.filter((item) => item.type === 'food' && quantities[item.id] !== 0 && quantities[item.id] !== undefined).map((item) => ({ id: item.id, name: item.name, unit: normalizeMeasureUnit(item.unit), quantity: quantities[item.id], ...ingredientValues(item, values) }));
  const packaging = catalog.filter((item) => item.type === 'packaging').map((item) => ({ id: item.id, name: item.name, unit: item.unit, ...ingredientValues(item, values) }));
  const packagingCost = packaging.reduce((sum, item) => item.amount === 0 ? sum : sum + item.unitPrice * item.amount / purchaseMeasure(item.unit).scale, 0);
  const result = calculateBudget({ rows, settings: { ...settings, packagingPerUnit: settings.packagingPerUnit + packagingCost } });
  const allAlerts = [...alerts, ...result.alerts];
  return { ...result, catalog, customIngredients, valid: result.valid && portions.valid && !alerts.some((item) => item.severity === 'error'), alerts: allAlerts, portions: portions.portions, packaging, packagingCost, settings, cheese, selectedFillings, costs };
}
