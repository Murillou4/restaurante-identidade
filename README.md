# Nossa batataria

Caderno interno para mãe e filho organizarem um delivery de batata recheada em Senador Canedo, Goiás. Reúne orçamento, receitas, referências de preço, planejamento e uma galeria da identidade. A página não recebe pedidos nem vende produtos.

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

- `DEFINICOES-DO-RESTAURANTE.md`: decisões confirmadas, sugestões e próximas definições.
- `site/src/data.js`: nomes e referências apresentados no site.
- `assets/referencias/fontes.json`: fontes das imagens pesquisadas em 05/10/2026.
- `site/public/referencias/`: cópias das imagens para a apresentação.

Favoritos e orçamento são salvos online em um caderno identificado pelo parâmetro `caderno` no link. A Galeria mostra as escolhas do filho e da mãe separadamente e atualiza a cada 10 segundos. O seletor **Eu (filho) / Mãe** aparece somente na Galeria e identifica quem marca os favoritos; essa preferência fica no navegador. O orçamento é único para os dois e consulta mudanças a cada 15 segundos, ao voltar para a aba e após salvar.

Abra [o site](https://murillou4.github.io/restaurante-identidade/) e use **Copiar link compartilhado**. É preciso compartilhar o link completo do caderno: abrir apenas a página inicial em outro aparelho cria outro caderno. Para marcar favoritos, selecione quem está marcando na Galeria. Quem tem o link pode ler e alterar os dados, sem conta ou senha.

No Orçamento, mudanças alteram a simulação imediatamente; clique em **Salvar orçamento** para guardar os dados para os dois aparelhos. Edições sem salvar permanecem na aba e são protegidas de atualizações de outro aparelho. Uma revisão do servidor impede sobrescrever silenciosamente um orçamento antigo. A primeira gravação guarda também os valores iniciais usados na simulação.

`site/src/useSharedChoices.js` conecta o GitHub Pages à API hospedada em Sites, com persistência SQLite (D1). As gravações usam valores explícitos e o site só confirma um favorito depois da resposta do servidor. Falhas oferecem uma tentativa de repetição e não substituem as últimas escolhas confirmadas.

O código do backend é mantido no projeto de hospedagem separado `shared-backend/`, ignorado neste repositório. Ele aceita quatro nomes, dez referências, as identidades `eu`/`mae` e campos validados do orçamento; cada caderno usa um UUID aleatório no link. Não são solicitados nome pessoal, e-mail, telefone ou endereço.

## Modelo de orçamento

`budgetCatalog.js` mantém preços iniciais com fonte/data e as composições de recheio. `budgetMath.js` calcula custo, margem, resultado e ponto de equilíbrio; três recheios dividem o mesmo peso total. `useSharedBudget.js` mantém os valores confirmados separados das edições ainda não salvas.

Os preços publicados por lojas de Goiânia em 06/10/2026 são referências, sem garantia de disponibilidade ou entrega. Itens estimados e indisponíveis têm rótulos próprios. Porções, receitas, rendimento, margem, energia e trabalho são hipóteses editáveis, não definições finais. Consulte `docs/ORCAMENTO.md` e `docs/PRECOS-REFERENCIA.md`.

Para validar o cálculo:

```sh
cd site
npm test
npm run build
```

As imagens de referência pertencem aos respectivos donos; nenhuma é a logo deste projeto. Não foram geradas novas imagens para o site.
