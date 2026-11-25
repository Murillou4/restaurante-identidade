import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowSquareOut, WarningCircle } from '@phosphor-icons/react';
import {
  RESEARCH_DATE, ingredients, fillings, menuFlavors, cheeses, presets, ingredientValues,
  getIngredientPriceEdit, getIngredientPurchaseEdit, purchaseMeasure, packageSizeFactor,
  normalizeMeasureUnit, readCustomIngredients, serializeCustomIngredients, recipePartIds,
  recipeAdditionPath, recipeAdditions, CUSTOM_CATALOG_FIELD, PIZZA_MODE_FIELD, pizzaPurchaseIds,
  MAX_PURCHASE_PRICE, MAX_PACKAGE_SIZE, X_SALAD_PACKAGING_ID, isDeviceBudgetField, estimate,
} from './budgetCatalog';
import { defaultFields } from './sharedBudgetDefaults';
import { budgetHash, budgetTabs } from './navigation';
import BudgetThumbnail from './BudgetThumbnail';
import './budget.css';

const money = (value) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const number = (value, digits = 2) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { maximumFractionDigits: digits }) : '—';
const editableNumber = (value) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: 8 }) : '';
const priceInput = (value) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
const readDecimal = (value) => /^-?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value.trim()) ? Number(value.trim().replace(',', '.')) : NaN;
const searchText = (value) => value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');
const statuses = { reference: 'Preço de referência', estimate: 'Preço estimado', unavailable: 'Sem estoque na fonte' };
const purchaseLabels = { kg: 'quilo', L: 'litro', un: 'unidade' };
const purchaseUnitLabels = { kg: 'Quilos (kg)', g: 'Gramas (g)', l: 'Litros (L)', ml: 'Mililitros (ml)', un: 'Unidades (un)' };
const purchaseUnits = { g: ['kg', 'g'], ml: ['l', 'ml'], un: ['un'] };
const displayUnit = (unit) => unit === 'l' ? 'L' : unit;
const categories = { ingredient: 'Ingrediente', beverage: 'Bebida', packaging: 'Embalagem', material: 'Material' };
const isPackaging = (category) => category === 'packaging' || category === 'material';
const emptyNewItem = { name: '', category: 'ingredient', unit: 'kg', quantity: '1', price: '' };
const menuFillingIds = new Set(menuFlavors.map(({ id }) => id));
const ingredientById = Object.fromEntries(ingredients.map((item) => [item.id, item]));
const operationFields = [
  { id: 'energyPerUnit', label: 'Energia por batata', unit: 'R$', help: 'Gás e eletricidade: uma hipótese até medir a produção.' },
  { id: 'laborPerUnit', label: 'Trabalho por batata', unit: 'R$', help: 'Valor reservado para o trabalho de vocês.' },
  { id: 'packagingPerUnit', label: 'Outros itens de embalagem', unit: 'R$', help: 'Só itens fora dos pacotes cadastrados, como etiqueta ou lacre.' },
  { id: 'fixedMonthly', label: 'Custos fixos mensais', unit: 'R$', help: 'Custos que ainda não foram lançados por unidade.' },
  { id: 'unitsMonthly', label: 'Batatas por mês', unit: 'un', positive: true, integer: true, help: 'Volume previsto para distribuir os custos fixos.' },
  { id: 'lossPercent', label: 'Reserva adicional para perdas', unit: '%', max: 100, help: 'Somente perdas extras, além do rendimento de preparo.' },
  { id: 'taxPercent', label: 'Impostos sobre a venda', unit: '%', max: 100, help: 'Hipótese editável conforme a forma de operação.' },
  { id: 'feePercent', label: 'Taxa média de pagamento', unit: '%', max: 100, help: 'Informe a taxa da maquininha ou do meio de pagamento. Use 0% quando não houver tarifa, como no Pix ou dinheiro sem cobrança.' },
];

const settingLabels = {
  potatoGrams: 'Batata por porção', oilMl: 'Óleo por porção', saltGrams: 'Sal por porção',
  cheeseGrams: 'Quantidade total de queijo', fillingTotalGrams: 'Peso total dos recheios',
  palhaGrams: 'Batata palha', greensGrams: 'Cheiro-verde', chosenPrice: 'Preço que quer cobrar',
  targetMarginPercent: 'Lucro desejado',
  ...Object.fromEntries(operationFields.map((field) => [field.id, field.label])),
};
function conflictLabel(path, catalog) {
  const [group, id, field] = path.split('.');
  if (group === 'settings') return settingLabels[id] ?? 'Ajuste da operação';
  if (group === 'ingredients') {
    const item = catalog.find((entry) => entry.id === id);
    const unit = purchaseLabels[purchaseMeasure(item?.unit)?.unit];
    return `${item?.name ?? 'Item'}: ${field === 'unitPrice' ? `preço por ${unit}` : { price: 'preço pago', packageSize: 'quantidade comprada', yieldPercent: 'rendimento', amount: 'quantidade por pedido' }[field] ?? 'valor'}`;
  }
  if (group === 'recipes') return `${fillings.find((item) => item.id === id)?.name ?? 'Recheio'}: ${catalog.find((item) => item.id === field)?.name ?? 'ingrediente'}`;
  return id === 'cheeseId' ? 'Queijo por cima' : 'Recheios selecionados';
}
function conflictValue(path, value, unit) {
  if (path === 'simulation.fillings') return Array.isArray(value) ? value.map((id) => fillings.find((item) => item.id === id)?.name ?? 'Recheio não cadastrado').join(' + ') : 'Não definido';
  if (path === 'simulation.cheeseId') return cheeses.find((item) => item.id === value)?.name ?? 'Não definido';
  if (!Number.isFinite(value)) return 'Não definido';
  if (unit) return `${money(value)} / ${unit}`;
  if (path === 'settings.targetMarginPercent') return `${number(value, 8)}%`;
  const currency = path.endsWith('.price') || ['energyPerUnit', 'laborPerUnit', 'packagingPerUnit', 'fixedMonthly', 'chosenPrice'].some((id) => path === `settings.${id}`);
  return currency ? `R$ ${editableNumber(value)}` : number(value, 8);
}

