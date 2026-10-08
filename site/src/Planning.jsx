import { presets } from './budgetCatalog';
import { budgetHash } from './navigation';

export default function Planning() {
  return <div className="planning-page">
    <div className="workspace-heading"><p className="eyebrow">O QUE SABEMOS ATÉ AQUI</p><h1>Plano de abertura.</h1><p>O que já sabemos e o que falta decidir para começar o delivery em casa. As propostas passam por testes e pela conversa de vocês antes de virar uma decisão.</p></div>

    <div className="planning-grid">
      <section className="planning-note" aria-labelledby="planning-defined"><span className="status-label">Confirmado</span><h2 id="planning-defined">Já definido</h2><ul><li>Batata recheada como produto principal.</li><li>Bebidas para acompanhar.</li><li>Produção em casa, somente delivery.</li><li>Entregas em Senador Canedo, Goiás.</li><li>Organização de mãe e filho.</li></ul></section>
      <section className="planning-note" aria-labelledby="planning-testing"><span className="status-label">Hipóteses para validar</span><h2 id="planning-testing">Em teste</h2><p>Uma base de batata, uma escolha de queijo e até três recheios. O peso total do recheio é dividido entre as escolhas.</p><p>Ponto de partida: 450 g de batata crua, 40 g de queijo e 150 g de recheios. Pesar, provar e ajustar antes de fechar a porção.</p><a className="text-link planning-action" href={budgetHash('simular')}>Testar uma montagem no orçamento</a></section>
    </div>

    <section className="planning-section" aria-labelledby="planning-flavors"><span className="status-label">Sugestões</span><h2 id="planning-flavors">Sabores para comparar</h2><p>Combinações da conversa de 06/10/2026. O cardápio inicial continua em aberto.</p><div className="planning-flavors">{presets.map((item) => <span key={item.name}>{item.name}</span>)}</div><p className="planning-detail">A vegetariana começa com milho e brócolis; champignon é uma alternativa para testar. Os recheios cremosos levam seus próprios ingredientes. O queijo escolhido é contado à parte.</p><a className="text-link planning-action" href={budgetHash('receitas')}>Conferir recheios e sabores</a></section>

    <section className="planning-section" aria-labelledby="planning-pending"><span className="status-label">Próximos passos</span><h2 id="planning-pending">Falta decidir</h2><ol className="planning-checklist">
      <li><div><strong>Testar e pesar um lote.</strong><p>Medir o peso comprado e pronto de frango, bacon, calabresa e carne de sol para corrigir o rendimento.</p></div><a className="text-link" href={budgetHash('custos')}>Ajustar o rendimento das compras</a></li>
      <li><div><strong>Cotar as compras reais.</strong><p>Conferir tamanho das batatas, queijo culinário, peso drenado do milho, disponibilidade e frete.</p></div><a className="text-link" href={budgetHash('custos')}>Atualizar preços de compra</a></li>
      <li><div><strong>Testar a embalagem.</strong><p>A bandeja pesquisada tem 4 cm de altura. Conferir fechamento, apresentação e transporte da batata.</p></div><a className="text-link" href={budgetHash('custos')}>Conferir o custo da embalagem</a></li>
      <li><div><strong>Fechar operação e atendimento.</strong><p>Definir bebidas, dias, horários, bairros e canal de pedidos. Conferir entrega, volume de vendas, despesas e taxas.</p></div><div className="planning-step-links"><a className="text-link" href={budgetHash('canais')}>Vendas e entrega</a><a className="text-link" href={budgetHash('operacao')}>Despesas e meta</a></div></li>
      <li><div><strong>Escolher o nome e a direção da logo.</strong><p>Comparar favoritos, pesquisar a disponibilidade do nome e desenvolver uma logo própria com aparência acolhedora.</p></div><a className="text-link" href="#gallery-favoritos">Conversar sobre os favoritos</a></li>
    </ol></section>

    <section className="planning-section planning-later" aria-labelledby="planning-later"><span className="status-label">Ideia futura</span><h2 id="planning-later">Para depois</h2><p>Sobremesas são uma possibilidade de expansão e ficam fora do cardápio inicial.</p></section>
    <p className="planning-source">Favoritos de nome e referências continuam na Marca. Marcar um favorito registra uma preferência; a escolha final ainda depende de vocês dois.</p>
  </div>;
}
