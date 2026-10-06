import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowClockwise, ArrowSquareOut, FloppyDisk, WarningCircle } from '@phosphor-icons/react';
import { RESEARCH_DATE, ingredients, fillings, cheeses, presets, defaultFields, ingredientValues, estimate } from './budgetCatalog';
import './budget.css';

const money = (value) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const number = (value, digits = 2) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { maximumFractionDigits: digits }) : '—';
const editableNumber = (value) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: 8 }) : '';
const statuses = { reference: 'Referência de loja', estimate: 'Hipótese inicial', unavailable: 'Preço sem estoque' };
const tabs = [{ id: 'simular', name: 'Simular' }, { id: 'custos', name: 'Custos e preços' }, { id: 'receitas', name: 'Receitas' }, { id: 'operacao', name: 'Operação' }];
const ingredientById = Object.fromEntries(ingredients.map((item) => [item.id, item]));
const operationFields = [
  { id: 'energyPerUnit', label: 'Energia por batata', unit: 'R$', help: 'Gás e eletricidade: uma hipótese até medir a produção.' },
  { id: 'laborPerUnit', label: 'Trabalho por batata', unit: 'R$', help: 'Valor reservado para o trabalho de vocês.' },
  { id: 'packagingPerUnit', label: 'Outros itens de embalagem', unit: 'R$', help: 'Só itens fora dos pacotes cadastrados, como etiqueta ou lacre.' },
  { id: 'deliverySubsidy', label: 'Entrega paga pelo negócio', unit: 'R$', help: 'Parte do frete que vocês assumem por pedido.' },
  { id: 'fixedMonthly', label: 'Custos fixos mensais', unit: 'R$', help: 'Custos que ainda não foram lançados por unidade.' },
  { id: 'unitsMonthly', label: 'Batatas por mês', unit: 'un', positive: true, integer: true, help: 'Volume previsto para distribuir os custos fixos.' },
  { id: 'lossPercent', label: 'Reserva adicional para perdas', unit: '%', max: 100, help: 'Somente perdas extras, além do rendimento de preparo.' },
  { id: 'taxPercent', label: 'Impostos sobre a venda', unit: '%', max: 100, help: 'Hipótese editável conforme a forma de operação.' },
  { id: 'feePercent', label: 'Pagamento e plataformas', unit: '%', max: 100, help: 'Taxas aplicadas uma vez sobre o preço de venda.' },
  { id: 'targetMarginPercent', label: 'Margem desejada sobre a venda', unit: '%', max: 100, help: 'Depois dos ingredientes, taxas e rateio dos fixos.' },
];

const settingLabels = {
  potatoGrams: 'Batata por porção', oilMl: 'Óleo por porção', saltGrams: 'Sal por porção',
  cheeseGrams: 'Quantidade total de queijo', fillingTotalGrams: 'Peso total dos recheios',
  palhaGrams: 'Batata palha', greensGrams: 'Cheiro-verde', chosenPrice: 'Preço para testar',
  ...Object.fromEntries(operationFields.map((field) => [field.id, field.label])),
};
function conflictLabel(path) {
  const [group, id, field] = path.split('.');
  if (group === 'settings') return settingLabels[id] ?? 'Ajuste da operação';
  if (group === 'ingredients') return `${ingredientById[id]?.name ?? 'Insumo'}: ${{ price: 'preço do pacote', packageSize: 'tamanho do pacote', yieldPercent: 'rendimento', amount: 'quantidade por pedido' }[field] ?? 'valor'}`;
  if (group === 'recipes') return `${fillings.find((item) => item.id === id)?.name ?? 'Recheio'}: ${ingredientById[field]?.name ?? 'parte da receita'}`;
  return id === 'cheeseId' ? 'Queijo por cima' : 'Recheios selecionados';
}
function conflictValue(path, value) {
  if (path === 'simulation.fillings') return Array.isArray(value) ? value.map((id) => fillings.find((item) => item.id === id)?.name ?? 'Recheio não cadastrado').join(' + ') : 'Não definido';
  if (path === 'simulation.cheeseId') return cheeses.find((item) => item.id === value)?.name ?? 'Não definido';
  if (!Number.isFinite(value)) return 'Não definido';
  const currency = path.endsWith('.price') || ['energyPerUnit', 'laborPerUnit', 'packagingPerUnit', 'deliverySubsidy', 'fixedMonthly', 'chosenPrice'].some((id) => path === `settings.${id}`);
  return currency ? `R$ ${editableNumber(value)}` : number(value, 8);
}

