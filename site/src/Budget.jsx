import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowClockwise, ArrowSquareOut, FloppyDisk, WarningCircle } from '@phosphor-icons/react';
import { RESEARCH_DATE, ingredients, fillings, cheeses, presets, ingredientValues, getIngredientPriceEdit } from './budgetCatalog';
import { defaultFields } from './sharedBudgetDefaults';
import { estimateChannel, salesChannels } from './salesChannels';
import SalesChannels, { channelLabels, monthlyLabels } from './SalesChannelPanel';
import { budgetTabs } from './navigation';
import './budget.css';

const money = (value) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const number = (value, digits = 2) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { maximumFractionDigits: digits }) : '—';
const editableNumber = (value) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: 8 }) : '';
const statuses = { reference: 'Referência de loja', estimate: 'Hipótese inicial', unavailable: 'Preço sem estoque' };
const ingredientById = Object.fromEntries(ingredients.map((item) => [item.id, item]));
const operationFields = [
  { id: 'energyPerUnit', label: 'Energia por batata', unit: 'R$', help: 'Gás e eletricidade: uma hipótese até medir a produção.' },
  { id: 'laborPerUnit', label: 'Trabalho por batata', unit: 'R$', help: 'Valor reservado para o trabalho de vocês.' },
  { id: 'packagingPerUnit', label: 'Outros itens de embalagem', unit: 'R$', help: 'Só itens fora dos pacotes cadastrados, como etiqueta ou lacre.' },
  { id: 'fixedMonthly', label: 'Custos fixos mensais', unit: 'R$', help: 'Custos que ainda não foram lançados por unidade.' },
  { id: 'unitsMonthly', label: 'Batatas por mês', unit: 'un', positive: true, integer: true, help: 'Volume previsto para distribuir os custos fixos.' },
  { id: 'lossPercent', label: 'Reserva adicional para perdas', unit: '%', max: 100, help: 'Somente perdas extras, além do rendimento de preparo.' },
  { id: 'taxPercent', label: 'Impostos sobre a venda', unit: '%', max: 100, help: 'Hipótese editável conforme a forma de operação.' },
  { id: 'targetMarginPercent', label: 'Margem desejada sobre a venda', unit: '%', max: 100, help: 'Depois dos ingredientes, taxas e rateio dos fixos.' },
];

const settingLabels = {
  potatoGrams: 'Batata por porção', oilMl: 'Óleo por porção', saltGrams: 'Sal por porção',
  cheeseGrams: 'Quantidade total de queijo', fillingTotalGrams: 'Peso total dos recheios',
  palhaGrams: 'Batata palha', greensGrams: 'Cheiro-verde', chosenPrice: 'Preço para testar',
  deliverySubsidy: 'Entrega própria paga pelo negócio', feePercent: 'Taxas da venda direta',
  ...Object.fromEntries(operationFields.map((field) => [field.id, field.label])),
};
function conflictLabel(path) {
  const [group, id, field] = path.split('.');
  if (group === 'settings') return settingLabels[id] ?? 'Ajuste da operação';
  if (group === 'channel') return channelLabels[id] ?? 'Ajuste do canal de venda';
  if (group === 'ingredients') {
    const item = ingredientById[id];
    const unit = item?.unit === 'g' ? 'kg' : item?.unit === 'ml' ? 'litro' : 'unidade';
    return `${item?.name ?? 'Insumo'}: ${field === 'unitPrice' ? `preço por ${unit}` : { price: 'valor registrado', packageSize: 'base de conversão', yieldPercent: 'rendimento', amount: 'quantidade por pedido' }[field] ?? 'valor'}`;
  }
  if (group === 'recipes') return `${fillings.find((item) => item.id === id)?.name ?? 'Recheio'}: ${ingredientById[field]?.name ?? 'parte da receita'}`;
  return id === 'cheeseId' ? 'Queijo por cima' : 'Recheios selecionados';
}
function conflictValue(path, value) {
  if (path === 'simulation.fillings') return Array.isArray(value) ? value.map((id) => fillings.find((item) => item.id === id)?.name ?? 'Recheio não cadastrado').join(' + ') : 'Não definido';
  if (path === 'simulation.cheeseId') return cheeses.find((item) => item.id === value)?.name ?? 'Não definido';
  if (path === 'channel.plan') return salesChannels.find((item) => item.id === value)?.name ?? 'Não definido';
  if (path === 'channel.monthlyExempt') return value === 1 ? 'Simular carência' : 'Mês normal';
  if (!Number.isFinite(value)) return 'Não definido';
  if (path.startsWith('ingredients.') && path.endsWith('.unitPrice')) return `${money(value)} / ${ingredientById[path.split('.')[1]]?.unit === 'g' ? 'kg' : ingredientById[path.split('.')[1]]?.unit === 'ml' ? 'L' : 'un'}`;
  const currency = path.endsWith('.price') || ['energyPerUnit', 'laborPerUnit', 'packagingPerUnit', 'deliverySubsidy', 'fixedMonthly', 'chosenPrice'].some((id) => path === `settings.${id}`) || ['basicMonthly', 'deliveryMonthly', 'monthlyThreshold', 'ifoodDeliverySubsidy', 'promotionPerUnit'].some((id) => path === `channel.${id}`);
  return currency ? `R$ ${editableNumber(value)}` : number(value, 8);
}

