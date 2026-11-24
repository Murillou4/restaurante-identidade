import React, { useEffect, useId, useRef, useState } from 'react';
import { Heart, MagnifyingGlassPlus, X } from '@phosphor-icons/react';
import { names, references, filters } from './data';

const asset = filename => `${import.meta.env.BASE_URL}referencias/${filename}`;
const emptyChoices = { names: [], references: [] };
const brandSections = [
  { id: 'gallery-nomes', label: 'Nomes' },
  { id: 'gallery-logos', label: 'Logos' },
];
const readBrandSection = () => {
  const hash = window.location.hash.slice(1);
  if (hash === 'nomes') return 'gallery-nomes';
  if (hash === 'logos') return 'gallery-logos';
  return brandSections.some(section => section.id === hash) ? hash : 'gallery-nomes';
};

function FavoriteButton({ selected, onClick, label, compact = false, text = 'Gostei deste nome', disabled = false, pending = false }) {
  const visibleText = pending ? 'Salvando…' : selected ? 'Favorito' : text;

  return (
    <button
      type="button"
      disabled={disabled || pending}
      aria-busy={pending}
      aria-pressed={selected}
      aria-label={compact
        ? `${pending ? 'Salvando' : selected ? 'Desmarcar' : 'Marcar'} ${label} como favorito`
        : `${visibleText}: ${label}${selected && !pending ? '. Desmarcar' : ''}`}
      onClick={onClick}
      className={`favorite-button ${selected ? 'is-selected' : ''} ${compact ? 'compact' : ''}`}
    >
      <Heart size={20} weight={selected ? 'fill' : 'regular'} aria-hidden="true" />
      {!compact && <span>{visibleText}</span>}
    </button>
  );
}

