import { calculateBudget, distributeFillings, DEFAULT_BUDGET_SETTINGS } from './budgetMath.js';

export const RESEARCH_DATE = '06/10/2026';
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
  ingredient('pote', 'Bandeja com tampa', 'un', 100, 99.99, 'JK Embalagens · Campinas', `${jk}bandeja-de-aluminio-4p-m170-215x170x40-100x1`, 'Alumínio 1.100 ml com tampa. Altura de 4 cm: testar fechamento com batata grande e recheios.', 100, 'reference', 'packaging'),
  ingredient('saco', 'Saco delivery', 'un', 100, 80.5, 'JK Embalagens · Campinas', `${jk}saco-papel-p-delivery-25kg`, '31 × 37 × 18 cm. Testar conjunto; frete não incluído.', 100, 'reference', 'packaging'),
  ingredient('talher', 'Garfo descartável', 'un', 1000, 60, 'Potência · Goiânia', 'https://www.potenciaembalagens.com.br/descartaveis/garfo-refeicao-linha-pratica-leve', '', 100, 'reference', 'packaging'),
  ingredient('guardanapo', 'Guardanapo', 'un', 50, 2.8, 'JK Embalagens · Campinas', `${jk}guardanapo-30x30-50x1`, 'Florax 30 × 30 cm. Dois por pedido na simulação.', 100, 'reference', 'packaging', 2),
];

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
  ...Object.entries({ ...DEFAULT_BUDGET_SETTINGS, packagingPerUnit: 0, palhaGrams: 0, greensGrams: 2, lossPercent: 5 }).map(([id, value]) => [`settings.${id}`, value]),
  ...ingredients.flatMap((item) => [['price', item.price], ['packageSize', item.packageSize], ['yieldPercent', item.yieldPercent], ...(item.type === 'packaging' ? [['amount', item.amount]] : [])].map(([field, value]) => [`ingredients.${item.id}.${field}`, value])),
  ...fillings.flatMap((item) => Object.entries(item.parts).map(([id, value]) => [`recipes.${item.id}.${id}`, value])),
  ['simulation.cheeseId', 'mucarela'], ['simulation.fillings', ['frango']],
]);

export function getSettings(values) {
  return Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith('settings.')).map(([key, value]) => [key.slice(9), value]));
}
export function ingredientValues(item, values) {
  const price = values[`ingredients.${item.id}.price`];
  const packageSize = values[`ingredients.${item.id}.packageSize`];
  return { price, packageSize, yieldPercent: item.id === 'batata' ? 100 : values[`ingredients.${item.id}.yieldPercent`], unitPrice: price / packageSize * (item.unit === 'un' ? 1 : 1000), amount: values[`ingredients.${item.id}.amount`] ?? item.amount };
}

// Existing values keep their original package basis. Only an explicit unit-price
// edit creates this two-field patch for one atomic sharedBudget.editMany call.
// Prices are R$/kg for g, R$/L for ml and R$/unit for un; no rounding is applied.
export function getIngredientPriceEdit(item, unitPrice) {
  const catalogItem = ingredients.find((known) => known.id === item?.id);
  if (!catalogItem || item.unit !== catalogItem.unit || !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 10000000) return null;
  return {
    [`ingredients.${catalogItem.id}.price`]: unitPrice,
    [`ingredients.${catalogItem.id}.packageSize`]: catalogItem.unit === 'un' ? 1 : 1000,
  };
}

// Component costs use the same unit conversion and preparation yield as the
// full portion, and exclude its reserve, packaging and operating costs.
function costQuantities(values, quantities) {
  const entries = Object.entries(quantities);
  if (!entries.length) return 0;
  const rows = [];
  for (const [id, quantity] of entries) {
    const item = ingredients.find((ingredient) => ingredient.id === id && ingredient.type === 'food');
    if (!item) return null;
    rows.push({ id, name: item.name, unit: item.unit, quantity, ...ingredientValues(item, values) });
  }
  return calculateBudget({ rows }).ingredientCost;
}

export function estimate(values, selection) {
  const settings = getSettings(values);
  const selectedFillings = selection?.fillings ?? values['simulation.fillings'];
  const cheese = selection?.cheese ?? values['simulation.cheeseId'];
  const portions = distributeFillings(selectedFillings, settings.fillingTotalGrams);
  const baseQuantities = { batata: settings.potatoGrams, oleo: settings.oilMl, sal: settings.saltGrams, 'batata-palha': selection?.palha ?? settings.palhaGrams, 'cheiro-verde': settings.greensGrams };
  const quantities = { ...baseQuantities };
  const cheeseQuantities = cheese === 'misto'
    ? { mucarela: settings.cheeseGrams / 2, cheddar: settings.cheeseGrams / 2 }
    : cheese === 'nenhum' ? {} : { [cheese]: settings.cheeseGrams };
  const costs = {
    base: Object.fromEntries(Object.entries(baseQuantities).map(([id, quantity]) => [id, costQuantities(values, { [id]: quantity })])),
    cheese: costQuantities(values, cheeseQuantities),
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
    const parts = Object.keys(filling.parts).map((id) => [id, values[`recipes.${filling.id}.${id}`]]);
    const total = parts.reduce((sum, [, grams]) => sum + grams, 0);
    if (!(total > 0) || parts.some(([, grams]) => !Number.isFinite(grams) || grams < 0)) {
      alerts.push({ severity: 'error', message: `Informe a composição de ${filling.name}.` });
      costs.fillings.push({ ...portion, cost: null });
      continue;
    }
    const fillingQuantities = Object.fromEntries(parts.map(([id, grams]) => [id, portion.grams * grams / total]));
    for (const [id, quantity] of Object.entries(fillingQuantities)) add(id, quantity);
    costs.fillings.push({ ...portion, cost: costQuantities(values, fillingQuantities) });
  }
  if (portions.valid && costs.fillings.every((item) => Number.isFinite(item.cost))) {
    const total = costs.fillings.reduce((sum, item) => sum + item.cost, 0);
    costs.fillingsTotal = Number.isFinite(total) ? total : null;
  }
  const rows = ingredients.filter((item) => item.type === 'food' && quantities[item.id] !== 0 && quantities[item.id] !== undefined).map((item) => ({ id: item.id, name: item.name, unit: item.unit, quantity: quantities[item.id], ...ingredientValues(item, values) }));
  const packaging = ingredients.filter((item) => item.type === 'packaging').map((item) => ({ id: item.id, name: item.name, ...ingredientValues(item, values) }));
  const packagingCost = packaging.reduce((sum, item) => sum + item.unitPrice * item.amount, 0);
  const result = calculateBudget({ rows, settings: { ...settings, packagingPerUnit: settings.packagingPerUnit + packagingCost } });
  const allAlerts = [...alerts, ...result.alerts];
  return { ...result, valid: result.valid && portions.valid && !alerts.some((item) => item.severity === 'error'), alerts: allAlerts, portions: portions.portions, packaging, packagingCost, settings, cheese, selectedFillings, costs };
}
