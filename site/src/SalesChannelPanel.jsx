import { compareChannels } from './salesChannels';

const money = (value) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const number = (value) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—';
export const channelLabels = {
  plan: 'Canal de venda', onlineSharePercent: 'Vendas pagas pelo iFood', paymentPercent: 'Taxa de pagamento online',
  basicCommissionPercent: 'Comissão do Básico', deliveryCommissionPercent: 'Comissão do Entrega',
  basicMonthly: 'Mensalidade do Básico', deliveryMonthly: 'Mensalidade do Entrega',
  monthlyThreshold: 'Faturamento para cobrar mensalidade', monthlyExempt: 'Mês sem mensalidade',
  ifoodDeliverySubsidy: 'Frete subsidiado no Entrega iFood', otherFeePercent: 'Outras taxas opcionais do iFood', promotionPerUnit: 'Promoção paga pela loja',
};
export const monthlyLabels = { 'not-applicable': 'Sem mensalidade de plataforma', exempt: 'Carência simulada', charged: 'Mensalidade aplicada', 'below-threshold': 'Isento pelo faturamento', invalid: 'Revisar valores' };

export default function SalesChannels({ values, edit, fieldProps, NumberField, invalid, onTabChange }) {
  const comparisons = compareChannels(values);
  const shown = (result, value) => invalid || !result.valid ? null : value;
  const field = (id, label, unit, props = {}) => <NumberField key={id} {...fieldProps} path={`channel.${id}`} label={label} value={values[`channel.${id}`]} unit={unit} {...props} />;
  const operationField = (id, label, unit, props = {}) => <NumberField key={id} {...fieldProps} path={`settings.${id}`} label={label} value={values[`settings.${id}`]} unit={unit} {...props} />;
  return <>
    <div className="budget-section-heading"><h3>Quanto sobra em cada canal?</h3><p>A mesma batata e o mesmo preço, comparados na venda direta e nos dois planos do iFood.</p></div>
    <p className="budget-help channel-volume-note">Volume considerado: <strong>{number(values['settings.unitsMonthly'])} batatas por mês</strong>. <button type="button" className="text-link" onClick={() => onTabChange('operacao')}>Alterar em Despesas e meta</button></p>
    <p className="budget-help">Cada coluna considera esse volume vendido em um único canal. São cenários alternativos; não some os resultados das colunas.</p>
    <p className="budget-help">Preço testado: <strong>{money(values['settings.chosenPrice'])}</strong>. <button type="button" className="text-link" onClick={() => onTabChange('simular')}>Voltar à simulação</button> para ajustar o preço ou a montagem.</p>
    <div className="budget-table-scroll"><table className="channel-comparison"><caption>Comparação no preço testado de {money(values['settings.chosenPrice'])}</caption><thead><tr><th scope="col">Neste cenário</th>{comparisons.map((result) => <th key={result.channel.id} scope="col"><button type="button" className="channel-choice" aria-pressed={values['channel.plan'] === result.channel.id} disabled={fieldProps.disabled} onClick={() => edit('channel.plan', result.channel.id)}>{result.channel.name}<small>{values['channel.plan'] === result.channel.id ? 'Em simulação' : 'Usar este canal'}</small></button></th>)}</tr></thead><tbody>
      <tr><th scope="row">Taxas sobre a venda</th>{comparisons.map((result) => <td key={result.channel.id}>{number(shown(result, result.channel.totalFeePercent))}%<small>{money(shown(result, result.feeCost))} por batata</small></td>)}</tr>
      <tr><th scope="row">Mensalidade neste mês</th>{comparisons.map((result) => <td key={result.channel.id}>{money(shown(result, result.channel.monthly))}<small>{monthlyLabels[result.channel.monthlyStatus]}</small></td>)}</tr>
      <tr><th scope="row">Preço sugerido</th>{comparisons.map((result) => <td key={result.channel.id}>{money(shown(result, result.suggestedPrice))}</td>)}</tr>
      <tr className="channel-net-row"><th scope="row">Resultado por batata</th>{comparisons.map((result) => <td key={result.channel.id} className={result.netUnit < 0 ? 'is-negative' : ''}>{money(shown(result, result.netUnit))}</td>)}</tr>
      <tr><th scope="row">Resultado no mês</th>{comparisons.map((result) => <td key={result.channel.id}>{money(shown(result, result.netMonthly))}</td>)}</tr>
    </tbody></table></div>
    <div className="channel-delivery-note"><strong>Quem faz a entrega?</strong><p><b>Direto e iFood Básico:</b> vocês organizam e pagam a entrega própria. <b>iFood Entrega:</b> entregadores parceiros do iFood; o campo abaixo registra só o frete ou a promoção que a loja decidir subsidiar.</p></div>
    <details className="budget-disclosure">
    <summary>Ajustar condições</summary>
    <fieldset className="budget-fieldset"><legend>Taxas do iFood</legend><p className="budget-help">Referências oficiais conferidas em 06/10/2026. Ajustem para a proposta e o contrato da loja.</p><div className="budget-form-grid">
      {field('basicCommissionPercent', 'Comissão do Básico', '%', { max: 100, help: 'Referência: 12% sobre as vendas.' })}
      {field('deliveryCommissionPercent', 'Comissão do Entrega', '%', { max: 100, help: 'Referência: 23%, com a logística do plano.' })}
      {field('paymentPercent', 'Taxa de pagamento online', '%', { max: 100, help: 'Referência atual: 3,2%. Cobrança adicional à comissão.' })}
      {field('onlineSharePercent', 'Vendas pagas pelo iFood', '%', { max: 100, help: 'Parcela do faturamento paga pela plataforma. 100% aplica a taxa online em todas as vendas.' })}
    </div></fieldset>
    <fieldset className="budget-fieldset"><legend>Mensalidades</legend><div className="budget-form-grid">
      {field('basicMonthly', 'Mensalidade do Básico', 'R$', { help: 'Referência: R$ 110 por mês.' })}
      {field('deliveryMonthly', 'Mensalidade do Entrega', 'R$', { help: 'Referência: R$ 150 por mês.' })}
      {field('monthlyThreshold', 'Faturamento para cobrar mensalidade', 'R$', { help: 'Só cobra acima deste valor mensal no iFood. Referência: R$ 1.800.' })}
    </div><label className="channel-exemption"><input type="checkbox" name="channel.monthlyExempt" data-field-path="channel.monthlyExempt" disabled={fieldProps.disabled} checked={values['channel.monthlyExempt'] === 1} onChange={(event) => edit('channel.monthlyExempt', event.target.checked ? 1 : 0)} /><span>Simular um mês sem mensalidade<small>Ex.: primeiro mês grátis para novos cadastros. Desmarque para simular os meses seguintes.</small></span></label></fieldset>
    <fieldset className="budget-fieldset"><legend>Entrega e adicionais opcionais</legend><div className="budget-form-grid">
      {operationField('deliverySubsidy', 'Entrega própria paga pelo negócio', 'R$', { help: 'Custo por batata que fica com vocês, após descontar o frete pago pelo cliente. Usado no Direto e no Básico.' })}
      {field('ifoodDeliverySubsidy', 'Frete subsidiado no Entrega iFood', 'R$', { help: 'Por batata. Preencha se a loja bancar entrega grátis ou parte do frete. Não soma a entrega própria.' })}
      {field('promotionPerUnit', 'Promoção paga pela loja', 'R$', { help: 'Custo por batata de cupons ou campanhas, em ambos os planos. Não repita o frete lançado ao lado.' })}
      {field('otherFeePercent', 'Outras taxas opcionais do iFood', '%', { max: 100, help: 'Ex.: antecipação de recebíveis. Começa em zero; consulte a taxa oferecida à loja no aplicativo.' })}
      {operationField('feePercent', 'Taxas da venda direta', '%', { max: 100, help: 'Cartão ou outros meios de pagamento fora do iFood. Os planos do iFood usam os percentuais acima.' })}
    </div></fieldset>
    </details>
    <details className="budget-disclosure channel-references"><summary>Fontes e hipóteses</summary><p>O <a href="https://parceiros.ifood.com.br/restaurante" target="_blank" rel="noopener noreferrer">cadastro oficial</a> e os artigos de <a href="https://blog-parceiros.ifood.com.br/planos-ifood/" target="_blank" rel="noopener noreferrer">planos (09/09/2026)</a> e <a href="https://blog-parceiros.ifood.com.br/taxas-ifood/" target="_blank" rel="noopener noreferrer">taxas (15/09/2026)</a> mostram 12% / 23%, pagamento online de 3,2% e mensalidades de R$ 110 / R$ 150 acima de R$ 1.800.</p><p>Uma página explicativa ainda mostra 3,5%. Usamos 3,2% por constar no cadastro e nos artigos mais recentes; o contrato de vocês prevalece.</p><p>Antecipação, cupons e frete grátis são opcionais. As condições de <a href="https://blog-parceiros.ifood.com.br/antecipacao-pontual-do-ifood-pago/" target="_blank" rel="noopener noreferrer">antecipação</a> devem ser consultadas no app; <a href="https://blog-parceiros.ifood.com.br/campanha-inteligente/" target="_blank" rel="noopener noreferrer">campanhas</a> podem gerar subsídios adicionais. A taxa de serviço do consumidor pertence ao iFood e não foi somada como custo da loja.</p><p><strong>Senador Canedo:</strong> confiram a cobertura do Plano Entrega no endereço de produção antes de contratar.</p><p>Esta conta usa o preço da batata como base das taxas e do faturamento, sem bebidas ou frete cobrado do cliente. Confiram no contrato e no extrato se a base da loja inclui outros valores. O preço sugerido verifica a mensalidade também no faturamento do próprio preço recomendado.</p></details>
  </>;
}
