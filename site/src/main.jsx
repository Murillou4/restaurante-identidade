import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookmarkSimple, Check, CookingPot, Heart, House, MapPin, MagnifyingGlassPlus, X } from '@phosphor-icons/react';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/outfit';
import { names, references, filters } from './data';
import './style.css';

const storageKey = 'nossa-batataria-favoritos-v1';
const asset = (filename) => `${import.meta.env.BASE_URL}referencias/${filename}`;

function readChoices() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return {
      names: Array.isArray(saved?.names) ? saved.names.filter((id) => names.some((item) => item.id === id)) : [],
      references: Array.isArray(saved?.references) ? saved.references.filter((id) => references.some((item) => item.id === id)) : [],
    };
  } catch {
    return { names: [], references: [] };
  }
}

function FavoriteButton({ selected, onClick, label, compact = false, text = 'Gostei deste nome' }) {
  return (
    <button type="button" aria-pressed={selected} aria-label={compact ? `${selected ? 'Desmarcar' : 'Marcar'} ${label} como favorito` : `${selected ? 'Favorito' : text}: ${label}${selected ? '. Desmarcar' : ''}`} onClick={onClick} className={`favorite-button ${selected ? 'is-selected' : ''} ${compact ? 'compact' : ''}`}>
      <Heart size={20} weight={selected ? 'fill' : 'regular'} aria-hidden="true" />
      {!compact && <span>{selected ? 'Favorito' : text}</span>}
    </button>
  );
}

function ReferenceImage({ reference, large = false }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className={`logo-image ${large ? 'large' : ''} ${loaded || failed ? 'is-loaded' : 'is-loading'} ${reference.id === 'baked' || reference.id === 'roasted' ? 'wide-logo' : ''}`}>
      {failed ? <span className="image-fallback">Imagem indisponível. Veja a fonte abaixo.</span> : <img src={asset(reference.filename)} alt={`Logo de ${reference.name}`} loading={large ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />}
    </div>
  );
}

function ReferenceDialog({ reference, onClose, selected, onFavorite }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (reference && !dialog.current.open) dialog.current.showModal();
    if (!reference && dialog.current.open) dialog.current.close();
  }, [reference]);
  return (
    <dialog ref={dialog} onClose={onClose} onCancel={onClose} aria-labelledby="reference-dialog-title" className="reference-dialog" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      {reference && <div className="dialog-content">
        <div className="flex items-center justify-between gap-4">
          <span className="eyebrow">Referência de outra marca</span>
          <button type="button" className="icon-button" aria-label="Fechar referência" onClick={onClose}><X size={24} aria-hidden="true" /></button>
        </div>
        <ReferenceImage key={reference.id} reference={reference} large />
        <h2 id="reference-dialog-title" className="font-display text-3xl">{reference.name}</h2>
        <p className="mt-3 leading-relaxed text-muted">{reference.description}</p>
        <p className="mt-4 font-medium">{reference.lesson}</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <a className="source-link" href={reference.source} target="_blank" rel="noopener noreferrer">{reference.provenance}</a>
          <FavoriteButton selected={selected} label={reference.name} onClick={onFavorite} text="Gostei desta referência" />
        </div>
      </div>}
    </dialog>
  );
}

