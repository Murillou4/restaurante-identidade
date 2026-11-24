const purchases = [
  'batata', 'frango', 'bacon', 'calabresa', 'carne-sol',
  'mucarela', 'requeijao', 'cheddar', 'cebola', 'alho',
  'molho', 'oleo', 'sal', 'manteiga', 'creme',
  'milho', 'brocolis', 'champignon', 'batata-palha', 'cheiro-verde',
  'presunto', 'oregano', 'pote', 'saco', 'guardanapo',
];
const flavors = ['pizza', 'bacon', 'calabresa', 'frango'];

export default function BudgetThumbnail({ id, flavor = false }) {
  const items = flavor ? flavors : purchases;
  const index = items.indexOf(id === 'talher' ? 'guardanapo' : id);
  if (index < 0) return null;

  const size = flavor ? 2 : 5;
  const position = 100 / (size - 1);
  const file = flavor ? 'sabores.webp' : 'compras.webp';
  const image = new URL(`${import.meta.env.BASE_URL}itens/${file}`, document.baseURI);
  return <span
    aria-hidden="true"
    className="budget-thumbnail"
    style={{
      '--thumbnail-image': `url("${image.href}")`,
      '--thumbnail-size': `${size * 100}%`,
      '--thumbnail-position': `${index % size * position}% ${Math.floor(index / size) * position}%`,
    }}
  />;
}
