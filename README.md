# Nossa batataria

Caderno interno para mãe e filho organizarem um delivery de batata recheada em Senador Canedo, Goiás. Organiza o projeto em **Visão geral, Orçamento, Marca e Plano de abertura**. A página não recebe pedidos nem vende produtos.

O negócio está em definição. Os quatro nomes são sugestões. As dez logos são referências de outras marcas, com links para as respectivas fontes.

## Desenvolvimento

O site fica em `site/` e usa React, Vite e Tailwind CSS. Requer Node.js 24.

```sh
cd site
npm ci
npm run dev
```

Para compilar e conferir a versão de produção:

```sh
npm run build
npm run preview
```

O workflow `.github/workflows/pages.yml` publica `site/dist` no GitHub Pages. Os caminhos dos recursos usam uma base relativa para funcionar no subdiretório do repositório.

## Conteúdo e escolhas

A **Visão geral** é a entrada do caderno e explica o objetivo, a prioridade de testar custos e montagem e os próximos passos. O **Orçamento** reúne cinco ferramentas: **Simular preço**, **Preços de compra**, **Recheios e sabores**, **Vendas e entrega** e **Despesas e meta**. A área **Marca** separa favoritos, nomes e referências. O **Plano de abertura** distingue o que já está definido, o que está em teste, o que falta decidir e as ideias para depois.

Na simulação, custo completo, preço sugerido e resultado por batata aparecem em destaque. A composição dos custos, as quantidades para comprar e a projeção mensal ficam em blocos expansíveis. Nas demais ferramentas, um resumo compacto permite voltar à simulação. Os formulários continuam montados ao trocar de área ou ferramenta, preservando também textos inválidos que ainda precisam de correção.

A navegação usa hashes: `#inicio`, `#orcamento`, `#galeria` (Marca) e `#planejamento` (Plano de abertura). As ferramentas aceitam links diretos `#orcamento-simular`, `#orcamento-custos`, `#orcamento-receitas`, `#orcamento-canais` e `#orcamento-operacao`. Links antigos de nomes, logos e favoritos continuam funcionando. O link compartilhado abre a Visão geral do mesmo caderno.

- `DEFINICOES-DO-RESTAURANTE.md`: decisões confirmadas, sugestões e próximas definições.
- `site/src/data.js`: nomes e referências apresentados no site.
- `assets/referencias/fontes.json`: fontes das imagens pesquisadas em 05/10/2026.
- `site/public/referencias/`: cópias das imagens para a apresentação.

Favoritos e orçamento são salvos online em um caderno identificado pelo parâmetro `caderno` no link. A área Marca mostra as escolhas do filho e da mãe separadamente e atualiza a cada 10 segundos. O seletor **Eu (filho) / Mãe** aparece somente em Marca e identifica quem marca os favoritos; essa preferência fica no navegador. O orçamento é único para os dois e consulta mudanças a cada 15 segundos, ao voltar para a aba e após salvar.

Abra [o site](https://murillou4.github.io/restaurante-identidade/) e use **Copiar link compartilhado**. É preciso compartilhar o link completo do caderno: abrir apenas a página inicial em outro aparelho cria outro caderno. Para marcar favoritos, selecione quem está marcando em Marca. Quem tem o link pode ler e alterar os dados, sem conta ou senha.

No Orçamento, mudanças alteram a simulação imediatamente; clique em **Salvar orçamento** para guardar os dados para os dois aparelhos. Edições sem salvar permanecem na aba e são protegidas de atualizações de outro aparelho. Uma revisão do servidor impede sobrescrever silenciosamente um orçamento antigo. Ao salvar, o caderno guarda também valores iniciais que ainda não estavam registrados, incluindo novos ajustes de canal em cadernos antigos.

`site/src/useSharedChoices.js` conecta o GitHub Pages à API hospedada em Sites, com persistência SQLite (D1). As gravações usam valores explícitos e o site só confirma um favorito depois da resposta do servidor. Falhas oferecem uma tentativa de repetição e não substituem as últimas escolhas confirmadas.

O código do backend é mantido no projeto de hospedagem separado `shared-backend/`, ignorado neste repositório. Ele aceita quatro nomes, dez referências, as identidades `eu`/`mae` e campos validados do orçamento; cada caderno usa um UUID aleatório no link. Não são solicitados nome pessoal, e-mail, telefone ou endereço.

## Modelo de orçamento

`budgetCatalog.js` mantém preços iniciais com fonte/data e as composições de recheio. `budgetMath.js` calcula custo, margem, resultado e ponto de equilíbrio; três recheios dividem o mesmo peso total. `useSharedBudget.js` mantém os valores confirmados separados das edições ainda não salvas.

Em **Preços de compra**, a compra é informada diretamente por kg, litro ou unidade. A leitura converte as referências e os cadernos antigos sem alterar seus custos; uma edição explícita salva preço e base de conversão juntos. Os dados das embalagens originais da pesquisa ficam em uma seção recolhida.

`salesChannels.js` compara venda direta, iFood Básico com entrega própria e iFood Entrega. Em **Vendas e entrega**, a comparação aparece primeiro; **Ajustar condições** reúne comissão, pagamento online, participação das vendas online, mensalidades, carência, entrega, promoções e outras taxas. Taxas diretas e entrega subsidiada são editadas somente aqui. O volume mensal fica em **Despesas e meta**, junto dos custos por batata, custos fixos, perdas, impostos e margem. O canal escolhido recalcula também as sugestões de receitas. Os ajustes são salvos no mesmo orçamento compartilhado. A pesquisa oficial de **06/10/2026** e as hipóteses sobre a base das taxas estão em [docs/IFOOD.md](docs/IFOOD.md).

Os preços publicados por lojas de Goiânia em 06/10/2026 são referências, sem garantia de disponibilidade ou entrega. Itens estimados e indisponíveis têm rótulos próprios. Porções, receitas, rendimento, margem, energia e trabalho são hipóteses editáveis, não definições finais. Consulte `docs/ORCAMENTO.md` e `docs/PRECOS-REFERENCIA.md`.

Para validar o cálculo:

```sh
cd site
npm test
npm run build
```

As imagens de referência pertencem aos respectivos donos; nenhuma é a logo deste projeto. Não foram geradas novas imagens para o site.