function NumberField({ path, label, value, edit, onValidity, unit, help, context, cost, positive = false, max, integer = false, disabled = false }) {
  const id = useId();
  const focused = useRef(false);
  const hasLocalError = useRef(false);
  const [draft, setDraft] = useState(() => editableNumber(value));
  const [error, setError] = useState('');
  useEffect(() => {
    // An invalid draft is still the user's edit, even if another device refreshes.
    if (!focused.current && !hasLocalError.current) { setDraft(editableNumber(value)); setError(''); onValidity(path, null); }
  }, [value, path, onValidity]);
  useEffect(() => () => onValidity(path, null), [path, onValidity]);
  const change = (event) => {
    const text = event.target.value;
    setDraft(text);
    const trimmed = text.trim();
    const parsed = /^-?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed) ? Number(trimmed.replace(',', '.')) : NaN;
    let message = '';
    if (!Number.isFinite(parsed)) message = 'Informe um número. Use vírgula para os centavos.';
    else if (positive ? parsed <= 0 : parsed < 0) message = positive ? 'O valor precisa ser maior que zero.' : 'O valor não pode ser negativo.';
    else if (max !== undefined && parsed > max) message = `O máximo é ${max}${unit === '%' ? '%' : ''}.`;
    else if (integer && !Number.isSafeInteger(parsed)) message = 'Use uma quantidade inteira.';
    hasLocalError.current = Boolean(message);
    setError(message);
    onValidity(path, message ? `${context ? `${context}: ` : ''}${label} — ${message}` : null);
    if (!message) edit(path, parsed);
  };
  return <div className={`budget-field ${error ? 'has-error' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <div className="budget-input-wrap"><input id={id} name={path} data-field-path={path} type="text" inputMode={integer ? 'numeric' : 'decimal'} autoComplete="off" value={draft} disabled={disabled} aria-label={context ? `${label}: ${context}` : undefined} aria-invalid={Boolean(error)} aria-describedby={[cost !== undefined ? `${id}-cost` : null, error || help ? `${id}-help` : null].filter(Boolean).join(' ') || undefined} onChange={change} onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; if (!error) setDraft(editableNumber(value)); }} />{unit && <span aria-hidden="true">{unit}</span>}</div>
    {cost !== undefined && <small id={`${id}-cost`} className="budget-field-cost"><span>Custo da porção</span><strong>{money(error ? null : cost)}</strong></small>}
    {(error || help) && <small id={`${id}-help`} className={error ? 'budget-field-error' : ''}>{error || help}</small>}
  </div>;
}

function configurationErrors(values) {
  const errors = [];
  for (const item of ingredients) {
    const data = ingredientValues(item, values);
    if (!Number.isFinite(data.price) || data.price < 0) errors.push({ path: `ingredients.${item.id}.unitPrice`, message: `Confira o preço de ${item.name}.` });
    if (!Number.isFinite(data.packageSize) || data.packageSize <= 0) errors.push({ path: `ingredients.${item.id}.unitPrice`, message: `Informe novamente o preço por ${item.unit === 'g' ? 'kg' : item.unit === 'ml' ? 'litro' : 'unidade'} de ${item.name}.` });
    if (!Number.isFinite(data.yieldPercent) || data.yieldPercent <= 0 || data.yieldPercent > 100) errors.push({ path: `ingredients.${item.id}.yieldPercent`, message: `Confira o rendimento de ${item.name}.` });
    if (item.type === 'packaging' && (!Number.isFinite(data.amount) || data.amount < 0)) errors.push({ path: `ingredients.${item.id}.amount`, message: `Confira a quantidade de ${item.name} por pedido.` });
  }
  for (const filling of fillings) {
    const weights = Object.keys(filling.parts).map((id) => values[`recipes.${filling.id}.${id}`]);
    if (weights.some((weight) => !Number.isFinite(weight) || weight < 0) || !(weights.reduce((sum, weight) => sum + weight, 0) > 0)) errors.push({ path: `recipes.${filling.id}.${Object.keys(filling.parts)[0]}`, message: `Confira a composição de ${filling.name}.` });
  }
  if (!cheeses.some((item) => item.id === values['simulation.cheeseId'])) errors.push({ path: 'simulation.cheeseId', message: 'Escolha uma opção de queijo válida.' });
  for (const field of ['palhaGrams', 'greensGrams']) if (!Number.isFinite(values[`settings.${field}`]) || values[`settings.${field}`] < 0) errors.push({ path: `settings.${field}`, message: `Confira o peso de ${settingLabels[field]}.` });
  return errors;
}

function IngredientRow({ item, values, fieldProps, editMany, hidden }) {
  const data = ingredientValues(item, values);
  const edited = data.price !== item.price || data.packageSize !== item.packageSize;
  const packaging = item.type === 'packaging';
  const baseUnit = item.unit === 'g' ? 'kg' : item.unit === 'ml' ? 'L' : 'un';
  const priceLabel = item.unit === 'g' ? 'Preço por kg' : item.unit === 'ml' ? 'Preço por litro' : 'Preço por unidade';
  const editPrice = (_, value) => {
    const changes = getIngredientPriceEdit(item, value);
    if (changes) editMany(changes);
  };
  return <article className="budget-ingredient" hidden={hidden}>
      <div className="budget-ingredient-info"><h4>{item.name}</h4><div className="budget-source-status"><span className={`budget-tag status-${item.status}`}>{edited ? 'Seu valor' : statuses[item.status]}</span><span>{item.store}</span></div>
    </div>
    <div className="budget-ingredient-inputs">
      <NumberField {...fieldProps} path={`ingredients.${item.id}.unitPrice`} label={priceLabel} value={data.unitPrice} unit={`R$/${baseUnit}`} context={item.name} max={10000000} edit={editPrice} help={item.id === 'batata' ? 'Valor do quilo de batata crua que você compra.' : undefined} />
      {packaging ? <NumberField {...fieldProps} path={`ingredients.${item.id}.amount`} label="Por pedido" value={data.amount} unit="un" context={item.name} /> : item.id !== 'batata' && <NumberField {...fieldProps} path={`ingredients.${item.id}.yieldPercent`} label="Rendimento após preparo" value={data.yieldPercent} unit="%" positive max={100} context={item.name} help="Quanto sobra depois de limpar ou preparar: 100% significa usar tudo." />}
    </div>
    {!packaging && data.yieldPercent !== 100 && <p className="budget-unit-price">Depois do preparo: {money(data.unitPrice / (data.yieldPercent / 100))} / {baseUnit} pronto.</p>}
    <details className="budget-price-reference"><summary>Referência da pesquisa</summary>
      <p className="budget-source-note">Valor pesquisado: {money(item.price / item.packageSize * (item.unit === 'un' ? 1 : 1000))} / {baseUnit} · {RESEARCH_DATE}.</p>
      {item.note && <p className="budget-source-note">{item.note}</p>}
      {item.source ? <a className="budget-source-link" href={item.source} target="_blank" rel="noopener noreferrer">Ver fonte <ArrowSquareOut size={14} aria-hidden="true" /></a> : <span className="budget-source-note">Sem cotação confirmada.</span>}
      {edited && <p className="budget-source-note">O preço usado na conta foi ajustado no caderno. Esta é a referência original.</p>}
    </details>
  </article>;
}

function ComparisonTable({ values, apply, disabled, invalid }) {
  return <div className="budget-table-scroll"><table className="budget-comparison"><caption>Sete sugestões para comparar, sem definir o cardápio.</caption><thead><tr><th scope="col">Sugestão de sabor</th><th scope="col">Combinação</th><th scope="col">Custo completo</th><th scope="col">Preço sugerido</th><th scope="col"><span className="budget-sr-only">Aplicar à simulação</span></th></tr></thead><tbody>
    {presets.map((preset) => {
      const result = estimateChannel(values, values['channel.plan'], { ...preset, palha: preset.palha ?? 0 });
      return <tr key={preset.name}><th scope="row">{preset.name}</th><td>{preset.fillings.map((id) => fillings.find((item) => item.id === id)?.name).join(' + ')}<small>{cheeses.find((item) => item.id === preset.cheese)?.name}{preset.palha ? ` · ${preset.palha} g de palha` : ''}</small></td><td>{result.valid && !invalid ? money(result.fullCost) : 'Revisar valores'}</td><td>{result.valid && !invalid ? money(result.suggestedPrice) : '—'}</td><td><button type="button" className="budget-button secondary" onClick={() => apply(preset)} disabled={disabled}>Usar na simulação<span className="budget-sr-only">: {preset.name}</span></button></td></tr>;
    })}
  </tbody></table></div>;
}

function ResultPanel({ result, values, fieldProps, invalidDraft }) {
  const shown = (value) => invalidDraft ? null : value;
  const packaging = result.packagingCost + result.settings.packagingPerUnit;
  return <aside className="budget-results" aria-labelledby="budget-result-title">
    <div className="budget-results-heading"><span className="budget-kicker">{result.channel.name}</span><h3 id="budget-result-title">Resultado da simulação</h3><p>Valores por batata, com os custos e as condições cadastrados.</p></div>
    <div className="budget-main-metrics">
      <div><span>Custo por batata</span><strong>{money(shown(result.fullCost))}</strong><small>Produção e rateio dos custos fixos, antes das taxas sobre a venda.</small></div>
      <div className="budget-suggested-metric"><span>Preço sugerido</span><strong>{money(shown(result.suggestedPrice))}</strong><small>Para a margem de {number(result.settings.targetMarginPercent)}% sobre a venda.</small></div>
      <div className={`budget-net-metric ${result.netUnit < 0 ? 'is-negative' : ''}`}><span>Quanto sobra por batata</span><strong>{money(shown(result.netUnit))}</strong><small>No preço testado de {money(shown(values['settings.chosenPrice']))}, depois dos custos, taxas e fixos.</small></div>
    </div>
    <NumberField {...fieldProps} path="settings.chosenPrice" label="Preço para testar" value={values['settings.chosenPrice']} unit="R$" help="Um cenário; ainda não é o preço do cardápio." />
    <details className="budget-disclosure budget-result-details"><summary>Ver composição dos custos</summary><dl className="budget-breakdown">
      <div><dt>Ingredientes</dt><dd>{money(shown(result.ingredientCost))}</dd></div>
      <div><dt>Reserva adicional para perdas</dt><dd>{money(shown(result.lossCost))}</dd></div>
      <div><dt>Embalagem e itens extras</dt><dd>{money(shown(packaging))}</dd></div>
      <div><dt>Energia</dt><dd>{money(shown(result.settings.energyPerUnit))}</dd></div>
      <div><dt>Trabalho</dt><dd>{money(shown(result.settings.laborPerUnit))}</dd></div>
      <div><dt>Entrega assumida</dt><dd>{money(shown(result.settings.deliverySubsidy))}</dd></div>
      {result.channel.id !== 'direct' && <div><dt>Promoção paga pela loja</dt><dd>{money(shown(result.channel.promotionPerUnit))}</dd></div>}
      <div className="budget-subtotal"><dt>Custos variáveis</dt><dd>{money(shown(result.variableCost))}</dd></div>
      <div><dt>Rateio dos fixos do negócio</dt><dd>{money(shown(result.channel.baseFixedMonthly / result.settings.unitsMonthly))}</dd></div>
      {result.channel.id !== 'direct' && <><div><dt>Mensalidade iFood por batata</dt><dd>{money(shown(result.channel.monthly / result.settings.unitsMonthly))}</dd></div><div><dt>Comissão ({number(result.channel.commissionPercent)}%)</dt><dd>{money(shown(result.channel.commissionCost))}</dd></div><div><dt>Pagamento online ({number(result.channel.effectivePaymentPercent)}% efetivos)</dt><dd>{money(shown(result.channel.paymentCost))}</dd></div>{result.channel.otherFeePercent > 0 && <div><dt>Taxas opcionais ({number(result.channel.otherFeePercent)}%)</dt><dd>{money(shown(result.channel.otherFeeCost))}</dd></div>}</>}
      {result.channel.id === 'direct' && <div><dt>Taxas de pagamento</dt><dd>{money(shown(result.feeCost))}</dd></div>}
      <div><dt>Impostos ({number(result.settings.taxPercent)}%)</dt><dd>{money(shown(result.taxCost))}</dd></div>
    </dl>
    {result.channel.id !== 'direct' && <p className="channel-result-note">Faturamento simulado: {money(shown(result.channel.grossMonthly))}. {monthlyLabels[result.channel.monthlyStatus]}: {money(shown(result.channel.monthly))}/mês. No preço sugerido, a mensalidade considerada é {money(shown(result.channel.suggestedMonthly))}/mês.</p>}
    </details>
    <details className="budget-disclosure budget-result-details"><summary>Ver projeção do mês</summary>
    <p className="budget-help">Considera {number(result.settings.unitsMonthly, 0)} batatas vendidas neste canal, todas com esta composição.</p>
    <div className="budget-monthly"><div><span>Resultado mensal estimado</span><strong>{money(shown(result.netMonthly))}</strong></div><div><span>Ponto de equilíbrio</span><strong>{!invalidDraft && result.breakEvenUnits !== null ? `${number(result.breakEvenUnits, 0)} batatas` : 'Não calculável'}</strong></div></div>
    <div className="budget-contribution"><span>Contribuição antes dos fixos</span><strong>{money(shown(result.contribution))}</strong><small>{number(shown(result.contributionMarginPercent))}% do preço testado. Esse valor ainda paga os custos fixos.</small></div>
    </details>
    <p className="budget-estimate-note">Estimativa com os custos cadastrados. Confiram compras e rendimento na prática; o resultado não é uma garantia de lucro.</p>
  </aside>;
}

function fieldTab(path) {
  if (path.startsWith('ingredients.')) return 'custos';
  if (path.startsWith('recipes.')) return 'receitas';
  if (path === 'channel.plan') return 'simular';
  if (path.startsWith('channel.') || ['settings.deliverySubsidy', 'settings.feePercent'].includes(path)) return 'canais';
  return operationFields.some(({ id }) => path === `settings.${id}`) ? 'operacao' : 'simular';
}

function alertPath(item, result) {
  const path = item.field ?? '';
  if (/^(settings|channel|ingredients|recipes|simulation)\./.test(path)) return path;
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

export default function Budget({ sharedBudget, activeTab = 'simular', onTabChange }) {
  const tab = budgetTabs.some((item) => item.id === activeTab) ? activeTab : 'simular';
  const rootRef = useRef(null);
  const [pendingFocus, setPendingFocus] = useState(null);
  const [query, setQuery] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const values = { ...defaultFields, ...sharedBudget.values };
  const selected = Array.isArray(values['simulation.fillings']) ? values['simulation.fillings'] : [];
  const result = estimateChannel(values);
  const inputErrors = configurationErrors(values);
  const localErrors = Object.entries(fieldErrors).map(([path, message]) => ({ path, message }));
  const allErrors = [...localErrors, ...inputErrors, ...result.alerts.filter((item) => item.severity !== 'warning').map((item) => ({ path: alertPath(item, result), message: item.message }))];
  const errors = allErrors.filter((item, index) => allErrors.findIndex((entry) => entry.path === item.path) === index);
  const warnings = [...new Set(result.alerts.filter((item) => item.severity === 'warning').map((item) => item.message))];
  const priceConflicts = new Set();
  const conflicts = (sharedBudget.conflicts ?? []).flatMap((conflict) => {
    const [group, id, field] = conflict.path.split('.');
    if (group !== 'ingredients' || !['price', 'packageSize'].includes(field) || !ingredientById[id]) return [conflict];
    if (priceConflicts.has(id)) return [];
    priceConflicts.add(id);
    return [{ path: `ingredients.${id}.unitPrice`, remote: ingredientValues(ingredientById[id], { ...defaultFields, ...sharedBudget.cloud?.fields }).unitPrice, local: ingredientValues(ingredientById[id], values).unitPrice }];
  });
  const invalid = !result.valid || errors.length > 0;
  const disabled = sharedBudget.saving || (sharedBudget.loading && !sharedBudget.cloud);
  const canSave = !disabled && Boolean(sharedBudget.cloud) && sharedBudget.dirty > 0 && !invalid;
  const onValidity = useCallback((path, message) => {
    setFieldErrors((current) => {
      if (current[path] === message || (!message && !(path in current))) return current;
      const next = { ...current };
      if (message) next[path] = message; else delete next[path];
      return next;
    });
  }, []);
  const fieldProps = { edit: sharedBudget.edit, onValidity, disabled };
  const settingField = (id, label, unit, props = {}) => <NumberField key={id} {...fieldProps} path={`settings.${id}`} label={label} value={values[`settings.${id}`]} unit={unit} {...props} />;
  const shownCost = (cost) => invalid ? null : cost;
  const applyPreset = (preset) => {
    sharedBudget.editMany({ 'simulation.fillings': [...preset.fillings], 'simulation.cheeseId': preset.cheese, 'settings.palhaGrams': preset.palha ?? 0 });
    onTabChange?.('simular');
  };
  const chooseFilling = (id) => {
    const next = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
    if (next.length >= 1 && next.length <= 3) sharedBudget.edit('simulation.fillings', next);
  };
  const tabKeys = (event) => {
    const index = budgetTabs.findIndex((item) => item.id === tab);
    const next = event.key === 'ArrowRight' ? (index + 1) % budgetTabs.length : event.key === 'ArrowLeft' ? (index + budgetTabs.length - 1) % budgetTabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? budgetTabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    onTabChange?.(budgetTabs[next].id);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();
  };
  const filteredIngredients = ingredients.filter((item) => `${item.name} ${item.store}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const visibleIngredientIds = new Set(filteredIngredients.map((item) => item.id));
  const findField = useCallback((path) => {
    const fields = Array.from(rootRef.current?.querySelectorAll('[data-field-path], [name]') ?? []).filter((element) => element.dataset.fieldPath === path || element.name === path);
    return fields.find((element) => !element.disabled) ?? fields[0];
  }, []);
  const openFieldDetails = (field) => {
    for (let ancestor = field?.parentElement; ancestor && ancestor !== rootRef.current; ancestor = ancestor.parentElement) {
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
    }
  };
  const goToField = (path) => {
    if (path.startsWith('ingredients.')) setQuery('');
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
  const saveStatus = sharedBudget.saving ? 'Salvando orçamento…' : sharedBudget.loading && !sharedBudget.cloud ? 'Carregando o orçamento compartilhado…' : sharedBudget.error ? 'O salvamento precisa de atenção' : sharedBudget.notice || (sharedBudget.dirty ? `${sharedBudget.dirty} ${sharedBudget.dirty === 1 ? 'alteração ainda não salva' : 'alterações ainda não salvas'}` : sharedBudget.cloud ? 'Valores compartilhados carregados' : 'Conecte para salvar o orçamento');

  return <section ref={rootRef} id="orcamento" className="budget page-width" aria-labelledby="budget-title" onToggleCapture={keepErrorsVisible}>
    <header className="budget-header"><div><span className="budget-kicker">PLANEJAMENTO DO DELIVERY</span><h1 id="budget-title">Quanto custa e por quanto vender?</h1><p>Montem uma batata, confiram o custo e testem o preço. Os valores de compra e as despesas ficam nas abas ao lado.</p></div><div className="budget-research-date"><strong>Pesquisa de preços</strong><span>{RESEARCH_DATE} · Goiânia e região</span></div></header>
    <div className="budget-savebar"><div><span className="budget-save-status" role="status">{saveStatus}</span><p>Editar recalcula nesta aba. Salvar envia o orçamento para vocês dois.</p></div><div className="budget-save-actions"><button type="button" className="budget-button secondary" onClick={sharedBudget.refresh} disabled={sharedBudget.saving || sharedBudget.loading} aria-label="Atualizar orçamento compartilhado"><ArrowClockwise size={18} aria-hidden="true" /><span>Atualizar</span></button><button type="button" className="budget-button primary" onClick={() => { if (canSave) sharedBudget.save(); }} disabled={!canSave}><FloppyDisk size={19} aria-hidden="true" />{sharedBudget.saving ? 'Salvando…' : 'Salvar orçamento'}</button></div></div>
    {sharedBudget.error && <div className="budget-alert error" role="alert"><WarningCircle size={20} aria-hidden="true" /><p>{sharedBudget.error}</p></div>}
    {conflicts.length > 0 && <section className="budget-conflicts" aria-labelledby="budget-conflict-title"><h3 id="budget-conflict-title">Confira as mudanças do outro aparelho.</h3><p>Suas edições continuam no formulário. Compare os valores abaixo e confira antes de clicar em Salvar novamente.</p><div className="budget-table-scroll"><table><thead><tr><th scope="col">Campo</th><th scope="col">Valor online</th><th scope="col">Sua edição</th></tr></thead><tbody>{conflicts.map((conflict) => <tr key={conflict.path}><th scope="row">{conflictLabel(conflict.path)}</th><td>{conflictValue(conflict.path, conflict.remote)}</td><td>{conflictValue(conflict.path, conflict.local)}</td></tr>)}</tbody></table></div></section>}
    {errors.length > 0 && <div className="budget-alert error" role="alert"><WarningCircle size={20} aria-hidden="true" /><div><strong>Revise os valores antes de salvar.</strong><p>Abra o campo indicado para corrigir. Suas edições continuam no formulário.</p><ul>{errors.map(({ path, message }) => <li key={path}><button type="button" className="budget-error-link" onClick={() => goToField(path)}>{message}<span> · Abrir {budgetTabs.find((item) => item.id === fieldTab(path))?.name}</span></button></li>)}</ul></div></div>}
    {warnings.map((message) => <div key={message} className="budget-alert warning"><WarningCircle size={20} aria-hidden="true" /><p>{message}</p></div>)}
    <div role="tablist" aria-label="Ferramentas do orçamento" className="budget-tabs">{budgetTabs.map((item) => <button key={item.id} type="button" role="tab" id={`budget-tab-${item.id}`} aria-selected={tab === item.id} aria-controls={`budget-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} onClick={() => onTabChange?.(item.id)} onKeyDown={tabKeys}>{item.name}</button>)}</div>
    <aside className="budget-compact-summary" hidden={tab === 'simular'} aria-label="Resumo da simulação atual"><div><span>Simulação atual · {result.channel.name}</span><p>Preço testado: <strong>{money(invalid ? null : values['settings.chosenPrice'])}</strong> · Sobra por batata: <strong>{money(invalid ? null : result.netUnit)}</strong></p></div><button type="button" className="text-link" onClick={() => onTabChange?.('simular')}>Voltar à simulação</button></aside>
    <div className="budget-panels">
      <div role="tabpanel" id="budget-panel-simular" aria-labelledby="budget-tab-simular" hidden={tab !== 'simular'} tabIndex={0}>
        <div className="budget-channel-bar"><div className="budget-field"><label htmlFor="budget-channel">Canal para simular</label><select id="budget-channel" name="channel.plan" data-field-path="channel.plan" value={values['channel.plan']} disabled={disabled} onChange={(event) => sharedBudget.edit('channel.plan', event.target.value)}>{salesChannels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><p>{values['channel.plan'] === 'direct' ? 'Vocês recebem os pedidos e organizam a entrega. Confiram as taxas e o frete em Vendas e entrega.' : salesChannels.find((item) => item.id === values['channel.plan'])?.description}</p><button type="button" onClick={() => onTabChange?.('canais')}>Comparar canais e ajustar condições</button></div></div>
        <div className="budget-workspace"><ResultPanel result={result} values={values} fieldProps={fieldProps} invalidDraft={invalid} /><div className="budget-editor">
        <div className="budget-section-heading"><h3>Monte uma batata</h3><p>Base + uma escolha de queijo + até três recheios.</p></div>
        <fieldset className="budget-fieldset"><legend>Base e complementos</legend><div className="budget-form-grid">
          {settingField('potatoGrams', 'Batata crua por porção', 'g', { positive: true, help: 'Peso da compra, antes de assar.', cost: shownCost(result.costs.base.batata) })}
          {settingField('oilMl', 'Óleo', 'ml', { cost: shownCost(result.costs.base.oleo) })}{settingField('saltGrams', 'Sal', 'g', { cost: shownCost(result.costs.base.sal) })}
          {settingField('greensGrams', 'Cheiro-verde', 'g', { cost: shownCost(result.costs.base['cheiro-verde']) })}{settingField('palhaGrams', 'Batata palha', 'g', { cost: shownCost(result.costs.base['batata-palha']) })}
        </div></fieldset>
        <fieldset className="budget-fieldset"><legend>Queijo por cima</legend><div className="budget-form-grid"><div className="budget-field"><label htmlFor="budget-cheese">Escolha do queijo</label><select id="budget-cheese" name="simulation.cheeseId" data-field-path="simulation.cheeseId" value={values['simulation.cheeseId']} onChange={(event) => sharedBudget.edit('simulation.cheeseId', event.target.value)} disabled={disabled}>{cheeses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>{settingField('cheeseGrams', 'Quantidade total de queijo', 'g', { disabled: disabled || values['simulation.cheeseId'] === 'nenhum', cost: shownCost(result.costs.cheese) })}</div><p className="budget-help">Separado do peso dos recheios. No queijo misto, metade muçarela e metade cheddar.</p></fieldset>
        <fieldset className="budget-fieldset"><legend>Recheios <span>{selected.length} de 3</span></legend>{settingField('fillingTotalGrams', 'Peso total dos recheios', 'g', { positive: true, cost: shownCost(result.costs.fillingsTotal) })}<div className="budget-filling-list">
          {fillings.map((item) => { const portion = result.costs.fillings.find((part) => part.id === item.id); return <label key={item.id} className={`budget-filling ${selected.includes(item.id) ? 'selected' : ''}`}><input type="checkbox" name="simulation.fillings" data-field-path="simulation.fillings" checked={selected.includes(item.id)} disabled={disabled || (!selected.includes(item.id) && selected.length >= 3) || (selected.includes(item.id) && selected.length === 1)} onChange={() => chooseFilling(item.id)} /><span>{item.name}{portion && <small className="budget-filling-cost">{number(portion.grams)} g · <strong>{money(shownCost(portion.cost))}</strong></small>}{item.vegetarian && <small>Sem carnes</small>}{item.id === 'champignon' && <small className="budget-stock-note">Referência sem estoque</small>}</span></label>; })}
        </div><p className="budget-help">{selected.length === 3 ? 'Para trocar um recheio, desmarque um dos três.' : 'Escolha de um a três. O peso total será dividido entre eles.'}</p><div className="budget-portions">{result.portions.map((portion) => <span key={portion.id}><strong>{number(portion.grams)} g</strong>{fillings.find((item) => item.id === portion.id)?.name}</span>)}</div></fieldset>
        <details className="budget-disclosure budget-purchase-details"><summary>Ver ingredientes e quantidades para comprar</summary><p className="budget-help">Para uma batata desta combinação. Batata: peso cru comprado. Nos recheios, os pesos são prontos para servir; a compra considera o rendimento de preparo.</p>
        <div className="budget-table-scroll"><table className="budget-portion-table"><thead><tr><th scope="col">Ingrediente</th><th scope="col">Peso da receita</th><th scope="col">Para comprar</th><th scope="col">Custo</th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.id}><th scope="row">{row.name}{row.id === 'batata' ? ' (crua)' : ''}</th><td>{number(shownCost(row.quantity))} {row.unit}</td><td>{number(shownCost(row.purchaseQuantity))} {row.unit}</td><td>{money(shownCost(row.cost))}</td></tr>)}</tbody></table></div>
        </details>
        </div></div>
      </div>
      <div role="tabpanel" id="budget-panel-custos" aria-labelledby="budget-tab-custos" className="budget-editor budget-config-editor" hidden={tab !== 'custos'} tabIndex={0}>
        <div className="budget-section-heading"><h3>Atualize com o preço do supermercado</h3><p>Digite o preço por <strong>kg</strong> dos ingredientes, por <strong>litro</strong> dos líquidos e por <strong>unidade</strong> das embalagens. Clique em <strong>Salvar orçamento</strong> para guardar os valores para vocês dois.</p></div>
        <div className="budget-price-guide"><strong>Batata a R$ 5,99/kg? É só digitar 5,99.</strong><p>O custo da quantidade usada na porção é calculado automaticamente. Não precisa informar o peso de um pacote.</p></div>
        <p className="budget-help">As referências iniciais foram coletadas em {RESEARCH_DATE}. Você pode substituir qualquer uma pelo preço da sua compra.</p>
        <div className="budget-status-legend"><span className="budget-tag status-reference">Referência de loja</span><span className="budget-tag status-estimate">Hipótese inicial</span><span className="budget-tag status-unavailable">Preço sem estoque</span></div>
        <p className="budget-help">O rendimento é a parte que sobra depois de limpar, escorrer ou cozinhar. Os percentuais iniciais são hipóteses; pesem o lote para ajustar. Frete de compra não incluído nos preços pesquisados.</p>
        <div className="budget-field budget-search"><label htmlFor="budget-search">Buscar ingrediente ou embalagem</label><input id="budget-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Frango, muçarela, bandeja…" /></div>
        {['food', 'packaging'].map((type) => <section key={type} className="budget-cost-group" hidden={!filteredIngredients.some((item) => item.type === type)}><h3>{type === 'food' ? 'Ingredientes' : 'Embalagens por pedido'}</h3>{type === 'packaging' && <p className="budget-help">Informe o preço de cada unidade e quantas vão em um pedido. Outros itens entram uma vez em Despesas e meta.</p>}{ingredients.filter((item) => item.type === type).map((item) => <IngredientRow key={item.id} item={item} values={values} fieldProps={fieldProps} editMany={sharedBudget.editMany} hidden={!visibleIngredientIds.has(item.id)} />)}</section>)}
        {!filteredIngredients.length && <div className="budget-empty"><h3>Nenhum item com esse nome.</h3><p>Busque outro ingrediente ou apague o texto para ver a lista completa.</p><button type="button" className="budget-button secondary" onClick={() => setQuery('')}>Limpar busca</button></div>}
      </div>
      <div role="tabpanel" id="budget-panel-receitas" aria-labelledby="budget-tab-receitas" className="budget-editor budget-config-editor" hidden={tab !== 'receitas'} tabIndex={0}>
        <div className="budget-section-heading"><h3>Sugestões para conversar</h3><p>Escolham uma sugestão em “Usar na simulação” para testar a combinação. A mudança só vai para o outro aparelho quando vocês salvarem.</p></div>
        <ComparisonTable values={values} apply={applyPreset} disabled={disabled} invalid={invalid} />
        <div className="budget-section-heading recipe-heading"><h3>Composição dos recheios</h3><p>São receitas de partida, ainda para testar. Abra o recheio que quiser ajustar.</p></div>
        <p className="budget-price-guide">As <strong>partes</strong> definem a proporção de cada ingrediente, e não o peso da porção. Exemplo: 50 partes de um total de 100 representam metade do recheio; em uma porção de 150 g, são 75 g.</p>
        {fillings.map((filling) => { const total = Object.keys(filling.parts).reduce((sum, id) => sum + values[`recipes.${filling.id}.${id}`], 0); return <details key={filling.id} className="budget-disclosure budget-recipe"><summary>{filling.name}<span>{number(total)} partes no total</span></summary><div className="budget-recipe-inputs">{Object.keys(filling.parts).map((id) => <NumberField key={id} {...fieldProps} path={`recipes.${filling.id}.${id}`} label={ingredientById[id].name} value={values[`recipes.${filling.id}.${id}`]} unit="partes" context={filling.name} />)}</div></details>; })}
      </div>
      <div role="tabpanel" id="budget-panel-canais" aria-labelledby="budget-tab-canais" className="budget-editor budget-config-editor" hidden={tab !== 'canais'} tabIndex={0}><SalesChannels values={values} edit={sharedBudget.edit} fieldProps={fieldProps} NumberField={NumberField} invalid={invalid} onTabChange={onTabChange} /></div>
      <div role="tabpanel" id="budget-panel-operacao" aria-labelledby="budget-tab-operacao" className="budget-editor budget-config-editor" hidden={tab !== 'operacao'} tabIndex={0}>
        <div className="budget-section-heading"><h3>Despesas e meta de venda</h3><p>Registrem os custos além da compra dos ingredientes e o volume que esperam vender. São hipóteses até medir a operação.</p></div>
        {[
          { title: 'Custos por batata', ids: ['energyPerUnit', 'laborPerUnit', 'packagingPerUnit', 'lossPercent'] },
          { title: 'Custos fixos e volume do mês', ids: ['fixedMonthly', 'unitsMonthly'] },
          { title: 'Impostos e margem desejada', ids: ['taxPercent', 'targetMarginPercent'] },
        ].map((group) => <fieldset key={group.title} className="budget-fieldset"><legend>{group.title}</legend><div className="budget-operation-grid">{group.ids.map((id) => { const { label, unit, ...props } = operationFields.find((field) => field.id === id); return settingField(id, label, unit, props); })}</div></fieldset>)}
        <p className="budget-help">Entrega e taxas de pagamento ficam em <button type="button" className="text-link" onClick={() => onTabChange?.('canais')}>Vendas e entrega</button>.</p>
        <details className="budget-disclosure budget-operation-note"><summary>Como os custos entram na conta</summary><p>Conte cada custo uma vez. Os rendimentos dos ingredientes já consideram perdas de preparo; a reserva adicional cobre outras perdas. O custo dos pacotes já entra em embalagem; registre aqui apenas os extras.</p><p>Preço sugerido = custo completo ÷ (1 − impostos − taxas − margem desejada). A margem é uma parte do preço de venda.</p></details>
      </div>
    </div>
  </section>;
}
