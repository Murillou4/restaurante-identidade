import { useEffect, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Copy } from '@phosphor-icons/react';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/outfit';
import { useSharedChoices } from './useSharedChoices';
import { useSharedBudget } from './useSharedBudget';
import { defaultFields } from './sharedBudgetDefaults';
import { budgetHash, budgetTabs, readRoute } from './navigation';
import Budget from './Budget';
import Gallery from './Gallery';
import './style.css';
import './workspace.css';

function App() {
  const shared = useSharedChoices();
  const budget = useSharedBudget(shared.roomId, defaultFields);
  const [route, setRoute] = useState(() => readRoute(window.location.hash));
  const isBrand = route.page === 'galeria';

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash !== '#conteudo') setRoute(readRoute(window.location.hash));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const focused = document.activeElement;
      if (route.page === 'orcamento' && focused?.matches('[data-field-path]') && !focused.closest('[hidden]')) return;
      const target = route.anchor && document.getElementById(route.anchor);
      if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [route]);

  function changeBudgetTab(id) {
    window.location.hash = budgetHash(id);
  }

  return <>
    <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
    <header className="workspace-header">
      <div className="page-width workspace-header-inner">
        <span className="workspace-brand">Nossa batataria</span>
        <nav className="workspace-nav" aria-label="Preços">
          {budgetTabs.slice(0, 2).map(({ id, name }) => (
            <a key={id} href={budgetHash(id)} aria-current={route.tab === id ? 'page' : undefined}>{name}</a>
          ))}
        </nav>
        <a className="workspace-brand-link" href="#galeria" aria-current={isBrand ? 'page' : undefined}>Marca</a>
      </div>
    </header>

    <main id="conteudo" className="workspace-main page-width" tabIndex={-1}>
      <div hidden={isBrand}>
        <Budget sharedBudget={budget} activeTab={route.tab} onTabChange={changeBudgetTab} />
      </div>
      <div id="galeria" hidden={!isBrand}>
        <h1 className="workspace-brand-title">Marca</h1>
        <section className="workspace-sharing" aria-label="Quem está escolhendo">
          <div className="workspace-person">
            <span>Quem está escolhendo?</span>
            <div role="group" aria-label="Quem está escolhendo">
              <button type="button" aria-pressed={shared.person === 'mae'} onClick={() => shared.setPerson('mae')}>Mãe</button>
              <button type="button" aria-pressed={shared.person === 'eu'} onClick={() => shared.setPerson('eu')}>Filho</button>
            </div>
          </div>
          {shared.loading && !shared.room && <p role="status">Carregando escolhas…</p>}
        </section>
        {shared.error && <div className="workspace-alert" role="alert">
          <p>{shared.error}</p>
          <button type="button" onClick={shared.retry} disabled={shared.isBusy}>Tentar novamente</button>
        </div>}
        {isBrand && <Gallery shared={shared} />}
      </div>
    </main>
    <footer className="workspace-footer page-width">
      <button type="button" className="workspace-copy" onClick={shared.copyLink} disabled={shared.copyState === 'copying'}>
        <Copy size={17} aria-hidden="true" />{shared.copyState === 'copied' ? 'Link copiado' : 'Copiar link do caderno'}
      </button>
      {shared.copyState === 'error' && <p className="workspace-share-error"><a href={shared.shareUrl}>{shared.shareUrl}</a></p>}
    </footer>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