function NumberField({ path, label, value, edit, onValidity, unit, prefix, help, context, cost, currency = false, hideLabel = false, positive = false, max, integer = false, disabled = false }) {
  const id = useId();
  const focused = useRef(false);
  const hasLocalError = useRef(false);
  const format = currency ? priceInput : editableNumber;
  const [draft, setDraft] = useState(() => format(value));
  const [error, setError] = useState('');
  useEffect(() => {
    // An invalid draft is still the user's edit, even if another device refreshes.
    if (!focused.current && !hasLocalError.current) { setDraft(format(value)); setError(''); onValidity(path, null); }
  }, [value, path, onValidity, format]);
  useEffect(() => () => onValidity(path, null), [path, onValidity]);
  const change = (event) => {
    const text = event.target.value;
    setDraft(text);
    const parsed = readDecimal(unit === '%' ? text.replace(/%\s*$/, '') : text);
    let message = '';
    if (!Number.isFinite(parsed)) message = unit === '%' ? 'Informe uma porcentagem. Use vírgula para os decimais.' : 'Informe um número. Use vírgula para os centavos.';
    else if (positive ? parsed <= 0 : parsed < 0) message = positive ? 'O valor precisa ser maior que zero.' : 'O valor não pode ser negativo.';
    else if (max !== undefined && parsed > max) message = `O máximo é ${max}${unit === '%' ? '%' : ''}.`;
    else if (integer && !Number.isSafeInteger(parsed)) message = 'Use uma quantidade inteira.';
    hasLocalError.current = Boolean(message);
    setError(message);
    onValidity(path, message ? `${context ? `${context}: ` : ''}${label} — ${message}` : null);
    if (!message) edit(path, parsed);
  };
  return <div className={`budget-field ${error ? 'has-error' : ''}`}>
    <label htmlFor={id} className={hideLabel ? 'budget-sr-only' : undefined}>{label}</label>
    <div className="budget-input-wrap">
      {prefix && <span className="budget-input-prefix" aria-hidden="true">{prefix}</span>}
      <input id={id} name={path} data-field-path={path} type="text" inputMode={integer ? 'numeric' : 'decimal'} autoComplete="off" value={draft} disabled={disabled} aria-label={context ? `${label}: ${context}` : undefined} aria-invalid={Boolean(error)} aria-describedby={[cost !== undefined ? `${id}-cost` : null, error || help ? `${id}-help` : null].filter(Boolean).join(' ') || undefined} onChange={change} onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; if (!error) setDraft(format(value)); }} />
      {unit && <span aria-hidden="true">{unit}</span>}
    </div>
    {cost !== undefined && <small id={`${id}-cost`} className="budget-field-cost"><span>Custo da porção</span><strong>{money(error ? null : cost)}</strong></small>}
    {(error || help) && <small id={`${id}-help`} className={error ? 'budget-field-error' : ''}>{error || help}</small>}
  </div>;
}

function configurationErrors(values) {
  const errors = [];
  const catalog = [...ingredients, ...readCustomIngredients(values)];
  for (const item of catalog) {
    const data = ingredientValues(item, values);
    const canWaitForPrice = data.price === null && (pizzaPurchaseIds.includes(item.id) || (item.id === X_SALAD_PACKAGING_ID && data.amount === 0));
    if ((!Number.isFinite(data.price) || data.price < 0) && !canWaitForPrice) errors.push({ path: `ingredients.${item.id}.unitPrice`, message: `Confira o preço de ${item.name}.` });
    if (!Number.isFinite(data.packageSize) || data.packageSize <= 0) errors.push({ path: `ingredients.${item.id}.packageSize`, message: `Confira a quantidade comprada de ${item.name}.` });
    if (!Number.isFinite(data.yieldPercent) || data.yieldPercent <= 0 || data.yieldPercent > 100) errors.push({ path: `ingredients.${item.id}.yieldPercent`, message: `Confira o rendimento de ${item.name}.` });
    if (item.type === 'packaging' && (!Number.isFinite(data.amount) || data.amount < 0)) errors.push({ path: `ingredients.${item.id}.amount`, message: `Confira a quantidade de ${item.name} por pedido.` });
  }
  for (const filling of fillings) {
    const partIds = recipePartIds(filling, values, catalog);
    const weights = partIds.map((id) => values[`recipes.${filling.id}.${id}`]);
    if (weights.some((weight) => !Number.isFinite(weight) || weight < 0) || !(weights.reduce((sum, weight) => sum + weight, 0) > 0)) errors.push({ path: `recipes.${filling.id}.${Object.keys(filling.parts)[0]}`, message: `Confira a composição de ${filling.name}.` });
    for (const { item, path, quantity } of recipeAdditions(filling, values, catalog)) {
      if (!Number.isFinite(quantity) || quantity <= 0) errors.push({ path, message: `Confira a quantidade de ${item.name} na receita.` });
    }
  }
  if (!cheeses.some((item) => item.id === values['simulation.cheeseId'])) errors.push({ path: 'simulation.cheeseId', message: 'Escolha uma opção de queijo válida.' });
  for (const field of ['palhaGrams', 'greensGrams']) if (!Number.isFinite(values[`settings.${field}`]) || values[`settings.${field}`] < 0) errors.push({ path: `settings.${field}`, message: `Confira o peso de ${settingLabels[field]}.` });
  return errors;
}

