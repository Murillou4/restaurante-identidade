export const budgetTabs = [
  { id: 'simular', name: 'Simular preço' },
  { id: 'custos', name: 'Cadastro de preços' },
  { id: 'receitas', name: 'Recheios e sabores' },
  { id: 'operacao', name: 'Despesas e meta' },
];

export const budgetHash = (id) => `#orcamento-${id}`;

const galleryAnchors = {
  favoritos: 'gallery-favoritos',
  nomes: 'gallery-nomes',
  logos: 'gallery-logos',
};

/** One route table keeps the menu, shortcuts and old shared links consistent. */
export function readRoute(hash = '') {
  const value = hash.replace(/^#/, '');
  if (value === 'orcamento') return { page: 'orcamento', tab: 'simular' };
  if (value === 'orcamento-canais') return { page: 'orcamento', tab: 'operacao' };
  const tab = budgetTabs.find((item) => value === `orcamento-${item.id}`);
  if (tab) return { page: 'orcamento', tab: tab.id };
  if (value === 'galeria' || value === 'planejamento') return { page: value };
  const anchor = galleryAnchors[value] || Object.values(galleryAnchors).find((id) => id === value);
  if (anchor) return { page: 'galeria', anchor };
  return { page: 'inicio' };
}
