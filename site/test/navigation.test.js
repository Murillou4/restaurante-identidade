import test from 'node:test';
import assert from 'node:assert/strict';
import { readRoute, budgetHash } from '../src/navigation.js';

test('a entrada do caderno apresenta a visão geral, sem iniciar uma simulação por engano', () => {
  assert.deepEqual(readRoute(), { page: 'inicio' });
  assert.deepEqual(readRoute('#inicio'), { page: 'inicio' });
  assert.deepEqual(readRoute('#pagina-antiga-desconhecida'), { page: 'inicio' });
});

test('links principais antigos continuam abrindo orçamento, marca e plano de abertura', () => {
  assert.deepEqual(readRoute('#orcamento'), { page: 'orcamento', tab: 'simular' });
  assert.deepEqual(readRoute('#galeria'), { page: 'galeria' });
  assert.deepEqual(readRoute('#planejamento'), { page: 'planejamento' });
});

test('atalhos do orçamento podem ser compartilhados e reabertos na ferramenta correta', () => {
  for (const tab of ['simular', 'custos', 'receitas', 'canais', 'operacao']) {
    assert.equal(budgetHash(tab), `#orcamento-${tab}`);
    assert.deepEqual(readRoute(`#orcamento-${tab}`), { page: 'orcamento', tab });
  }
  assert.deepEqual(readRoute('#orcamento-inexistente'), { page: 'inicio' });
});

test('aliases de marca abrem a mesma seção que as âncoras existentes', () => {
  for (const [legacy, anchor] of [['nomes', 'gallery-nomes'], ['logos', 'gallery-logos'], ['favoritos', 'gallery-favoritos']]) {
    const destination = { page: 'galeria', anchor };
    assert.deepEqual(readRoute(`#${legacy}`), destination);
    assert.deepEqual(readRoute(`#${anchor}`), destination);
  }
});
