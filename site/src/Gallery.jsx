import React, { useEffect, useId, useRef, useState } from 'react';
import { BookmarkSimple, Check, Heart, MagnifyingGlassPlus, X } from '@phosphor-icons/react';
import { names, references, filters } from './data';

const asset = filename => `${import.meta.env.BASE_URL}referencias/${filename}`;
const emptyChoices = { names: [], references: [] };

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
  const visibleReferences = references.filter(item => filter === 'todas' || item.category === filter);
  const toggle = (type, id) => shared.toggle(type, id);
  const pending = (type, id) => shared.pendingKeys.has(`${shared.person}:${type}:${id}`);
  const resetBlocked = [...shared.pendingKeys, ...shared.failedKeys].some(key => key.endsWith(':reset'));
  const blocked = (type, id) => !shared.person || !shared.room || resetBlocked || shared.failedKeys.has(`${shared.person}:${type}:${id}`);

  return (
    <>
      <section id="gallery-favoritos" className="favorites-section page-width">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Galeria de nome e logo</span>
            <h2 className="font-display">As escolhas de vocês</h2>
          </div>
          <p>Os favoritos do filho e da mãe ficam lado a lado para ajudar na conversa sobre a nossa marca.</p>
        </div>

        {!shared.room ? (
          <div className="empty-notebook">
            <BookmarkSimple size={28} aria-hidden="true" />
            <div>
              <h3>{shared.loading ? 'Abrindo o caderno compartilhado…' : 'Vamos reconectar o caderno.'}</h3>
              <p>As escolhas dos dois aparecem aqui quando a conexão estiver pronta.</p>
            </div>
          </div>
        ) : (
          <div className="chosen-grid shared-people">
            {['eu', 'mae'].map(person => {
              const personChoices = shared.room.people[person] ?? emptyChoices;
              const count = personChoices.names.length + personChoices.references.length;

              return (
                <article className="person-choices" key={person}>
                  <h3 className="choices-heading">
                    {person === 'eu' ? 'Escolhas do filho' : 'Escolhas da mãe'}
                    <span>{count} {count === 1 ? 'favorito' : 'favoritos'}</span>
                    {person === shared.person && <span className="editing-person">VOCÊ ESTÁ MARCANDO AQUI</span>}
                  </h3>

                  <h4 className="choice-type-heading">Nomes</h4>
                  {personChoices.names.length ? (
                    <ul>
                      {names.filter(item => personChoices.names.includes(item.id)).map(item => (
                        <li key={item.id} className="chosen-name">
                          <Check size={20} aria-hidden="true" />
                          <span className="font-display">{item.name}</span>
                          {person === shared.person && (
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Remover ${item.name} dos favoritos`}
                              disabled={blocked('names', item.id) || pending('names', item.id)}
                              onClick={() => toggle('names', item.id)}
                            >
                              <X size={18} aria-hidden="true" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-muted mt-3">Nenhum nome marcado ainda.</p>}

                  <h4 className="choice-type-heading">Referências de logo</h4>
                  {personChoices.references.length ? (
                    <div className="chosen-logos">
                      {references.filter(item => personChoices.references.includes(item.id)).map(item => (
                        <button
                          type="button"
                          key={item.id}
                          aria-label={`Ver referência favorita: ${item.name}`}
                          onClick={() => setOpenReference(item)}
                        >
                          <img src={asset(item.filename)} alt="" />
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : <p className="text-muted mt-3">Nenhuma referência marcada ainda.</p>}
                </article>
              );
            })}
          </div>
        )}

        <div className="notebook-footer">
          <p>As escolhas são compartilhadas e atualizadas automaticamente. Usem o mesmo link do caderno; quem tem esse link pode participar.</p>
          {shared.person && (choices.names.length + choices.references.length) > 0 && (
            <button
              type="button"
              className="text-link"
              disabled={shared.isBusy || shared.failedKeys.size > 0}
              onClick={shared.clearPerson}
            >
              Limpar minhas marcações
            </button>
          )}
        </div>
        <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-3" aria-label="Explorar a galeria">
          <a className="text-link" href="#gallery-nomes">Ver ideias de nome</a>
          <a className="text-link" href="#gallery-logos">Ver referências de logo</a>
        </nav>
      </section>

      <section id="gallery-nomes" className="section page-width">
        <div className="section-heading">
          <div>
            <span className="eyebrow">01 / O NOME</span>
            <h2 className="font-display">Como vamos nos chamar?</h2>
          </div>
          <p>Leia em voz alta. Imagine alguém pedindo a nossa batata pelo nome.</p>
        </div>
        <div className="names-grid">
          {names.map((item, index) => (
            <article key={item.id} className={`name-card name-card-${index + 1} ${choices.names.includes(item.id) ? 'is-favorite' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="eyebrow">IDEIA {String(index + 1).padStart(2, '0')}</span>
                <span className="name-tone">{item.tone}</span>
              </div>
              <div className="name-preview">
                <h3 className="font-display">{item.name}</h3>
                <span>{item.descriptor}</span>
              </div>
              <p className="name-description">{item.description}</p>
              <blockquote>“{item.phrase}”</blockquote>
              <p className="name-consideration">{item.consideration}</p>
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
        <p className="section-footnote">{names.length} ideias iniciais. O nome ainda será escolhido por vocês, e a disponibilidade precisa ser pesquisada.</p>
      </section>

      <section className="direction-section">
        <div className="page-width direction-grid">
          <div>
            <span className="eyebrow">O JEITO QUE BUSCAMOS</span>
            <h2 className="font-display">Acolhedor.<br />Simples. <em>Nosso.</em></h2>
          </div>
          <div className="direction-copy">
            <p>Uma identidade que lembre o conforto de comer em casa. Letras gostosas de ler, poucos elementos e um detalhe com personalidade.</p>
            <p className="mt-5 text-muted">Creme, marrom e terracota são uma paleta para experimentar. A logo e as cores ainda estão em aberto.</p>
            <div className="palette" aria-label="Paleta sugerida: creme, marrom e terracota">
              <span className="swatch swatch-cream">Creme</span>
              <span className="swatch swatch-brown">Marrom</span>
              <span className="swatch swatch-clay">Terracota</span>
            </div>
          </div>
        </div>
      </section>

      <section id="gallery-logos" className="section page-width">
        <div className="section-heading">
          <div>
            <span className="eyebrow">02 / AS REFERÊNCIAS</span>
            <h2 className="font-display">Olhar para descobrir o nosso estilo.</h2>
          </div>
          <p>{references.length} logos reais para conversar sobre letras, cores e desenhos. Cada uma tem sua fonte.</p>
        </div>
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
          <span className="text-sm text-muted" aria-live="polite">{visibleReferences.length} {visibleReferences.length === 1 ? 'referência' : 'referências'}</span>
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
