import { ArrowRight, CookingPot, MapPin, House, Truck } from '@phosphor-icons/react';
import { budgetHash } from './navigation';

export default function Overview() {
  return <div className="overview-page">
    <div className="workspace-heading overview-heading">
      <p className="eyebrow">VISÃO GERAL</p>
      <h1>Preparar o nosso delivery de batata recheada.</h1>
      <p>Organizar nosso delivery de batata recheada: testar receitas, calcular preços e definir o que falta para começar.</p>
    </div>

    <div className="overview-grid">
      <section className="overview-priority" aria-labelledby="overview-priority-title">
        <span className="status-label">Prioridade agora</span>
        <h2 id="overview-priority-title">Testar a batata e conferir o preço.</h2>
        <p>Comecem por uma montagem. Comparem o custo com o preço de venda e ajustem as porções depois de pesar um lote real.</p>
        <a className="primary-button overview-start" href={budgetHash('simular')}>Testar uma batata <ArrowRight size={20} aria-hidden="true" /></a>
        <div className="overview-support-links">
          <a className="text-link" href={budgetHash('custos')}>Conferir os preços de compra</a>
          <a className="text-link" href={budgetHash('receitas')}>Comparar recheios e sabores</a>
        </div>
        <p className="overview-priority-note">Porções, receitas e preços iniciais são hipóteses para testar.</p>
      </section>

      <aside className="overview-facts" aria-labelledby="overview-facts-title">
        <div className="overview-facts-heading"><h2 id="overview-facts-title">O começo definido</h2><span className="status-label">Confirmado</span></div>
        <ul>
          <li><CookingPot size={22} aria-hidden="true" /><span><strong>Batata recheada</strong><small>Bebidas para acompanhar.</small></span></li>
          <li><House size={22} aria-hidden="true" /><span><strong>Produção em casa</strong><small>Organização de mãe e filho.</small></span></li>
          <li><Truck size={22} aria-hidden="true" /><span><strong>Somente delivery</strong><small>Sem atendimento no local.</small></span></li>
          <li><MapPin size={22} aria-hidden="true" /><span><strong>Senador Canedo / GO</strong><small>Bairros e taxa de entrega a definir.</small></span></li>
        </ul>
      </aside>
    </div>

    <section className="overview-tools" aria-labelledby="overview-tools-title">
      <h2 id="overview-tools-title">Cada assunto no seu lugar</h2>
      <div className="overview-tool-row">
        <div><span className="eyebrow">01 / ORÇAMENTO</span><h3>Conferir se a conta fecha.</h3><p>Calcular a montagem, atualizar compras e definir os custos de vender.</p></div>
        <div className="overview-tool-links"><a className="text-link" href={budgetHash('canais')}>Vendas e entrega</a><a className="text-link" href={budgetHash('operacao')}>Despesas e meta</a></div>
      </div>
      <div className="overview-tool-row">
        <div><span className="eyebrow">02 / MARCA</span><h3>Escolher como vamos nos apresentar.</h3><p>Comparar ideias de nome, referências de logo e os favoritos dos dois.</p></div>
        <div className="overview-tool-links"><a className="text-link" href="#gallery-favoritos">Comparar favoritos</a><a className="text-link" href="#gallery-nomes">Ver ideias de nome</a><a className="text-link" href="#gallery-logos">Ver referências de logo</a></div>
      </div>
      <div className="overview-tool-row">
        <div><span className="eyebrow">03 / PLANO DE ABERTURA</span><h3>Ver o que falta resolver.</h3><p>Separar o que está definido, o que precisa de teste e as próximas decisões.</p></div>
        <div className="overview-tool-links"><a className="text-link" href="#planejamento">Revisar o plano de abertura</a></div>
      </div>
    </section>
  </div>;
}