function ReferenceImage({ reference, large = false }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className={`logo-image ${large ? 'large' : ''} ${loaded || failed ? 'is-loaded' : 'is-loading'} ${['baked', 'roasted'].includes(reference.id) ? 'wide-logo' : ''}`}>
      {failed ? (
        <p className="image-fallback">Imagem indisponível. Veja a fonte abaixo.</p>
      ) : (
        <img
          src={asset(reference.filename)}
          alt={`Logo de ${reference.name}`}
          loading={large ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function ReferenceDialog({ reference, onClose, selected, onFavorite, disabled, pending }) {
  const dialog = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (reference && !dialog.current.open) dialog.current.showModal();
    if (!reference && dialog.current.open) dialog.current.close();
  }, [reference]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby={titleId}
      className="reference-dialog"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      {reference && (
        <div className="dialog-content">
          <div className="flex items-center justify-between gap-4">
            <span className="eyebrow">Referência de outra marca</span>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar referência">
              <X size={24} aria-hidden="true" />
            </button>
          </div>
          <ReferenceImage key={reference.id} reference={reference} large />
          <h2 id={titleId} className="font-display text-3xl">{reference.name}</h2>
          <p className="mt-3 leading-relaxed text-muted">{reference.description}</p>
          <p className="mt-4 font-medium">{reference.lesson}</p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <a className="source-link" href={reference.source} target="_blank" rel="noopener noreferrer">{reference.provenance}</a>
            <FavoriteButton
              selected={selected}
              label={reference.name}
              onClick={onFavorite}
              text="Gostei desta referência"
              disabled={disabled}
              pending={pending}
            />
          </div>
        </div>
      )}
    </dialog>
  );
}

export default function Gallery({ shared }) {
  const choices = shared.person ? shared.room?.people[shared.person] ?? emptyChoices : emptyChoices;
  const [filter, setFilter] = useState('todas');
  const [openReference, setOpenReference] = useState(null);
  const [section, setSection] = useState(readBrandSection);
  const visibleReferences = references.filter(item => filter === 'todas' || item.category === filter);
  const toggle = (type, id) => shared.toggle(type, id);
  const pending = (type, id) => shared.pendingKeys.has(`${shared.person}:${type}:${id}`);
  const resetBlocked = [...shared.pendingKeys, ...shared.failedKeys].some(key => key.endsWith(':reset'));
  const blocked = (type, id) => !shared.person || !shared.room || resetBlocked || shared.failedKeys.has(`${shared.person}:${type}:${id}`);

  useEffect(() => {
    const onHash = () => setSection(readBrandSection());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <>
      <nav className="gallery-toolbar" aria-label="Explorar a marca">
        <div className="filter-list">
          {brandSections.map(item => (
            <a
              key={item.id}
              className={`filter-button ${section === item.id ? 'active' : ''}`}
              href={`#${item.id}`}
              aria-current={section === item.id ? 'location' : undefined}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>
      <section id="gallery-nomes" className="section page-width">
        <h2 className="gallery-section-title">Nomes</h2>
        <div className="names-grid">
          {names.map((item, index) => (
            <article key={item.id} className={`name-card name-card-${index + 1} ${choices.names.includes(item.id) ? 'is-favorite' : ''}`}>
              <div className="name-preview">
                <h3 className="font-display">{item.name}</h3>
                <span>{item.descriptor}</span>
              </div>
              <p className="name-description">{item.description}</p>
              <blockquote>“{item.phrase}”</blockquote>
              <FavoriteButton
                selected={choices.names.includes(item.id)}
                label={item.name}
                onClick={() => toggle('names', item.id)}
                disabled={blocked('names', item.id)}
                pending={pending('names', item.id)}
              />
            </article>
          ))}
        </div>
      </section>

      <section id="gallery-logos" className="section page-width">
        <h2 className="gallery-section-title">Referências de logo</h2>
        <div className="gallery-toolbar">
          <div className="filter-list" role="group" aria-label="Filtrar referências por composição">
            {filters.map(item => (
              <button
                type="button"
                key={item.id}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={`filter-button ${filter === item.id ? 'active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="references-grid">
          {visibleReferences.map(item => (
            <article key={item.id} className="reference-card">
              <div className="reference-art">
                <button type="button" className="enlarge-button" aria-label={`Ampliar logo de ${item.name}`} onClick={() => setOpenReference(item)}>
                  <ReferenceImage reference={item} />
                  <span className="enlarge-caption"><MagnifyingGlassPlus size={18} aria-hidden="true" />Ampliar</span>
                </button>
                <FavoriteButton
                  compact
                  selected={choices.references.includes(item.id)}
                  label={item.name}
                  onClick={() => toggle('references', item.id)}
                  disabled={blocked('references', item.id)}
                  pending={pending('references', item.id)}
                />
              </div>
              <div className="reference-caption">
                <h3>{item.name}</h3>
                <p>{item.lesson}</p>
                <a href={item.source} target="_blank" rel="noopener noreferrer" className="source-link">Ver fonte</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="gallery-logos" className="section page-width">
        <h2 className="gallery-section-title">Referências de logo</h2>
        <div className="gallery-toolbar">
          <div className="filter-list" role="group" aria-label="Filtrar referências por composição">
            {filters.map(item => (
              <button
                type="button"
                key={item.id}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={`filter-button ${filter === item.id ? 'active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="references-grid">
          {visibleReferences.map(item => (
            <article key={item.id} className="reference-card">
              <div className="reference-art">
                <button type="button" className="enlarge-button" aria-label={`Ampliar logo de ${item.name}`} onClick={() => setOpenReference(item)}>
                  <ReferenceImage reference={item} />
                  <span className="enlarge-caption"><MagnifyingGlassPlus size={18} aria-hidden="true" />Ampliar</span>
                </button>
                <FavoriteButton
                  compact
                  selected={choices.references.includes(item.id)}
                  label={item.name}
                  onClick={() => toggle('references', item.id)}
                  disabled={blocked('references', item.id)}
                  pending={pending('references', item.id)}
                />
              </div>
              <div className="reference-caption">
                <h3>{item.name}</h3>
                <p>{item.lesson}</p>
                <a href={item.source} target="_blank" rel="noopener noreferrer" className="source-link">Ver fonte</a>
              </div>
            </article>
          ))}
        </div>
        <p className="section-footnote">Referências de outras marcas, reunidas em 05/10/2026. As imagens pertencem aos respectivos donos e servem como inspiração. Nenhuma delas é a nossa logo.</p>
        <div className="next-step">
          <span className="eyebrow">DEPOIS DA ESCOLHA</span>
          <p>Pesquisar os nomes finalistas. Definir o caminho visual.<br className="hidden md:block" /> E começar a desenhar uma logo que seja só nossa.</p>
        </div>
      </section>

      <ReferenceDialog
        reference={openReference}
        onClose={() => setOpenReference(null)}
        selected={openReference ? choices.references.includes(openReference.id) : false}
        onFavorite={() => openReference && toggle('references', openReference.id)}
        disabled={openReference ? blocked('references', openReference.id) : true}
        pending={openReference ? pending('references', openReference.id) : false}
      />
    </>
  );
}