function NumberField({ path, label, value, edit, onValidity, unit, help, context, positive = false, max, integer = false, disabled = false }) {
  const id = useId();
  const focused = useRef(false);
  const [draft, setDraft] = useState(() => editableNumber(value));
  const [error, setError] = useState('');
  useEffect(() => {
    if (!focused.current) { setDraft(editableNumber(value)); setError(''); onValidity(path, null); }
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
    setError(message);
    onValidity(path, message ? `${context ? `${context}: ` : ''}${label} — ${message}` : null);
    if (!message) edit(path, parsed);
  };
  return <div className={`budget-field ${error ? 'has-error' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <div className="budget-input-wrap"><input id={id} name={path} type="text" inputMode={integer ? 'numeric' : 'decimal'} autoComplete="off" value={draft} disabled={disabled} aria-label={context ? `${label}: ${context}` : undefined} aria-invalid={Boolean(error)} aria-describedby={error || help ? `${id}-help` : undefined} onChange={change} onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; if (!error) setDraft(editableNumber(value)); }} />{unit && <span aria-hidden="true">{unit}</span>}</div>
    {(error || help) && <small id={`${id}-help`} className={error ? 'budget-field-error' : ''}>{error || help}</small>}
  </div>;
}

function configurationErrors(values) {
  const errors = [];
  for (const item of ingredients) {
    const data = ingredientValues(item, values);
    if (!Number.isFinite(data.price) || data.price < 0) errors.push(`Confira o preço de ${item.name}.`);
    if (!Number.isFinite(data.packageSize) || data.packageSize <= 0) errors.push(`Confira o tamanho do pacote de ${item.name}.`);
    if (!Number.isFinite(data.yieldPercent) || data.yieldPercent <= 0 || data.yieldPercent > 100) errors.push(`Confira o rendimento de ${item.name}.`);
    if (item.type === 'packaging' && (!Number.isFinite(data.amount) || data.amount < 0)) errors.push(`Confira a quantidade de ${item.name} por pedido.`);
  }
  for (const filling of fillings) {
    const weights = Object.keys(filling.parts).map((id) => values[`recipes.${filling.id}.${id}`]);
    if (weights.some((weight) => !Number.isFinite(weight) || weight < 0) || !(weights.reduce((sum, weight) => sum + weight, 0) > 0)) errors.push(`Confira a composição de ${filling.name}.`);
  }
  if (!cheeses.some((item) => item.id === values['simulation.cheeseId'])) errors.push('Escolha uma opção de queijo válida.');
  for (const field of ['palhaGrams', 'greensGrams']) if (!Number.isFinite(values[`settings.${field}`]) || values[`settings.${field}`] < 0) errors.push('Confira o peso dos complementos da batata.');
  return errors;
}

function IngredientRow({ item, values, fieldProps }) {
  const data = ingredientValues(item, values);
  const edited = data.price !== item.price || data.packageSize !== item.packageSize;
  const packaging = item.type === 'packaging';
  const baseUnit = item.unit === 'g' ? 'kg' : item.unit === 'ml' ? 'L' : 'un';
  return <article className="budget-ingredient">
      <div className="budget-ingredient-info"><h4>{item.name}</h4><div className="budget-source-status"><span className={`budget-tag status-${item.status}`}>{edited ? 'Seu valor' : statuses[item.status]}</span><span>{item.store}</span></div>
      <p className="budget-unit-price">{money(data.unitPrice)} / {baseUnit}{!packaging && data.yieldPercent !== 100 && <span> · {money(data.unitPrice / (data.yieldPercent / 100))} / {baseUnit} pronto</span>}</p>
      {item.note && <p className="budget-source-note">{item.note}</p>}
      {item.source ? <a className="budget-source-link" href={item.source} target="_blank" rel="noopener noreferrer">Ver referência <ArrowSquareOut size={14} aria-hidden="true" /></a> : <span className="budget-source-note">Sem cotação confirmada.</span>}
      {edited && <p className="budget-source-note">Fonte original: {statuses[item.status].toLowerCase()}. O valor acima foi ajustado no caderno.</p>}
    </div>
    <div className="budget-ingredient-inputs">
      <NumberField {...fieldProps} path={`ingredients.${item.id}.price`} label="Preço do pacote" value={data.price} unit="R$" context={item.name} />
      <NumberField {...fieldProps} path={`ingredients.${item.id}.packageSize`} label={packaging ? 'Unidades no pacote' : 'Peso ou volume do pacote'} value={data.packageSize} unit={item.unit} positive context={item.name} />
      {packaging ? <NumberField {...fieldProps} path={`ingredients.${item.id}.amount`} label="Por pedido" value={data.amount} unit="un" context={item.name} /> : item.id === 'batata' ? <div className="budget-fixed-field"><span>Base de peso</span><strong>100% da compra</strong><small>Peso cru comprado. A redução no forno não diminui o custo da batata.</small></div> : <NumberField {...fieldProps} path={`ingredients.${item.id}.yieldPercent`} label="Rendimento após preparo" value={data.yieldPercent} unit="%" positive max={100} context={item.name} />}
    </div>
  </article>;
}

function ComparisonTable({ values, apply, disabled }) {
  return <div className="budget-table-scroll"><table className="budget-comparison"><caption>Sete sugestões para comparar, sem definir o cardápio.</caption><thead><tr><th scope="col">Sugestão de sabor</th><th scope="col">Combinação</th><th scope="col">Custo completo</th><th scope="col">Preço sugerido</th><th scope="col"><span className="budget-sr-only">Aplicar à simulação</span></th></tr></thead><tbody>
    {presets.map((preset) => {
      const result = estimate(values, { ...preset, palha: preset.palha ?? 0 });
      return <tr key={preset.name}><th scope="row">{preset.name}</th><td>{preset.fillings.map((id) => fillings.find((item) => item.id === id)?.name).join(' + ')}<small>{cheeses.find((item) => item.id === preset.cheese)?.name}{preset.palha ? ` · ${preset.palha} g de palha` : ''}</small></td><td>{result.valid ? money(result.fullCost) : 'Revisar valores'}</td><td>{result.valid ? money(result.suggestedPrice) : '—'}</td><td><button type="button" className="budget-button secondary" onClick={() => apply(preset)} disabled={disabled}>Aplicar<span className="budget-sr-only"> {preset.name}</span></button></td></tr>;
    })}
  </tbody></table></div>;
}

function ResultPanel({ result, values, fieldProps, invalidDraft }) {
  const shown = (value) => invalidDraft ? null : value;
  const packaging = result.packagingCost + result.settings.packagingPerUnit;
  return <aside className="budget-results" aria-labelledby="budget-result-title">
    <div className="budget-results-heading"><span className="budget-kicker">CENÁRIO ATUAL</span><h3 id="budget-result-title">Por batata</h3><p>Considera {number(result.settings.unitsMonthly, 0)} batatas por mês, todas com esta mesma composição.</p></div>
    <div className="budget-main-metrics"><div><span>Custo completo</span><strong>{money(shown(result.fullCost))}</strong></div><div><span>Preço sugerido</span><strong>{money(shown(result.suggestedPrice))}</strong><small>Para a margem de {number(result.settings.targetMarginPercent)}% sobre a venda.</small></div></div>
    <NumberField {...fieldProps} path="settings.chosenPrice" label="Preço para testar" value={values['settings.chosenPrice']} unit="R$" help="Um cenário; ainda não é o preço do cardápio." />
    <dl className="budget-breakdown">
      <div><dt>Ingredientes</dt><dd>{money(shown(result.ingredientCost))}</dd></div>
      <div><dt>Reserva adicional para perdas</dt><dd>{money(shown(result.lossCost))}</dd></div>
      <div><dt>Embalagem e itens extras</dt><dd>{money(shown(packaging))}</dd></div>
      <div><dt>Energia</dt><dd>{money(shown(result.settings.energyPerUnit))}</dd></div>
      <div><dt>Trabalho</dt><dd>{money(shown(result.settings.laborPerUnit))}</dd></div>
      <div><dt>Entrega assumida</dt><dd>{money(shown(result.settings.deliverySubsidy))}</dd></div>
      <div className="budget-subtotal"><dt>Custos variáveis</dt><dd>{money(shown(result.variableCost))}</dd></div>
      <div><dt>Rateio dos fixos</dt><dd>{money(shown(result.fixedCostPerUnit))}</dd></div>
      <div><dt>Taxas e impostos no preço testado</dt><dd>{money(shown(result.totalPercentCost))}</dd></div>
    </dl>
    <div className="budget-contribution"><span>Contribuição antes dos fixos</span><strong>{money(shown(result.contribution))}</strong><small>{number(shown(result.contributionMarginPercent))}% do preço testado. Esse valor ainda paga os custos fixos.</small></div>
    <div className={`budget-net-result ${result.netUnit < 0 ? 'is-negative' : ''}`}><span>Resultado unitário estimado</span><strong>{money(shown(result.netUnit))}</strong><small>Depois dos custos variáveis, taxas e rateio dos fixos.</small></div>
    <div className="budget-monthly"><div><span>Resultado mensal estimado</span><strong>{money(shown(result.netMonthly))}</strong></div><div><span>Ponto de equilíbrio</span><strong>{!invalidDraft && result.breakEvenUnits !== null ? `${number(result.breakEvenUnits, 0)} batatas` : 'Não calculável'}</strong></div></div>
    <p className="budget-estimate-note">Estimativa com os custos cadastrados. Confiram compras e rendimento na prática; o resultado não é uma garantia de lucro.</p>
  </aside>;
}

export default function Budget({ sharedBudget }) {
  const [tab, setTab] = useState('simular');
  const [query, setQuery] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const values = { ...defaultFields, ...sharedBudget.values };
  const selected = Array.isArray(values['simulation.fillings']) ? values['simulation.fillings'] : [];
  const result = estimate(values);
  const inputErrors = configurationErrors(values);
  const localErrors = Object.values(fieldErrors);
  const errors = [...new Set([...localErrors, ...inputErrors, ...result.alerts.filter((item) => item.severity !== 'warning').map((item) => item.message)])];
  const warnings = [...new Set(result.alerts.filter((item) => item.severity === 'warning').map((item) => item.message))];
  const conflicts = sharedBudget.conflicts ?? [];
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
  const applyPreset = (preset) => {
    sharedBudget.editMany({ 'simulation.fillings': [...preset.fillings], 'simulation.cheeseId': preset.cheese, 'settings.palhaGrams': preset.palha ?? 0 });
    setTab('simular');
  };
  const chooseFilling = (id) => {
    const next = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
    if (next.length >= 1 && next.length <= 3) sharedBudget.edit('simulation.fillings', next);
  };
  const tabKeys = (event) => {
    const index = tabs.findIndex((item) => item.id === tab);
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setTab(tabs[next].id);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();
  };
  const filteredIngredients = ingredients.filter((item) => `${item.name} ${item.store}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const saveStatus = sharedBudget.saving ? 'Salvando orçamento…' : sharedBudget.loading && !sharedBudget.cloud ? 'Carregando o orçamento compartilhado…' : sharedBudget.error ? 'O salvamento precisa de atenção' : sharedBudget.notice || (sharedBudget.dirty ? `${sharedBudget.dirty} ${sharedBudget.dirty === 1 ? 'alteração ainda não salva' : 'alterações ainda não salvas'}` : sharedBudget.cloud ? 'Valores compartilhados carregados' : 'Conecte para salvar o orçamento');

  return <section id="orcamento" className="budget page-width" aria-labelledby="budget-title">
    <header className="budget-header"><div><span className="budget-kicker">PLANEJAMENTO DO DELIVERY</span><h1 id="budget-title">O que custa cada batata?</h1><p>Um orçamento interno para vocês testarem porções, receitas e preços antes de começar.</p></div><div className="budget-research-date"><strong>Pesquisa de preços</strong><span>{RESEARCH_DATE} · Goiânia e região</span></div></header>
    <div className="budget-savebar"><div><span className="budget-save-status" role="status">{saveStatus}</span><p>Editar recalcula nesta aba. Salvar envia o orçamento para vocês dois.</p></div><div className="budget-save-actions"><button type="button" className="budget-button secondary" onClick={sharedBudget.refresh} disabled={sharedBudget.saving || sharedBudget.loading} aria-label="Atualizar orçamento compartilhado"><ArrowClockwise size={18} aria-hidden="true" /><span>Atualizar</span></button><button type="button" className="budget-button primary" onClick={() => { if (canSave) sharedBudget.save(); }} disabled={!canSave}><FloppyDisk size={19} aria-hidden="true" />{sharedBudget.saving ? 'Salvando…' : 'Salvar orçamento'}</button></div></div>
    {sharedBudget.error && <div className="budget-alert error" role="alert"><WarningCircle size={20} aria-hidden="true" /><p>{sharedBudget.error}</p></div>}
    {conflicts.length > 0 && <section className="budget-conflicts" aria-labelledby="budget-conflict-title"><h3 id="budget-conflict-title">Confira as mudanças do outro aparelho.</h3><p>Suas edições continuam no formulário. Compare os valores abaixo e confira antes de clicar em Salvar novamente.</p><div className="budget-table-scroll"><table><thead><tr><th scope="col">Campo</th><th scope="col">Valor online</th><th scope="col">Sua edição</th></tr></thead><tbody>{conflicts.map((conflict) => <tr key={conflict.path}><th scope="row">{conflictLabel(conflict.path)}</th><td>{conflictValue(conflict.path, conflict.remote)}</td><td>{conflictValue(conflict.path, conflict.local)}</td></tr>)}</tbody></table></div></section>}
    {errors.length > 0 && <div className="budget-alert error" role="alert"><WarningCircle size={20} aria-hidden="true" /><div><strong>Revise os valores antes de salvar.</strong><ul>{errors.slice(0, 6).map((message) => <li key={message}>{message}</li>)}</ul>{errors.length > 6 && <p>Há mais {errors.length - 6} campos para revisar.</p>}</div></div>}
    {warnings.map((message) => <div key={message} className="budget-alert warning"><WarningCircle size={20} aria-hidden="true" /><p>{message}</p></div>)}
    <div role="tablist" aria-label="Ferramentas do orçamento" className="budget-tabs">{tabs.map((item) => <button key={item.id} type="button" role="tab" id={`budget-tab-${item.id}`} aria-selected={tab === item.id} aria-controls={`budget-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={tabKeys}>{item.name}</button>)}</div>
    <div className="budget-workspace"><div role="tabpanel" id={`budget-panel-${tab}`} aria-labelledby={`budget-tab-${tab}`} className="budget-editor" tabIndex={0}>
      {tab === 'simular' && <>
        <div className="budget-section-heading"><h3>Monte uma batata</h3><p>Base + uma escolha de queijo + até três recheios.</p></div>
        <fieldset className="budget-fieldset"><legend>Base e complementos</legend><div className="budget-form-grid">
          {settingField('potatoGrams', 'Batata crua por porção', 'g', { positive: true, help: 'Peso da compra, antes de assar.' })}
          {settingField('oilMl', 'Óleo', 'ml')}{settingField('saltGrams', 'Sal', 'g')}
          {settingField('greensGrams', 'Cheiro-verde', 'g')}{settingField('palhaGrams', 'Batata palha', 'g')}
        </div></fieldset>
        <fieldset className="budget-fieldset"><legend>Queijo por cima</legend><div className="budget-form-grid"><div className="budget-field"><label htmlFor="budget-cheese">Escolha do queijo</label><select id="budget-cheese" value={values['simulation.cheeseId']} onChange={(event) => sharedBudget.edit('simulation.cheeseId', event.target.value)} disabled={disabled}>{cheeses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>{settingField('cheeseGrams', 'Quantidade total de queijo', 'g', { disabled: disabled || values['simulation.cheeseId'] === 'nenhum' })}</div><p className="budget-help">Separado do peso dos recheios. No queijo misto, metade muçarela e metade cheddar.</p></fieldset>
        <fieldset className="budget-fieldset"><legend>Recheios <span>{selected.length} de 3</span></legend>{settingField('fillingTotalGrams', 'Peso total dos recheios', 'g', { positive: true })}<div className="budget-filling-list">
          {fillings.map((item) => <label key={item.id} className={`budget-filling ${selected.includes(item.id) ? 'selected' : ''}`}><input type="checkbox" checked={selected.includes(item.id)} disabled={disabled || (!selected.includes(item.id) && selected.length >= 3) || (selected.includes(item.id) && selected.length === 1)} onChange={() => chooseFilling(item.id)} /><span>{item.name}{item.vegetarian && <small>Sem carnes</small>}{item.id === 'champignon' && <small className="budget-stock-note">Referência sem estoque</small>}</span></label>)}
        </div><p className="budget-help">{selected.length === 3 ? 'Para trocar um recheio, desmarque um dos três.' : 'Escolha de um a três. O peso total será dividido entre eles.'}</p><div className="budget-portions">{result.portions.map((portion) => <span key={portion.id}><strong>{number(portion.grams)} g</strong>{fillings.find((item) => item.id === portion.id)?.name}</span>)}</div></fieldset>
        <div className="budget-section-heading"><h3>Ingredientes desta combinação</h3><p>Batata: peso cru comprado. Nos recheios, os pesos são prontos para servir; a compra considera o rendimento de preparo.</p></div>
        <div className="budget-table-scroll"><table className="budget-portion-table"><thead><tr><th scope="col">Ingrediente</th><th scope="col">Peso da receita</th><th scope="col">Para comprar</th><th scope="col">Custo</th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.id}><th scope="row">{row.name}{row.id === 'batata' ? ' (crua)' : ''}</th><td>{number(row.quantity)} {row.unit}</td><td>{number(row.purchaseQuantity)} {row.unit}</td><td>{money(row.cost)}</td></tr>)}</tbody></table></div>
      </>}
      {tab === 'custos' && <>
        <div className="budget-section-heading"><h3>Preços e rendimento</h3><p>Fontes coletadas em {RESEARCH_DATE}. Troquem as referências pelos valores das compras de vocês.</p></div>
        <div className="budget-status-legend"><span className="budget-tag status-reference">Referência de loja</span><span className="budget-tag status-estimate">Hipótese inicial</span><span className="budget-tag status-unavailable">Preço sem estoque</span></div>
        <p className="budget-help">O rendimento é a parte que sobra depois de limpar, escorrer ou cozinhar. Os percentuais iniciais são hipóteses; pesem o lote para ajustar. Frete de compra não incluído nos preços pesquisados.</p>
        <div className="budget-field budget-search"><label htmlFor="budget-search">Buscar ingrediente ou embalagem</label><input id="budget-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Frango, muçarela, bandeja…" /></div>
        {['food', 'packaging'].map((type) => { const items = filteredIngredients.filter((item) => item.type === type); return items.length > 0 && <section key={type} className="budget-cost-group"><h3>{type === 'food' ? 'Ingredientes' : 'Embalagens por pedido'}</h3>{type === 'packaging' && <p className="budget-help">O custo por unidade já soma estes pacotes. Outros itens entram uma vez na aba Operação.</p>}{items.map((item) => <IngredientRow key={item.id} item={item} values={values} fieldProps={fieldProps} />)}</section>; })}
        {!filteredIngredients.length && <div className="budget-empty"><h3>Nenhum item com esse nome.</h3><p>Busque outro ingrediente ou apague o texto para ver a lista completa.</p><button type="button" className="budget-button secondary" onClick={() => setQuery('')}>Limpar busca</button></div>}
      </>}
      {tab === 'receitas' && <>
        <div className="budget-section-heading"><h3>Sugestões para conversar</h3><p>Aplicar preenche a simulação. A mudança só vai para o outro aparelho quando vocês salvarem.</p></div>
        <ComparisonTable values={values} apply={applyPreset} disabled={disabled} />
        <div className="budget-section-heading recipe-heading"><h3>Composição dos recheios</h3><p>São receitas de partida, ainda para testar. Ajuste as partes: elas serão proporcionais ao peso do recheio na batata.</p></div>
        {fillings.map((filling) => { const total = Object.keys(filling.parts).reduce((sum, id) => sum + values[`recipes.${filling.id}.${id}`], 0); return <fieldset key={filling.id} className="budget-fieldset budget-recipe"><legend>{filling.name}</legend><p className="budget-help">{number(total)} partes no total. Em uma porção de 150 g, 50 partes de 100 viram 75 g.</p><div className="budget-recipe-inputs">{Object.keys(filling.parts).map((id) => <NumberField key={id} {...fieldProps} path={`recipes.${filling.id}.${id}`} label={ingredientById[id].name} value={values[`recipes.${filling.id}.${id}`]} unit="partes" context={filling.name} />)}</div></fieldset>; })}
      </>}
      {tab === 'operacao' && <>
        <div className="budget-section-heading"><h3>Como vamos operar?</h3><p>Estes valores são hipóteses de planejamento. Trabalho, energia, taxas e custos fixos não são cotações de loja.</p></div>
        <div className="budget-operation-grid">{operationFields.map(({ id, label, unit, ...props }) => settingField(id, label, unit, props))}</div>
        <div className="budget-operation-note"><strong>Conte cada custo uma vez.</strong><p>Os rendimentos dos ingredientes já consideram perdas de preparo. A reserva adicional cobre outras perdas. O custo dos pacotes já entra em embalagem; registre apenas extras no campo desta aba.</p><p>Preço sugerido = custo completo ÷ (1 − impostos − taxas − margem desejada). A margem é uma parte do preço de venda.</p></div>
      </>}
    </div><ResultPanel result={result} values={values} fieldProps={fieldProps} invalidDraft={invalid} /></div>
  </section>;
}
