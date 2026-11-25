import {
  defaultFields, estimate, fillings, ingredientValues, ingredients, menuFlavors,
  normalizeMeasureUnit, packageSizeFactor, presets, purchaseMeasure, readCustomIngredients,
} from './budgetCatalog.js';

export const PURCHASE_UNITS_FIELD = 'settings.purchaseUnits';

function calculateExport(values) {
  const preferences = values[PURCHASE_UNITS_FIELD] ?? {};
  const catalog = [...ingredients, ...readCustomIngredients(values)];
  const items = catalog.map((item) => {
    const data = ingredientValues(item, values);
    const base = normalizeMeasureUnit(item.unit);
    const factor = packageSizeFactor(base, item.unit);
    const measure = purchaseMeasure(item.unit);
    const usualUnit = data.packageSize < measure.scale ? base : measure.unit.toLowerCase();
    const unit = normalizeMeasureUnit(preferences[item.id]) === base ? preferences[item.id] : usualUnit;
    return {
      id: item.id, name: item.name,
      category: item.category ?? (item.type === 'packaging' ? 'packaging' : 'ingredient'),
      unit, quantity: data.packageSize > 0 ? data.packageSize * factor : factor,
      paid: Number.isFinite(data.price) && data.price >= 0 ? Math.round(data.price * 100) : null,
      yieldPercent: data.yieldPercent > 0 ? data.yieldPercent : 100,
      perOrder: item.type === 'packaging' ? (data.amount ?? 0) * factor : 0,
      archived: false,
    };
  });
  const recipes = fillings.map((filling) => {
    const menu = menuFlavors.find(({ id }) => id === filling.id);
    const preset = presets.find(({ fillings }) => fillings.length === 1 && fillings[0] === filling.id);
    const estimateForRecipe = estimate(values, menu ?? preset ?? {
      fillings: [filling.id], cheese: values['simulation.cheeseId'],
    });
    return {
      id: filling.id, name: menu?.name ?? filling.name, flavorId: menu?.id ?? null,
      automatic: false, archived: false,
      lines: estimateForRecipe.rows.filter(({ quantity }) => Number.isFinite(quantity) && quantity > 0)
        .map(({ id, quantity }) => ({ itemId: id, quantity: Math.round(quantity * 1e8) / 1e8 }))
        .filter(({ quantity }) => quantity > 0),
    };
  });
  const get = (key) => values['settings.' + key];
  const cents = (key) => Math.round(get(key) * 100);
  return {
    items, recipes,
    expenses: {
      energy: cents('energyPerUnit'), labor: cents('laborPerUnit'), otherPackaging: cents('packagingPerUnit'),
      fixedMonthly: cents('fixedMonthly'), monthlyUnits: get('unitsMonthly'), lossPercent: get('lossPercent'),
      taxPercent: get('taxPercent'), feePercent: get('feePercent'), marginPercent: get('targetMarginPercent'),
      referencePrice: cents('chosenPrice'),
    },
  };
}

function differences(shared, device) {
  const fromShared = new Map(shared.map((row) => [row.id, row]));
  const fromDevice = new Set(device.map((row) => row.id));
  const changed = device.filter((row) => JSON.stringify(row) !== JSON.stringify(fromShared.get(row.id)));
  return [...changed, ...shared.filter((row) => !fromDevice.has(row.id)).map((row) => ({ ...row, archived: true }))];
}

export async function createCostsExport(room, deviceFields) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(room.roomId));
  const source = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const shared = { ...defaultFields, ...room.fields };
  const baseline = calculateExport(shared);
  const device = calculateExport({ ...shared, ...deviceFields });
  return {
    format: 'grazi-costs-v1', source, revision: room.revision, baseline,
    device: { items: differences(baseline.items, device.items), recipes: differences(baseline.recipes, device.recipes) },
  };
}

export function downloadCostsExport(file) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = 'caderno-grazi-custos-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}
