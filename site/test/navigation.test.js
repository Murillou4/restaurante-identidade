import test from 'node:test';
import assert from 'node:assert/strict';
import { readRoute, budgetHash } from '../src/navigation.js';

test('a entrada do caderno e as páginas removidas abrem o preço de venda', () => {
  const sale = { page: 'orcamento', tab: 'simular' };
  for (const hash of [undefined, '#inicio', '#planejamento', '#orcamento', '#pagina-antiga-desconhecida', '#constructor']) {
    assert.deepEqual(readRoute(hash), sale);
  }
});

test('o link da marca continua abrindo a galeria', () => {
  assert.deepEqual(readRoute('#galeria'), { page: 'galeria' });
});

test('atalhos do orçamento podem ser compartilhados e reabertos na ferramenta correta', () => {
  for (const tab of ['simular', 'custos', 'receitas', 'operacao']) {
    assert.equal(budgetHash(tab), `#orcamento-${tab}`);
    assert.deepEqual(readRoute(`#orcamento-${tab}`), { page: 'orcamento', tab });
  }
  assert.deepEqual(readRoute('#orcamento-canais'), { page: 'orcamento', tab: 'operacao' });
  assert.deepEqual(readRoute('#orcamento-inexistente'), { page: 'orcamento', tab: 'simular' });
});

test('aliases de marca abrem a mesma seção que as âncoras existentes', () => {
  for (const [legacy, anchor] of [['nomes', 'gallery-nomes'], ['logos', 'gallery-logos']]) {
    const destination = { page: 'galeria', anchor };
    assert.deepEqual(readRoute(`#${legacy}`), destination);
    assert.deepEqual(readRoute(`#${anchor}`), destination);
  }
  for (const hash of ['#favoritos', '#gallery-favoritos', '#mural']) {
    assert.deepEqual(readRoute(hash), { page: 'galeria', anchor: 'gallery-nomes' });
  }
});