function CustomItemOptions({ item, disabled, onMetadataChange, onRemove }) {
  const [name, setName] = useState(item.name);
  useEffect(() => setName(item.name), [item.name]);

  function updateName() {
    const next = name.trim();
    if (next && next !== item.name) onMetadataChange(item.id, { name: next });
    else setName(item.name);
  }

  return <>
    <div className="budget-custom-meta">
      <div className="budget-field">
        <label htmlFor={`custom-name-${item.id}`}>Nome do item</label>
        <input id={`custom-name-${item.id}`} value={name} maxLength={80} onChange={(event) => setName(event.target.value)} onBlur={updateName} disabled={disabled} />
      </div>
      {item.unit !== 'un' && <div className="budget-field">
        <label htmlFor={`custom-unit-${item.id}`}>Medida cadastrada</label>
        <select id={`custom-unit-${item.id}`} value={item.unit} disabled={disabled} onChange={(event) => onMetadataChange(item.id, { unit: event.target.value })}>
          {purchaseUnits[normalizeMeasureUnit(item.unit)].map((unit) => <option key={unit} value={unit}>{purchaseUnitLabels[unit]}</option>)}
        </select>
      </div>}
      <div className="budget-field">
        <label htmlFor={`custom-category-${item.id}`}>Categoria</label>
        <select id={`custom-category-${item.id}`} value={item.category} disabled={disabled} onChange={(event) => {
          const category = event.target.value;
          onMetadataChange(item.id, { category, type: isPackaging(category) ? 'packaging' : 'food' });
        }}>
          {Object.entries(categories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>
    </div>
    <button type="button" className="budget-button secondary" disabled={disabled} onClick={() => onRemove(item.id)}>Remover item</button>
  </>;
}

function IngredientRow({ item, catalog, values, fieldProps, editMany, onMetadataChange, onRemove, hidden }) {
  const unitId = useId();
  const [selectedUnit, setSelectedUnit] = useState(null);
  const data = ingredientValues(item, values);
  const { unit, scale } = purchaseMeasure(item.unit);
  const path = `ingredients.${item.id}`;
  const edited = data.price !== item.price || data.packageSize !== item.packageSize;
  const rawUnit = displayUnit(item.unit);
  const isCount = unit === 'un';
  const baseUnit = normalizeMeasureUnit(item.unit);
  const packageUnit = selectedUnit ?? (data.packageSize < scale ? baseUnit : unit.toLowerCase());
  const factor = packageSizeFactor(item.unit, packageUnit);
  const deviceOnly = isDeviceBudgetField(`${path}.price`);
  const isXSaladPackaging = item.id === X_SALAD_PACKAGING_ID;

  function editUnitPrice(_path, price) {
    const changes = getIngredientPriceEdit(item, price, catalog);
    if (changes) editMany(changes);
  }

  function editPackagePrice(_path, price) {
    const changes = getIngredientPurchaseEdit(item, price, data.packageSize, item.unit, catalog);
    if (changes) editMany(changes);
  }

  function editPackageQuantity(_path, quantity) {
    const changes = getIngredientPurchaseEdit(item, data.price, quantity, packageUnit, catalog);
    if (changes) {
      setSelectedUnit(packageUnit);
      editMany(changes);
    }
  }

  return <article className="budget-ingredient" hidden={hidden}>
    <div className="budget-purchase-row">
      <div className="budget-purchase-info">
        <BudgetThumbnail id={item.id} />
        <div>
          <h3>{item.name}</h3>
          {deviceOnly
            ? <small className="budget-purchase-status">{data.price === null ? 'Informe o preço' : 'Neste aparelho'}</small>
            : !item.custom && !edited && <small className="budget-purchase-status">{statuses[item.status]}</small>}
        </div>
      </div>
      <NumberField {...fieldProps} path={`${path}.unitPrice`} label={`Preço por ${purchaseLabels[unit]}`} value={data.unitPrice} edit={editUnitPrice} prefix="R$" unit={`/ ${unit}`} context={item.name} currency hideLabel max={MAX_PURCHASE_PRICE} />
    </div>
    <details className="budget-package">
      <summary>Calcular pelo pacote<span className="budget-sr-only"> de {item.name}</span></summary>
      <div className={`budget-ingredient-inputs${isCount ? '' : ' budget-package-fields'}`}>
        <NumberField {...fieldProps} path={`${path}.price`} label="Preço pago" value={data.price} prefix="R$" context={item.name} edit={editPackagePrice} max={MAX_PURCHASE_PRICE} />
        <NumberField key={packageUnit} {...fieldProps} path={`${path}.packageSize`} label={isCount ? 'Unidades no pacote' : 'Quantidade comprada'} value={data.packageSize / factor} unit={displayUnit(packageUnit)} context={item.name} edit={editPackageQuantity} positive max={MAX_PACKAGE_SIZE / factor} />
        {!isCount && <div className="budget-field">
          <label htmlFor={unitId}>Medida da compra</label>
          <select id={unitId} aria-label={`Medida da compra: ${item.name}`} value={packageUnit} disabled={fieldProps.disabled} onChange={(event) => setSelectedUnit(event.target.value)}>
            {purchaseUnits[baseUnit].map((choice) => <option key={choice} value={choice}>{purchaseUnitLabels[choice]}</option>)}
          </select>
        </div>}
        {isXSaladPackaging && <NumberField {...fieldProps} path={`${path}.amount`} label="Quantidade por pedido" value={data.amount} unit={rawUnit} context={item.name} help={item.note} />}
      </div>
      <details className="budget-price-reference">
        <summary>Detalhes de {item.name}</summary>
        <div className="budget-ingredient-inputs">
          {item.type === 'packaging' && !isXSaladPackaging
            ? <NumberField {...fieldProps} path={`${path}.amount`} label="Quantidade por pedido" value={data.amount} unit={rawUnit} context={item.name} />
            : item.type === 'food' && item.id !== 'batata' && <NumberField {...fieldProps} path={`${path}.yieldPercent`} label="Quanto sobra após o preparo" value={data.yieldPercent} unit="%" context={item.name} positive max={100} help="Use 100% se o ingrediente for aproveitado inteiro." />}
        </div>
        {item.custom ? <CustomItemOptions item={item} disabled={fieldProps.disabled} onMetadataChange={onMetadataChange} onRemove={onRemove} /> : <>
          {item.store && <p className="budget-source-note">{item.store} · {RESEARCH_DATE} · {money(item.price)} por {number(item.packageSize, 3)} {rawUnit}</p>}
          {deviceOnly && <p className="budget-source-note">Os valores deste item ficam neste aparelho.</p>}
          {item.note && !isXSaladPackaging && <p className="budget-source-note">{item.note}</p>}
          {item.source && <a className="budget-source-link" href={item.source} target="_blank" rel="noopener noreferrer">Ver fonte <ArrowSquareOut size={14} aria-hidden="true" /></a>}
        </>}
      </details>
    </details>
  </article>;
}

function ComparisonTable({ values, apply, disabled, invalid }) {
  return <div className="budget-table-scroll"><table className="budget-comparison"><caption>Sete sugestões para comparar, sem definir o cardápio.</caption><thead><tr><th scope="col">Sugestão de sabor</th><th scope="col">Combinação</th><th scope="col">Custo completo</th><th scope="col">Preço sugerido</th><th scope="col"><span className="budget-sr-only">Aplicar à simulação</span></th></tr></thead><tbody>
    {presets.map((preset) => {
      const result = estimate(values, { ...preset, palha: preset.palha ?? 0 });
      return <tr key={preset.name}><th scope="row">{preset.name}</th><td>{preset.fillings.map((id) => fillings.find((item) => item.id === id)?.name).join(' + ')}<small>{cheeses.find((item) => item.id === preset.cheese)?.name}{preset.palha ? ` · ${preset.palha} g de palha` : ''}</small></td><td>{result.valid && !invalid ? money(result.fullCost) : 'Revisar valores'}</td><td>{result.valid && !invalid ? money(result.suggestedPrice) : '—'}</td><td><button type="button" className="budget-button secondary" onClick={() => apply(preset)} disabled={disabled}>Usar na simulação<span className="budget-sr-only">: {preset.name}</span></button></td></tr>;
    })}
  </tbody></table></div>;
}

function ResultPanel({ result, values, fieldProps, unavailable, warnings, children }) {
  const shown = (value) => unavailable ? null : value;
  const packaging = result.packagingCost + result.settings.packagingPerUnit;
  const hasLoss = !unavailable && result.netUnit < 0;
  return <>
    <div className="budget-results">
      <div className="budget-main-metrics">
        <dl><dt>Custo por batata</dt><dd>{money(shown(result.fullCost))}</dd></dl>
        <div className="budget-suggested-metric">
          <dl><dt>Preço sugerido</dt><dd>{money(shown(result.suggestedPrice))}</dd></dl>
          <NumberField
            {...fieldProps}
            path="settings.targetMarginPercent"
            label={settingLabels.targetMarginPercent}
            value={values['settings.targetMarginPercent']}
            unit="%"
            max={100}
            help="% do preço de venda."
          />
        </div>
      </div>
      <div className="budget-sale-test">
        <NumberField {...fieldProps} path="settings.chosenPrice" label="Preço que quer cobrar" value={values['settings.chosenPrice']} prefix="R$" currency />
        <dl className={`budget-net-metric ${hasLoss ? 'is-negative' : ''}`}>
          <dt>{hasLoss ? 'Prejuízo por batata' : 'Quanto sobra por batata'}</dt>
          <dd>{money(shown(hasLoss ? -result.netUnit : result.netUnit))}</dd>
        </dl>
      </div>
    </div>
    {children}
    <details className="budget-disclosure budget-result-details"><summary>Ver detalhes da conta</summary>
    <p className="budget-help">O lucro desejado é a parte do preço de venda que sobra depois dos custos e das taxas.</p>
    <dl className="budget-breakdown">
      <div><dt>Ingredientes</dt><dd>{money(shown(result.ingredientCost))}</dd></div>
      <div><dt>Reserva adicional para perdas</dt><dd>{money(shown(result.lossCost))}</dd></div>
      <div><dt>Embalagem e itens extras</dt><dd>{money(shown(packaging))}</dd></div>
      <div><dt>Energia</dt><dd>{money(shown(result.settings.energyPerUnit))}</dd></div>
      <div><dt>Trabalho</dt><dd>{money(shown(result.settings.laborPerUnit))}</dd></div>
      <div className="budget-subtotal"><dt>Custos variáveis</dt><dd>{money(shown(result.variableCost))}</dd></div>
      <div><dt>Rateio dos fixos do negócio</dt><dd>{money(shown(result.settings.fixedMonthly / result.settings.unitsMonthly))}</dd></div>
      <div><dt>Taxas de pagamento</dt><dd>{money(shown(result.feeCost))}</dd></div>
      <div><dt>Impostos ({number(result.settings.taxPercent)}%)</dt><dd>{money(shown(result.taxCost))}</dd></div>
    </dl>
    </details>
    <details className="budget-disclosure budget-result-details"><summary>Ver projeção do mês</summary>
    <p className="budget-help">Considera {number(result.settings.unitsMonthly, 0)} batatas vendidas no mês, todas com esta composição.</p>
    <div className="budget-monthly"><div><span>Resultado mensal estimado</span><strong>{money(shown(result.netMonthly))}</strong></div><div><span>Ponto de equilíbrio</span><strong>{!unavailable && result.breakEvenUnits !== null ? `${number(result.breakEvenUnits, 0)} batatas` : 'Não calculável'}</strong></div></div>
    <div className="budget-contribution"><span>Contribuição antes dos fixos</span><strong>{money(shown(result.contribution))}</strong><small>{number(shown(result.contributionMarginPercent))}% do preço testado. Esse valor ainda paga os custos fixos.</small></div>
    {!unavailable && warnings.map((message) => <p key={message} className="budget-help">{message}</p>)}
    </details>
  </>;
}

function fieldTab(path) {
  if (path.startsWith('ingredients.')) return 'custos';
  if (path.startsWith('recipes.')) return 'receitas';
  return operationFields.some(({ id }) => path === `settings.${id}`) ? 'operacao' : 'simular';
}

function alertPath(item, result) {
  const path = item.field ?? '';
  if (/^(settings|ingredients|recipes|simulation)\./.test(path)) return path;
  if (path.startsWith('rows.')) {
    const [, index, field] = path.split('.');
    const ingredient = result.rows[Number(index)];
    if (ingredient) return `ingredients.${ingredient.id}.${field === 'yieldPercent' ? 'yieldPercent' : 'unitPrice'}`;
  }
  if (path === 'fillingTotalGrams') return 'settings.fillingTotalGrams';
  if (path.startsWith('fillings') || item.message === 'Recheio desconhecido.') return 'simulation.fillings';
  const filling = fillings.find((entry) => item.message.includes(entry.name));
  if (filling) return `recipes.${filling.id}.${Object.keys(filling.parts)[0]}`;
  if (path === 'suggestedPrice' || path === 'percentRate') return 'settings.targetMarginPercent';
  if (path === 'breakEvenUnits') return 'settings.unitsMonthly';
  return 'settings.chosenPrice';
}

function RecipeAddForm({ items, recipeName, disabled, onAdd }) {
  const ingredientId = useId();
  const amountId = useId();
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const selected = items.find((item) => item.id === selectedId);

  function submit(event) {
    event.preventDefault();
    if (!selected) return;
    const quantity = readDecimal(amount);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Informe uma quantidade maior que zero.');
      return;
    }
    onAdd(selected, quantity);
    setSelectedId('');
    setAmount('');
    setError('');
    event.currentTarget.closest('details').open = false;
  }

  return <details className="budget-recipe-add">
    <summary>Adicionar ingrediente<span className="budget-sr-only"> a {recipeName}</span></summary>
    {items.length > 0 && <form onSubmit={submit} noValidate>
      <div className="budget-recipe-inputs">
        <div className="budget-field">
          <label htmlFor={ingredientId}>Ingrediente</label>
          <select id={ingredientId} value={selected ? selectedId : ''} disabled={disabled} onChange={(event) => {
            setSelectedId(event.target.value);
            setAmount('');
            setError('');
          }}>
            <option value="">Escolha um ingrediente</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className={`budget-field${error ? ' has-error' : ''}`}>
          <label htmlFor={amountId}>Quantidade por batata</label>
          <div className="budget-input-wrap">
            <input id={amountId} value={amount} inputMode="decimal" disabled={disabled || !selected} aria-invalid={Boolean(error)} aria-describedby={error ? `${amountId}-error` : undefined} onChange={(event) => {
              setAmount(event.target.value);
              setError('');
            }} />
            {selected && <span>{normalizeMeasureUnit(selected.unit)}</span>}
          </div>
          {error && <small className="budget-field-error" id={`${amountId}-error`} role="alert">{error}</small>}
        </div>
      </div>
      <button type="submit" className="budget-button primary" disabled={disabled || !selected}>Adicionar à receita</button>
    </form>}
    <a className="text-link" href={budgetHash('custos')}>Cadastrar ingrediente em Preços de compra</a>
  </details>;
}

export default function Budget({ sharedBudget, deviceBudget, activeTab = 'simular', onTabChange }) {
  const tab = budgetTabs.some((item) => item.id === activeTab) ? activeTab : 'simular';
  const rootRef = useRef(null);
  const [pendingFocus, setPendingFocus] = useState(null);
  const [query, setQuery] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSaved, setShowSaved] = useState(false);
  const [newItem, setNewItem] = useState(emptyNewItem);
  const [newItemError, setNewItemError] = useState(null);
  const values = { ...defaultFields, ...sharedBudget.values, ...deviceBudget.fields };
  const customIngredients = readCustomIngredients(values);
  const catalog = [...ingredients, ...customIngredients];
  const result = estimate(values);
  const selected = Array.isArray(result.selectedFillings) ? result.selectedFillings : [];
  const pizza = values[PIZZA_MODE_FIELD];
  const combination = [...selected.map((id) => menuFlavors.find((item) => item.id === id)?.name ?? fillings.find((item) => item.id === id)?.name), cheeses.find((item) => item.id === result.cheese)?.name].filter(Boolean).join(' + ');
  const missingPrices = result.rows.filter(({ id, quantity }) => pizzaPurchaseIds.includes(id) && quantity > 0 && values[`ingredients.${id}.price`] === null);
  const missingPaths = new Set(missingPrices.map(({ id }) => `ingredients.${id}.unitPrice`));
  const inputErrors = configurationErrors(values);
  const localErrors = Object.entries(fieldErrors).map(([path, message]) => ({ path, message }));
  const calculationErrors = result.alerts.filter((item) => item.severity !== 'warning').map((item) => ({ path: alertPath(item, result), message: item.message })).filter((item) => !missingPaths.has(item.path));
  const allErrors = [...localErrors, ...inputErrors, ...calculationErrors];
  const errors = allErrors.filter((item, index) => allErrors.findIndex((entry) => entry.path === item.path) === index);
  const warnings = [...new Set(result.alerts.filter((item) => item.severity === 'warning').map((item) => item.message))];
  const priceConflicts = new Set();
  const confirmedValues = { ...defaultFields, ...sharedBudget.cloud?.fields };
  const confirmedCustomIngredients = readCustomIngredients(confirmedValues);
  const conflicts = (sharedBudget.conflicts ?? []).flatMap((conflict) => {
    const [group, id, field] = conflict.path.split('.');
    if (group !== 'ingredients' || !['price', 'packageSize'].includes(field)) return [conflict];
    const item = catalog.find((entry) => entry.id === id);
    const confirmedItem = ingredientById[id] ?? confirmedCustomIngredients.find((entry) => entry.id === id);
    if (!item || !confirmedItem || normalizeMeasureUnit(item.unit) !== normalizeMeasureUnit(confirmedItem.unit)) return [conflict];
    const local = ingredientValues(item, values).unitPrice;
    const remote = ingredientValues(confirmedItem, confirmedValues).unitPrice;
    if (priceInput(local) === priceInput(remote)) return [conflict];
    if (priceConflicts.has(id)) return [];
    priceConflicts.add(id);
    return [{ path: `ingredients.${id}.unitPrice`, remote, local, unit: purchaseMeasure(item.unit).unit }];
  });
  const invalid = errors.length > 0 || (!result.valid && missingPrices.length === 0);
  const connecting = sharedBudget.loading && !sharedBudget.cloud;
  const disabled = sharedBudget.saving || connecting;
  const canSave = !disabled && Boolean(sharedBudget.cloud) && sharedBudget.dirty > 0 && !invalid;
  useEffect(() => {
    if (!sharedBudget.notice) return;
    setShowSaved(true);
    const timer = window.setTimeout(() => setShowSaved(false), 5000);
    return () => window.clearTimeout(timer);
  }, [sharedBudget.notice]);
  const onValidity = useCallback((path, message) => {
    setFieldErrors((current) => {
      if (current[path] === message || (!message && !(path in current))) return current;
      const next = { ...current };
      if (message) next[path] = message; else delete next[path];
      return next;
    });
  }, []);
  function editMany(changes) {
    const deviceChanges = {};
    const sharedChanges = {};
    for (const [path, value] of Object.entries(changes)) {
      (isDeviceBudgetField(path) ? deviceChanges : sharedChanges)[path] = value;
    }
    if (Object.keys(deviceChanges).length) deviceBudget.edit(deviceChanges);
    if (Object.keys(sharedChanges).length) sharedBudget.editMany(sharedChanges);
  }

  const fieldProps = { edit: (path, value) => editMany({ [path]: value }), onValidity, disabled };
  const settingField = (id, label, unit, props = {}) => <NumberField key={id} {...fieldProps} path={`settings.${id}`} label={label} value={values[`settings.${id}`]} unit={unit} {...props} />;
  const shownCost = (cost) => invalid || connecting || missingPrices.length ? null : cost;
  const applyPreset = (preset) => {
    if (preset.id === 'pizza') deviceBudget.edit({ [PIZZA_MODE_FIELD]: true });
    else {
      if (pizza) deviceBudget.edit({ [PIZZA_MODE_FIELD]: false });
      sharedBudget.editMany({ 'simulation.fillings': [...preset.fillings], 'simulation.cheeseId': preset.cheese, 'settings.palhaGrams': preset.palha ?? 0 });
    }
    onTabChange?.('simular');
  };
  const chooseFilling = (id) => {
    const next = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
    if (next.length >= 1 && next.length <= 3) sharedBudget.edit('simulation.fillings', next);
  };
  const filter = searchText(query.trim());
  const filteredIngredients = catalog.filter((item) => searchText(item.name).includes(filter));
  const visibleIngredientIds = new Set(filteredIngredients.map((item) => item.id));
  const updateCustomMetadata = (id, patch) => {
    const current = customIngredients.find((item) => item.id === id);
    if (!current) return;
    const changes = {};
    if (patch.unit && patch.unit !== current.unit) {
      const factor = packageSizeFactor(patch.unit, current.unit);
      if (!factor) return;
      const data = ingredientValues(current, values);
      changes[`ingredients.${id}.price`] = data.price;
      changes[`ingredients.${id}.packageSize`] = data.packageSize * factor;
      if (Number.isFinite(data.amount)) changes[`ingredients.${id}.amount`] = data.amount * factor;
    }
    const next = customIngredients.map((item) => item.id === id ? { ...item, ...patch } : item);
    editMany({ ...changes, [CUSTOM_CATALOG_FIELD]: serializeCustomIngredients(next) });
  };
  const removeCustomIngredient = (id) => {
    const item = customIngredients.find((entry) => entry.id === id);
    if (!item || !window.confirm(`Remover ${item.name} do cadastro? Ele deixará de entrar nos cálculos futuros.`)) return;
    editMany({ [CUSTOM_CATALOG_FIELD]: serializeCustomIngredients(customIngredients.filter((entry) => entry.id !== id)) });
  };
  const changeNewItem = (patch) => {
    setNewItem((current) => ({ ...current, ...patch }));
    setNewItemError(null);
  };
  const addCustomIngredient = (event) => {
    event.preventDefault();
    const name = newItem.name.trim();
    const price = readDecimal(newItem.price);
    if (!Number.isFinite(price) || price < 0 || price > MAX_PURCHASE_PRICE) {
      setNewItemError({ field: 'price', message: 'Informe um preço válido. Use vírgula para os centavos.' });
      return;
    }
    const quantity = readDecimal(newItem.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_PACKAGE_SIZE) {
      setNewItemError({ field: 'quantity', message: 'Informe uma quantidade maior que zero.' });
      return;
    }
    if (!name) return;
    const id = `custom-${crypto.randomUUID()}`;
    const type = isPackaging(newItem.category) ? 'packaging' : 'food';
    const item = { id, name, category: newItem.category, type, unit: newItem.unit, custom: true, status: 'estimate', yieldPercent: 100, amount: 1 };
    const nextCatalog = [...customIngredients, item];
    const changes = {
      [CUSTOM_CATALOG_FIELD]: serializeCustomIngredients(nextCatalog),
      ...getIngredientPurchaseEdit(item, price, quantity, newItem.unit, nextCatalog),
      [`ingredients.${id}.yieldPercent`]: item.yieldPercent,
      [`ingredients.${id}.amount`]: item.amount,
    };
    editMany(changes);
    setNewItem(emptyNewItem);
    setNewItemError(null);
    setQuery('');
    event.currentTarget.closest('details').open = false;
    setPendingFocus(`ingredients.${id}.unitPrice`);
  };
  const findField = useCallback((path) => {
    const fields = Array.from(rootRef.current?.querySelectorAll('[data-field-path], [name]') ?? []).filter((element) => element.dataset.fieldPath === path || element.name === path);
    return fields.find((element) => !element.disabled) ?? fields[0];
  }, []);
  const openFieldDetails = (field) => {
    for (let ancestor = field?.parentElement; ancestor && ancestor !== rootRef.current; ancestor = ancestor.parentElement) {
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
    }
  };
  const goToField = (path, search = '') => {
    if (path.startsWith('ingredients.')) setQuery(search);
    onTabChange?.(fieldTab(path));
    setPendingFocus(path);
  };
  const errorPaths = errors.map((item) => item.path).join('|');
  useEffect(() => {
    // Every panel stays mounted, so a draft and its validation survive navigation.
    for (const path of errorPaths.split('|').filter(Boolean)) openFieldDetails(findField(path));
  }, [errorPaths, findField]);
  useEffect(() => {
    if (!pendingFocus || tab !== fieldTab(pendingFocus)) return;
    const field = findField(pendingFocus);
    if (!field || field.closest('[hidden]')) return;
    openFieldDetails(field);
    field.focus({ preventScroll: true });
    field.scrollIntoView({ block: 'center', behavior: 'auto' });
    setPendingFocus(null);
  }, [pendingFocus, tab, query, findField]);
  const keepErrorsVisible = (event) => {
    const detail = event.target;
    if (detail.tagName === 'DETAILS' && !detail.open && errors.some(({ path }) => detail.contains(findField(path)))) detail.open = true;
  };
  function recipeDetails(filling) {
    const flavor = menuFlavors.find(({ id }) => id === filling.id);
    const name = flavor?.name ?? filling.name;
    const partIds = recipePartIds(filling, values, catalog);
    const additions = recipeAdditions(filling, values, catalog);
    const usedIds = new Set([...partIds, ...additions.map(({ item }) => item.id)]);
    const available = catalog.filter((item) => item.type === 'food' && !usedIds.has(item.id))
      .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'));
    return <details key={filling.id} className="budget-disclosure budget-recipe">
      <summary>{name}</summary>
      {flavor && <p className="budget-help">{flavor.assembly}</p>}
      {filling.id === 'strogonoff' && <p className="budget-help">Frango em molho encorpado. A anotação de preparo também menciona bacon.</p>}
      <p className="budget-help">Proporções estimadas para calcular o custo. Ajuste com as medidas da receita.</p>
      {filling.id === 'pizza' && <p className="budget-help">A receita da Pizza e os preços de presunto e orégano ficam neste aparelho.</p>}
      <div className="budget-recipe-inputs">{partIds.map((id) => (
        <NumberField key={id} {...fieldProps} path={`recipes.${filling.id}.${id}`} label={catalog.find((item) => item.id === id)?.name ?? id} value={values[`recipes.${filling.id}.${id}`]} unit="partes" context={name} />
      ))}</div>
      {additions.length > 0 && <fieldset className="budget-recipe-additions">
        <legend>Ingredientes adicionados por batata</legend>
        <div className="budget-recipe-inputs">
          {additions.map(({ item, path, quantity }) => <div className="budget-recipe-added" key={path}>
            <NumberField {...fieldProps} path={path} label={item.name} value={quantity} unit={normalizeMeasureUnit(item.unit)} context={name} positive />
            <button className="text-link" type="button" aria-label={`Remover ${item.name} de ${name}`} disabled={disabled} onClick={() => editMany({ [path]: 0 })}>Remover</button>
          </div>)}
        </div>
      </fieldset>}
      <RecipeAddForm items={available} recipeName={name} disabled={disabled} onAdd={(item, quantity) => {
        const path = recipeAdditionPath(filling.id, item);
        editMany({ [path]: quantity });
        setPendingFocus(path);
      }} />
    </details>;
  }

  const saveStatus = sharedBudget.saving ? 'Salvando…'
    : invalid ? 'Corrija os campos sinalizados'
    : sharedBudget.cloud ? 'Alterações sem salvar' : 'Aguardando conexão';
  const hasDraft = sharedBudget.dirty > 0 || localErrors.length > 0 || sharedBudget.saving;
  const saved = Boolean(sharedBudget.notice && showSaved);

  return <section ref={rootRef} id="orcamento" className="budget" aria-labelledby="budget-title" onToggleCapture={keepErrorsVisible}>
    <header className="budget-header">
      <h1 id="budget-title">{budgetTabs.find((item) => item.id === tab).name}</h1>
      <span className="budget-load-status" role="status">
        {connecting ? 'Carregando caderno…' : ''}
      </span>
    </header>

    {(sharedBudget.error || sharedBudget.readError) && <div className="budget-alert error" role="alert">
      <WarningCircle size={20} aria-hidden="true" />
      <div>
        <p>{sharedBudget.error || sharedBudget.readError}</p>
        {!sharedBudget.error && sharedBudget.readError && <button type="button" className="text-link" onClick={sharedBudget.refresh} disabled={disabled}>Tentar carregar de novo</button>}
      </div>
    </div>}
    {deviceBudget.error && <p className="budget-alert error" role="alert">{deviceBudget.error}</p>}
    {conflicts.length > 0 && <section className="budget-conflicts" aria-labelledby="budget-conflict-title">
      <h2 id="budget-conflict-title">Mudanças em outro aparelho</h2>
      <div className="budget-table-scroll">
        <table>
          <thead><tr><th scope="col">Campo</th><th scope="col">Valor online</th><th scope="col">Sua edição</th></tr></thead>
          <tbody>{conflicts.map(({ path, remote, local, unit }) => <tr key={path}>
            <th scope="row">{conflictLabel(path, catalog)}</th><td>{conflictValue(path, remote, unit)}</td><td>{conflictValue(path, local, unit)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>}
    {errors.length > 0 && <div className="budget-alert error" role="alert">
      <WarningCircle size={20} aria-hidden="true" />
      <div>
        <strong>Confira os campos sinalizados.</strong>
        <ul>{errors.map(({ path, message }) => <li key={path}><button type="button" className="budget-error-link" onClick={() => goToField(path)}>{message}</button></li>)}</ul>
      </div>
    </div>}

    <div hidden={tab !== 'simular'}>
      {missingPrices.length > 0 && <div className="budget-missing-prices">
        <p>Para calcular o preço por batata, informe os preços abaixo.</p>
        <div>{missingPrices.map(({ id, name }) => <button key={id} type="button" className="text-link" onClick={() => goToField(`ingredients.${id}.unitPrice`, name)}>{name}</button>)}</div>
      </div>}
      <ResultPanel result={result} values={values} fieldProps={fieldProps} unavailable={invalid || connecting || missingPrices.length > 0} warnings={warnings}>
        <section className="budget-combination" aria-labelledby="budget-combination">
          <h2 id="budget-combination">Sabores do cartaz</h2>
          <div className="budget-flavors">
            {menuFlavors.map((flavor) => <button key={flavor.id} type="button" disabled={disabled} aria-pressed={selected.length === 1 && selected[0] === flavor.id} onClick={() => applyPreset(flavor)}>
              <BudgetThumbnail id={flavor.id} flavor />
              <span>{flavor.name}</span>
            </button>)}
          </div>
          <p><strong>Batata atual</strong> {combination}</p>
          <a className="text-link" href={budgetHash('receitas')}>Editar receitas</a>
          {!pizza && <details className="budget-disclosure">
            <summary>Mudar recheios e queijo</summary>
            <div className="budget-field budget-cheese">
              <label htmlFor="budget-cheese">Queijo</label>
              <select id="budget-cheese" name="simulation.cheeseId" data-field-path="simulation.cheeseId" value={values['simulation.cheeseId']} onChange={(event) => sharedBudget.edit('simulation.cheeseId', event.target.value)} disabled={disabled}>
                {cheeses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <fieldset className="budget-fieldset">
              <legend>Recheios</legend>
              <p className="budget-help">{selected.length === 3 ? 'Desmarque um recheio para trocar.' : 'Escolha até três recheios.'}</p>
              <div className="budget-filling-list">
                {fillings.filter((item) => (menuFillingIds.has(item.id) && item.id !== 'pizza') || selected.includes(item.id)).map((item) => <label key={item.id} className={`budget-filling ${selected.includes(item.id) ? 'selected' : ''}`}>
                  <input type="checkbox" name="simulation.fillings" data-field-path="simulation.fillings" checked={selected.includes(item.id)} disabled={disabled || (selected.includes(item.id) ? selected.length === 1 : selected.length >= 3)} onChange={() => chooseFilling(item.id)} />
                  <span>{item.name}{item.id === 'champignon' && <small className="budget-stock-note">Sem estoque na fonte</small>}</span>
                </label>)}
              </div>
            </fieldset>
          </details>}
          <details className="budget-disclosure">
            <summary>Ajustar porções</summary>
            <div className="budget-form-grid">
              {settingField('potatoGrams', 'Batata crua', 'g', { positive: true, cost: shownCost(result.costs.base.batata) })}
              {settingField('cheeseGrams', 'Queijo', 'g', { disabled: disabled || result.cheese === 'nenhum', cost: shownCost(result.costs.cheese) })}
              {settingField('fillingTotalGrams', 'Total de recheio', 'g', { positive: true, cost: shownCost(result.costs.fillingsTotal) })}
              {settingField('oilMl', 'Óleo', 'ml', { cost: shownCost(result.costs.base.oleo) })}
              {settingField('saltGrams', 'Sal', 'g', { cost: shownCost(result.costs.base.sal) })}
              {settingField('greensGrams', 'Cheiro-verde', 'g', { cost: shownCost(result.costs.base['cheiro-verde']) })}
              {settingField('palhaGrams', 'Batata palha', 'g', { cost: shownCost(result.costs.base['batata-palha']) })}
            </div>
            <p className="budget-help">O total de recheio é dividido igualmente entre as opções escolhidas.</p>
          </details>
        </section>
      </ResultPanel>
      <details className="budget-disclosure budget-purchase-details">
        <summary>Ver quantidades para comprar</summary>
        <div className="budget-table-scroll">
          <table className="budget-portion-table">
            <thead><tr><th scope="col">Ingrediente</th><th scope="col">Comprar por batata</th><th scope="col">Custo</th></tr></thead>
            <tbody>{result.rows.map((row) => {
              const { scale, unit } = purchaseMeasure(row.unit);
              return <tr key={row.id}><th scope="row">{row.name}</th><td>{shownCost(row.purchaseQuantity) === null ? '—' : `${number(row.purchaseQuantity / scale, 5)} ${unit}`}</td><td>{money(shownCost(row.cost))}</td></tr>;
            })}</tbody>
          </table>
        </div>
      </details>
    </div>

    <div hidden={tab !== 'custos'}>
      <div className="budget-purchases-toolbar">
        <div className="budget-field budget-search">
          <label htmlFor="budget-search">Buscar item</label>
          <input id="budget-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Batata, cebola, óleo…" />
        </div>
        <details className="budget-add-item">
          <summary>Adicionar item</summary>
          <form onSubmit={addCustomIngredient} noValidate>
            <div className="budget-add-grid">
              <div className="budget-field">
                <label htmlFor="new-item-name">Nome</label>
                <input id="new-item-name" required maxLength={80} value={newItem.name} onChange={(event) => changeNewItem({ name: event.target.value })} />
              </div>
              <div className="budget-field">
                <label htmlFor="new-item-category">Categoria</label>
                <select id="new-item-category" value={newItem.category} onChange={(event) => {
                  const category = event.target.value;
                  const unit = isPackaging(category) ? 'un' : category === 'beverage' ? 'l' : 'kg';
                  changeNewItem({ category, unit, quantity: '1' });
                }}>
                  {Object.entries(categories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </div>
              <div className="budget-field">
                <label htmlFor="new-item-unit">Medida da compra</label>
                <select id="new-item-unit" value={newItem.unit} onChange={(event) => {
                  const unit = event.target.value;
                  changeNewItem({ unit, quantity: unit === 'g' || unit === 'ml' ? '' : '1' });
                }}>
                  {Object.entries(purchaseUnitLabels).map(([unit, label]) => <option key={unit} value={unit}>{label}</option>)}
                </select>
              </div>
              <div className={`budget-field${newItemError?.field === 'quantity' ? ' has-error' : ''}`}>
                <label htmlFor="new-item-quantity">Quantidade comprada</label>
                <div className="budget-input-wrap">
                  <input id="new-item-quantity" required inputMode="decimal" value={newItem.quantity}
                    aria-invalid={newItemError?.field === 'quantity'} aria-describedby={newItemError?.field === 'quantity' ? 'new-item-quantity-error' : undefined}
                    onChange={(event) => changeNewItem({ quantity: event.target.value })} />
                  <span aria-hidden="true">{displayUnit(newItem.unit)}</span>
                </div>
                {newItemError?.field === 'quantity' && <small className="budget-field-error" id="new-item-quantity-error" role="alert">{newItemError.message}</small>}
              </div>
              <div className={`budget-field${newItemError?.field === 'price' ? ' has-error' : ''}`}>
                <label htmlFor="new-item-price">Preço pago</label>
                <div className="budget-input-wrap">
                  <span className="budget-input-prefix" aria-hidden="true">R$</span>
                  <input id="new-item-price" required inputMode="decimal" value={newItem.price}
                    aria-invalid={newItemError?.field === 'price'} aria-describedby={newItemError?.field === 'price' ? 'new-item-price-error' : undefined}
                    onChange={(event) => changeNewItem({ price: event.target.value })} />
                </div>
                {newItemError?.field === 'price' && <small className="budget-field-error" id="new-item-price-error" role="alert">{newItemError.message}</small>}
              </div>
            </div>
            <button type="submit" className="budget-button primary" disabled={disabled || !newItem.name.trim()}>Adicionar</button>
            <p className="budget-help">O item cadastrado fica neste aparelho.</p>
          </form>
        </details>
      </div>

      {['food', 'packaging'].map((type) => <section className="budget-cost-group" key={type} hidden={!filteredIngredients.some((item) => item.type === type)}>
        <h2>{type === 'food' ? 'Ingredientes e bebidas' : 'Embalagens e materiais'}</h2>
        {catalog.filter((item) => item.type === type).map((item) =>
          <IngredientRow key={item.id} item={item} catalog={catalog} values={values} fieldProps={fieldProps} editMany={editMany} onMetadataChange={updateCustomMetadata} onRemove={removeCustomIngredient} hidden={!visibleIngredientIds.has(item.id)} />
        )}
      </section>)}
      {!filteredIngredients.length && <div className="budget-empty">
        <p>Nenhum item encontrado.</p>
        <button type="button" className="text-link" onClick={() => setQuery('')}>Limpar busca</button>
      </div>}
    </div>

    <div className="budget-config-editor" hidden={tab !== 'receitas'}>
      <div className="budget-section-heading">
        <h2>Sabores do cartaz</h2>
        <p>A montagem começa com batata com casca, um pouco de manteiga e uma camada de requeijão.</p>
      </div>
      {menuFlavors.map(({ id }) => recipeDetails(fillings.find((filling) => filling.id === id)))}
      <details className="budget-disclosure budget-advanced">
        <summary>Receitas de teste</summary>
        {fillings.filter(({ id }) => !menuFillingIds.has(id)).map(recipeDetails)}
        <details className="budget-disclosure">
          <summary>Comparar sabores</summary>
          <ComparisonTable values={values} apply={applyPreset} disabled={disabled} invalid={invalid || connecting} />
        </details>
      </details>
    </div>

    <div className="budget-config-editor" hidden={tab !== 'operacao'}>
      {[
        { title: 'Custos por batata', ids: ['energyPerUnit', 'laborPerUnit', 'packagingPerUnit', 'lossPercent'] },
        { title: 'Custos fixos e vendas do mês', ids: ['fixedMonthly', 'unitsMonthly'] },
        { title: 'Impostos e taxas', ids: ['taxPercent', 'feePercent'] },
      ].map((group) => <fieldset key={group.title} className="budget-fieldset">
        <legend>{group.title}</legend>
        <div className="budget-operation-grid">{group.ids.map((id) => {
          const { label, unit, ...props } = operationFields.find((field) => field.id === id);
          return settingField(id, label, unit, props);
        })}</div>
      </fieldset>)}
    </div>

    <details className="budget-disclosure budget-advanced">
      <summary>Receitas e despesas</summary>
      <nav aria-label="Receitas e despesas">
        {budgetTabs.slice(2).map(({ id, name }) => <a key={id} href={budgetHash(id)} aria-current={tab === id ? 'page' : undefined}>{name}</a>)}
      </nav>
    </details>

    {(hasDraft || saved) && <div className="budget-savebar">
      <div className="budget-save-inner">
        <span className="budget-save-status" role="status">{hasDraft ? saveStatus : 'Salvo'}</span>
        {hasDraft && <button type="button" className="budget-button primary" onClick={() => sharedBudget.save()} disabled={!canSave}>Salvar</button>}
      </div>
    </div>}
  </section>;
}
