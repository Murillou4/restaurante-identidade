import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Calculator, Images, Notebook, Copy, MapPin, House, CheckCircle, WarningCircle, CircleNotch } from '@phosphor-icons/react';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/outfit';
import { useSharedChoices } from './useSharedChoices';
import { useSharedBudget } from './useSharedBudget';
import { defaultFields } from './sharedBudgetDefaults';
import { budgetHash, readRoute } from './navigation';
import Budget from './Budget';
import Gallery from './Gallery';
import Overview from './Overview';
import Planning from './Planning';
import './style.css';
import './workspace.css';

const pages = [
  { id: 'inicio', label: 'Visão geral', icon: House },
  { id: 'orcamento', label: 'Orçamento', icon: Calculator },
  { id: 'galeria', label: 'Marca', icon: Images },
  { id: 'planejamento', label: 'Plano de abertura', icon: Notebook },
];

function sharingStatus(shared, budget) {
  if (shared.error || budget.error) return { text: 'Caderno precisa de atenção', icon: WarningCircle, state: 'error' };
  if ((!shared.room && shared.loading) || (!budget.cloud && budget.loading)) return { text: 'Abrindo caderno…', icon: CircleNotch, state: 'loading' };
  if (budget.saving || shared.isBusy) return { text: 'Salvando alterações…', icon: CircleNotch, state: 'loading' };
  if (budget.dirty) return { text: 'Orçamento com edições para salvar', icon: WarningCircle, state: 'pending' };
  if (shared.room && budget.cloud) return { text: 'Caderno conectado', icon: CheckCircle, state: 'ready' };
  return { text: 'Caderno ainda sem conexão', icon: WarningCircle, state: 'error' };
}

function App() {
  const shared = useSharedChoices();
  const budget = useSharedBudget(shared.roomId, defaultFields);
  const header = useRef(null);
  const [route, setRoute] = useState(() => readRoute(window.location.hash));
  const [budgetTab, setBudgetTab] = useState(() => readRoute(window.location.hash).tab || 'simular');
  const page = route.page;
  const { icon: StatusIcon, ...status } = sharingStatus(shared, budget);

  useLayoutEffect(() => {
    const measure = () => document.documentElement.style.setProperty('--workspace-header-height', `${Math.ceil(header.current.getBoundingClientRect().height)}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#conteudo') return;
      const next = readRoute(window.location.hash);
      if (next.tab) setBudgetTab(next.tab);
      setRoute(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useLayoutEffect(() => {
    // Wait for hidden pages to become visible before resolving section links.
    const frame = window.requestAnimationFrame(() => {
      // Validation shortcuts focus their field after opening a budget panel.
      // Keep that destination instead of scrolling back to the page heading.
      const focused = document.activeElement;
      if (route.page === 'orcamento' && focused?.matches('[data-field-path], [name]') && focused.closest('#orcamento') && !focused.closest('[hidden]')) return;
      const target = route.anchor && document.getElementById(route.anchor);
      if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [route]);

  const changeBudgetTab = (id) => {
    setBudgetTab(id);
    window.location.hash = budgetHash(id);
  };

  return <>
    <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
    <header ref={header} className="workspace-header">
      <div className="page-width workspace-header-inner">
        <a className="workspace-brand" href="#inicio"><span className="brand-initial" aria-hidden="true">b.</span><span>nossa batataria<small>CADERNO DO RESTAURANTE</small></span></a>
        <span className="workspace-location"><MapPin size={17} aria-hidden="true" />Senador Canedo / GO</span>
        <div className="workspace-header-actions">
          <span className={`workspace-connection is-${status.state}`} role="status"><StatusIcon size={16} aria-hidden="true" />{status.text}</span>
          <button type="button" className="workspace-copy" onClick={shared.copyLink} disabled={shared.copyState === 'copying'}><Copy size={17} aria-hidden="true" />{shared.copyState === 'copied' ? 'Link copiado' : 'Copiar link compartilhado'}</button>
        </div>
      </div>
      <nav className="page-width workspace-nav" aria-label="Partes do caderno">{pages.map(({ id, label, icon: Icon }) => <a href={`#${id}`} key={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined}><Icon size={21} aria-hidden="true" />{label}</a>)}<span className="internal-label">Uso interno · mãe e filho</span></nav>
    </header>

    <main id="conteudo" className="workspace-main page-width" tabIndex={-1}>
      {shared.copyState === 'error' && <p className="workspace-share-error">Copie o link: <a href={shared.shareUrl}>{shared.shareUrl}</a></p>}
      <div id="inicio" hidden={page !== 'inicio'}><Overview /></div>
      <div hidden={page !== 'orcamento'}><Budget sharedBudget={budget} activeTab={budgetTab} onTabChange={changeBudgetTab} /></div>
      <div id="galeria" hidden={page !== 'galeria'}>
        <div className="workspace-heading gallery-heading"><p className="eyebrow">MARCA / GALERIA DE IDEIAS</p><h1>Escolher o nome e o jeito da nossa marca.</h1><p>Comparem os nomes, as referências de logo e os favoritos dos dois. Nome e logo continuam em escolha; um favorito registra uma preferência para conversar.</p></div>
        <section className="workspace-sharing" aria-label="Quem está marcando favoritos"><div className="workspace-person"><span>Estou marcando como</span><div role="group" aria-label="Quem está marcando os favoritos"><button type="button" aria-pressed={shared.person === 'eu'} onClick={() => shared.setPerson('eu')}>Eu (filho)</button><button type="button" aria-pressed={shared.person === 'mae'} onClick={() => shared.setPerson('mae')}>Mãe</button></div></div><p className="workspace-sharing-hint">Favoritos são salvos automaticamente neste caderno.</p></section>
        {shared.error && <div className="workspace-alert" role="alert"><p>{shared.error}</p><button type="button" onClick={shared.retry} disabled={shared.isBusy}>Tentar novamente</button></div>}
        <Gallery shared={shared} />
      </div>
      <div id="planejamento" hidden={page !== 'planejamento'}><Planning /></div>
    </main>
    <footer className="workspace-footer page-width"><span>Planejar, testar e decidir juntos.</span><span>Uso interno · Nome ainda em definição</span></footer>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
