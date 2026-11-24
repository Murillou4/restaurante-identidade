export const budgetTabs = [
  { id: 'simular', name: 'Preço de venda' },
  { id: 'custos', name: 'Preços de compra' },
  { id: 'receitas', name: 'Receitas' },
  { id: 'operacao', name: 'Despesas' },
];

export const budgetHash = (id) => `#orcamento-${id}`;

const galleryAnchors = {
  nomes: 'gallery-nomes',
  logos: 'gallery-logos',
};

/** One route table keeps the menu, shortcuts and old shared links consistent. */
export function readRoute(hash = '') {
  const value = hash.replace(/^#/, '');
  if (value === 'orcamento-canais') return { page: 'orcamento', tab: 'operacao' };
  const tab = budgetTabs.find((item) => value === `orcamento-${item.id}`);
  if (tab) return { page: 'orcamento', tab: tab.id };
  if (value === 'galeria') return { page: 'galeria' };
  if (value === 'favoritos' || value === 'gallery-favoritos' || value === 'mural') {
    return { page: 'galeria', anchor: galleryAnchors.nomes };
  }
  const anchor = Object.hasOwn(galleryAnchors, value) ? galleryAnchors[value] : Object.values(galleryAnchors).find((id) => id === value);
  if (anchor) return { page: 'galeria', anchor };
  return { page: 'orcamento', tab: 'simular' };
}
