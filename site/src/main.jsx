import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Calculator, Images, Notebook, Copy, CookingPot, MapPin, CheckCircle } from '@phosphor-icons/react';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/outfit';
import { useSharedChoices } from './useSharedChoices';
import { useSharedBudget } from './useSharedBudget';
import { presets } from './budgetCatalog';
import { defaultFields } from './sharedBudgetDefaults';
import Budget from './Budget';
import Gallery from './Gallery';
import './style.css';
import './workspace.css';

const pages = [{ id: 'orcamento', label: 'Orçamento', icon: Calculator }, { id: 'galeria', label: 'Galeria', icon: Images }, { id: 'planejamento', label: 'Planejamento', icon: Notebook }];
function readPage() {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('gallery-') || ['logos', 'nomes', 'favoritos'].includes(hash)) return 'galeria';
  return pages.some((page) => page.id === hash) ? hash : 'orcamento';
}

function Planning() {
  return <div className="planning-page">
    <div className="workspace-heading"><p className="eyebrow">O QUE SABEMOS ATÉ AQUI</p><h1>Nosso plano, por partes.</h1><p>Organização para começar o delivery em casa. As propostas continuam em teste até vocês fecharem as decisões.</p></div>
    <div className="planning-grid">
      <section className="planning-note"><CookingPot size={27} aria-hidden="true"/><h2>O começo definido</h2><ul><li>Batata recheada como produto principal.</li><li>Bebidas para acompanhar; sobremesas ficam para depois.</li><li>Produção em casa, somente delivery.</li><li>Entregas em Senador Canedo, Goiás.</li><li>Nome e logo ainda em escolha, com preferência por algo acolhedor.</li></ul></section>
      <section className="planning-note"><Notebook size={27} aria-hidden="true"/><h2>Ideia para a montagem</h2><p>Uma base de batata, uma escolha de queijo e até três recheios. O simulador divide um peso total de recheio entre as escolhas, em vez de triplicar a porção.</p><p>Começamos com 450 g de batata crua, 40 g de queijo e 150 g de recheios. Esses pesos e todas as composições são hipóteses para testar, pesar e ajustar.</p></section>
    </div>
    <section className="planning-section"><h2>Sabores sugeridos na conversa</h2><p>Registrados a partir da conversa de 06/10/2026. São combinações para comparar no orçamento, sem um cardápio final aprovado.</p><div className="planning-flavors">{presets.map((item) => <span key={item.name}>{item.name}</span>)}</div><p className="planning-detail">A vegetariana foi incluída com milho e brócolis como proposta inicial. Champignon é uma alternativa para testar. Os recheios cremosos já levam seus próprios ingredientes; o queijo escolhido é contado à parte.</p></section>
    <section className="planning-section"><h2>Antes de começar</h2><ol className="planning-checklist"><li><strong>Testar e pesar um lote.</strong><span>Medir o peso comprado e o peso pronto de frango, bacon, calabresa e carne de sol. Corrigir o rendimento no orçamento.</span></li><li><strong>Cotar as compras reais.</strong><span>Conferir tamanho das batatas, queijo culinário, peso drenado do milho, disponibilidade e frete. Substituir cada preço pela compra de vocês.</span></li><li><strong>Testar a embalagem.</strong><span>A bandeja pesquisada tem só 4 cm de altura. Conferir fechamento, apresentação e transporte da batata recheada.</span></li><li><strong>Fechar operação e atendimento.</strong><span>Definir bebidas, dias, horários, bairros, entrega e canal de pedidos; preencher custos, volume e taxas reais.</span></li><li><strong>Escolher a identidade.</strong><span>Conversar sobre os favoritos da galeria, conferir disponibilidade do nome e desenvolver uma logo própria.</span></li></ol></section>
    <p className="planning-source">A conversa foi resumida somente nos pontos do restaurante. Preferências de nome e referências estão na Galeria e continuam compartilhadas.</p>
  </div>;
}

function App() {
  const shared = useSharedChoices();
  const budget = useSharedBudget(shared.roomId, defaultFields);
  const [page, setPage] = useState(readPage);
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'conteudo') return;
      setPage(readPage());
      if (pages.some((item) => item.id === hash)) window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return <>
    <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
    <header className="workspace-header"><div className="page-width workspace-header-inner"><a className="workspace-brand" href="#orcamento"><span className="brand-initial" aria-hidden="true">b.</span><span>nossa batataria<small>CADERNO DO RESTAURANTE</small></span></a><span className="workspace-location"><MapPin size={17} aria-hidden="true"/>Senador Canedo / GO</span></div><nav className="page-width workspace-nav" aria-label="Partes do caderno">{pages.map(({ id, label, icon: Icon }) => <a href={`#${id}`} key={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined}><Icon size={21} aria-hidden="true"/>{label}</a>)}<span className="internal-label">Organização de mãe e filho</span></nav></header>
    <main id="conteudo" className="workspace-main page-width" tabIndex={-1}>
      <section className="workspace-sharing" aria-label="Caderno compartilhado">
        {page === 'galeria' && <div className="workspace-person"><span>Favoritos de</span><div role="group" aria-label="Quem está marcando os favoritos"><button type="button" aria-pressed={shared.person === 'eu'} onClick={() => shared.setPerson('eu')}>Eu (filho)</button><button type="button" aria-pressed={shared.person === 'mae'} onClick={() => shared.setPerson('mae')}>Mãe</button></div></div>}
        <div className="workspace-share-actions"><span><CheckCircle size={17} aria-hidden="true"/>Mesmo caderno nos dois aparelhos</span><button type="button" className="workspace-copy" onClick={shared.copyLink} disabled={shared.copyState === 'copying'}><Copy size={17} aria-hidden="true"/>{shared.copyState === 'copied' ? 'Link copiado' : 'Copiar link compartilhado'}</button></div>
        {shared.copyState === 'error' && <p className="workspace-share-error">Copie o link: <a href={shared.shareUrl}>{shared.shareUrl}</a></p>}
      </section>
      <div hidden={page !== 'orcamento'}><Budget sharedBudget={budget}/></div>
      <div hidden={page !== 'galeria'}><div className="workspace-heading gallery-heading"><p className="eyebrow">NOME, LOGO E REFERÊNCIAS</p><h1>A galeria das nossas ideias.</h1><p>As respostas de vocês estão aqui, junto com todas as sugestões anteriores. Marcar um favorito continua sendo uma preferência para conversar.</p></div>{shared.error && <div className="workspace-alert" role="alert"><p>{shared.error}</p><button type="button" onClick={shared.retry} disabled={shared.isBusy}>Tentar novamente</button></div>}<Gallery shared={shared}/></div>
      <div hidden={page !== 'planejamento'}><Planning/></div>
    </main>
    <footer className="workspace-footer page-width"><span>Nosso restaurante começa com uma boa conversa e uma conta bem feita.</span><span>Uso interno · Nome ainda em definição</span></footer>
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