function App() {
  const [choices, setChoices] = useState(readChoices);
  const [storageError, setStorageError] = useState(false);
  const [filter, setFilter] = useState('todas');
  const [openReference, setOpenReference] = useState(null);
  const totalChoices = choices.names.length + choices.references.length;
  const visibleReferences = references.filter((item) => filter === 'todas' || item.category === filter);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(choices));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [choices]);

  const toggle = (type, id) => setChoices((current) => ({ ...current, [type]: current[type].includes(id) ? current[type].filter((value) => value !== id) : [...current[type], id] }));

  return (
    <>
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <header className="site-header">
        <div className="page-width flex min-h-20 items-center justify-between gap-5">
          <a href="#projeto" className="brand-link"><span className="brand-initial" aria-hidden="true">b.</span><span>nossa batataria<span className="brand-caption">UM CADERNO DE IDEIAS</span></span></a>
          <nav aria-label="Navegação principal" className="flex items-center gap-6 md:gap-9">
            <a href="#nomes" className="nav-link">Nomes</a>
            <a href="#logos" className="nav-link">Logos</a>
            <a href="#favoritos" className="notebook-link" aria-label={`Meu caderno: ${totalChoices} favoritos`}><BookmarkSimple size={21} aria-hidden="true" /><span className="hidden sm:inline">Meu caderno</span>{totalChoices > 0 && <span className="choice-count">{totalChoices}</span>}</a>
          </nav>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1}>
        <section id="projeto" className="hero page-width">
          <div>
            <div className="eyebrow mb-6 flex items-center gap-3"><span className="small-rule" />FEITO PARA ESCOLHER JUNTOS</div>
            <h1 className="font-display">Uma batataria<br />com a <em>nossa cara.</em></h1>
            <p className="hero-description">O começo de um delivery feito em casa. Vamos encontrar o nome e a logo que combinam com a nossa comida.</p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <a href="#nomes" className="primary-button">Comparar os nomes</a>
              <a href="#logos" className="text-link">Ver referências reais</a>
            </div>
            <p className="mt-7 flex items-center gap-2 text-sm text-muted"><MapPin size={17} aria-hidden="true" />Senador Canedo, Goiás</p>
          </div>

          <aside className="project-note" aria-labelledby="project-note-title">
            <div className="note-topline"><span className="eyebrow">O QUE JÁ É NOSSO</span><span className="note-date">OUT. 2026</span></div>
            <h2 id="project-note-title" className="font-display">Um começo simples,<br />feito com cuidado.</h2>
            <ul className="project-facts">
              <li><CookingPot size={24} aria-hidden="true" /><span><strong>Batata recheada</strong><small>O centro do nosso cardápio</small></span></li>
              <li><House size={24} aria-hidden="true" /><span><strong>Feito em casa</strong><small>Produção na nossa cozinha</small></span></li>
              <li><MapPin size={24} aria-hidden="true" /><span><strong>Somente delivery</strong><small>Entregas em Senador Canedo</small></span></li>
            </ul>
            <p className="note-footer">Bebidas para acompanhar. Sobremesas ficam como uma ideia para depois.</p>
          </aside>
        </section>

        <section id="nomes" className="section page-width">
          <div className="section-heading"><div><span className="eyebrow">01 / O NOME</span><h2 className="font-display">Como vamos nos chamar?</h2></div><p>Leia em voz alta. Imagine alguém pedindo a nossa batata pelo nome.</p></div>
          <div className="names-grid">
            {names.map((item, index) => <article key={item.id} className={`name-card name-card-${index + 1} ${choices.names.includes(item.id) ? 'is-favorite' : ''}`}>
              <div className="flex items-center justify-between gap-3"><span className="eyebrow">IDEIA {String(index + 1).padStart(2, '0')}</span><span className="name-tone">{item.tone}</span></div>
              <div className="name-preview"><h3 className="font-display">{item.name}</h3><span>{item.descriptor}</span></div>
              <p className="name-description">{item.description}</p>
              <blockquote>“{item.phrase}”</blockquote>
              <p className="name-consideration">{item.consideration}</p>
              <FavoriteButton selected={choices.names.includes(item.id)} label={item.name} onClick={() => toggle('names', item.id)} />
            </article>)}
          </div>
          <p className="section-footnote">Quatro ideias iniciais. O nome ainda será escolhido por vocês, e a disponibilidade precisa ser pesquisada.</p>
        </section>

        <section className="direction-section">
          <div className="page-width direction-grid">
            <div><span className="eyebrow">O JEITO QUE BUSCAMOS</span><h2 className="font-display">Acolhedor.<br />Simples. <em>Nosso.</em></h2></div>
            <div className="direction-copy"><p>Uma identidade que lembre o conforto de comer em casa. Letras gostosas de ler, poucos elementos e um detalhe com personalidade.</p><p className="mt-5 text-muted">Creme, marrom e terracota são uma paleta para experimentar. A logo e as cores ainda estão em aberto.</p><div className="palette" aria-label="Paleta sugerida: creme, marrom e terracota"><span className="swatch swatch-cream">Creme</span><span className="swatch swatch-brown">Marrom</span><span className="swatch swatch-clay">Terracota</span></div></div>
          </div>
        </section>

        <section id="logos" className="section page-width">
          <div className="section-heading"><div><span className="eyebrow">02 / AS REFERÊNCIAS</span><h2 className="font-display">Olhar para descobrir o nosso estilo.</h2></div><p>Dez logos reais para conversar sobre letras, cores e desenhos. Cada uma tem sua fonte.</p></div>
          <div className="gallery-toolbar"><div className="filter-list" role="group" aria-label="Filtrar referências por composição">{filters.map((item) => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`filter-button ${filter === item.id ? 'active' : ''}`}>{item.label}</button>)}</div><span className="text-sm text-muted" aria-live="polite">{visibleReferences.length} {visibleReferences.length === 1 ? 'referência' : 'referências'}</span></div>
          <div className="references-grid">
            {visibleReferences.map((item) => <article key={item.id} className="reference-card">
              <div className="reference-art">
                <button type="button" className="enlarge-button" aria-label={`Ampliar logo de ${item.name}`} onClick={() => setOpenReference(item)}><ReferenceImage reference={item} /><span className="enlarge-caption"><MagnifyingGlassPlus size={18} aria-hidden="true" />Ampliar</span></button>
                <FavoriteButton compact selected={choices.references.includes(item.id)} label={item.name} onClick={() => toggle('references', item.id)} />
              </div>
              <div className="reference-caption"><h3>{item.name}</h3><p>{item.lesson}</p><a href={item.source} target="_blank" rel="noopener noreferrer" className="source-link">Ver fonte</a></div>
            </article>)}
          </div>
          <p className="section-footnote">Referências de outras marcas, reunidas em 05/10/2026. As imagens pertencem aos respectivos donos e servem como inspiração. Nenhuma delas é a nossa logo.</p>
        </section>

        <section id="favoritos" className="favorites-section page-width">
          <div className="section-heading"><div><span className="eyebrow">03 / PARA A NOSSA CONVERSA</span><h2 className="font-display">O que ficou com a gente?</h2></div><p>Separem dois nomes e três referências. Depois, contem um ao outro o que mais gostaram.</p></div>
          {totalChoices === 0 ? <div className="empty-notebook"><Heart size={28} aria-hidden="true" /><div><h3>Seu caderno começa aqui.</h3><p>Marque o coração nos nomes e nas logos que chamaram sua atenção. Eles vão aparecer juntos neste espaço.</p></div></div> : <div className="chosen-grid">
            <div><h3 className="choices-heading">Nomes que gostei <span>{choices.names.length}</span></h3>{choices.names.length ? <ul>{names.filter((item) => choices.names.includes(item.id)).map((item) => <li key={item.id} className="chosen-name"><Check size={20} aria-hidden="true" /><span className="font-display">{item.name}</span><button type="button" className="icon-button" aria-label={`Remover ${item.name} dos favoritos`} onClick={() => toggle('names', item.id)}><X size={18} aria-hidden="true" /></button></li>)}</ul> : <p className="text-muted mt-5">Nenhum nome marcado ainda.</p>}</div>
            <div><h3 className="choices-heading">Logos que gostei <span>{choices.references.length}</span></h3>{choices.references.length ? <div className="chosen-logos">{references.filter((item) => choices.references.includes(item.id)).map((item) => <button type="button" key={item.id} aria-label={`Ver referência favorita: ${item.name}`} onClick={() => setOpenReference(item)}><img src={asset(item.filename)} alt="" /><span>{item.name}</span></button>)}</div> : <p className="text-muted mt-5">Nenhuma referência marcada ainda.</p>}</div>
          </div>}
          <div className="notebook-footer"><p role={storageError ? 'status' : undefined}>{storageError ? 'Não foi possível guardar as marcações neste navegador. Você ainda pode comparar os favoritos enquanto esta página estiver aberta.' : 'Suas marcações ficam neste aparelho. Cada um pode fazer as suas escolhas.'}</p>{totalChoices > 0 && <button type="button" className="text-link" onClick={() => setChoices({ names: [], references: [] })}>Limpar marcações</button>}</div>
          <div className="next-step"><span className="eyebrow">DEPOIS DA ESCOLHA</span><p>Pesquisar os nomes finalistas. Definir o caminho visual.<br className="hidden md:block" /> E começar a desenhar uma logo que seja só nossa.</p></div>
        </section>
      </main>
      <footer className="site-footer"><div className="page-width flex flex-wrap items-center justify-between gap-4"><span className="font-display text-xl">Nossa batataria, desde a primeira ideia.</span><span className="text-sm">Senador Canedo / Goiás · Projeto em construção</span></div></footer>
      <ReferenceDialog reference={openReference} onClose={() => setOpenReference(null)} selected={openReference ? choices.references.includes(openReference.id) : false} onFavorite={() => { if (openReference) toggle('references', openReference.id); }} />
    </>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
