# Nossa batataria

Caderno para acompanhar o custo e o preço de venda das batatas recheadas feitas por encomenda em Senador Canedo, Goiás.

## Usar o caderno

- **Preço de venda** mostra o custo, o preço sugerido e a sobra ou o prejuízo por batata. Digite o **Lucro desejado** para recalcular o preço sugerido e use **Preço que quer cobrar** para testar um valor de venda.
- **Preços de compra** aceita o preço por quilo, litro ou unidade. Em **Calcular pelo pacote**, informe o preço pago, a quantidade e a medida da compra, como 250 g ou 0,25 kg. A lista também permite cadastrar ingredientes, bebidas, embalagens e materiais.
- **Receitas** mostra as quantidades em gramas, mililitros ou unidades. Informe as quantidades para preparar o recheio e ajuste quanto vai em cada batata em **Preço de venda → Ajustar porções**. Ingredientes adicionados à receita são informados por batata e entram no custo do sabor.
- **Exportar dados deste aparelho** gera o arquivo para importar compras e receitas em **Custos → Importação** no Painel da Grazi. Depois de concluir a mudança no painel, o endereço do caderno oferece o acesso ao painel e a exportação de recuperação.
- **Despesas** reúne os custos fixos, as taxas e o volume mensal.
- **Marca** reúne sugestões de nome e referências de logo. Escolha **Mãe** ou **Filho** para marcar favoritos nas próprias opções.

Os sabores do cartaz são **Pizza**, **Bacon**, **Calabresa** e **Frango**. Os preços e o uso de presunto e orégano, as edições e a seleção da Pizza, os itens personalizados e a embalagem plástica de X-salada ficam no navegador, por caderno. Os demais itens do catálogo usam o salvamento compartilhado.

Em qualquer tela, use **Copiar link do caderno** no rodapé para acessar os mesmos dados em outro aparelho. O parâmetro `caderno` identifica o caderno. Quem tem o link completo pode consultar e editar os dados. [Abrir o caderno](https://murillou4.github.io/restaurante-identidade/)

Alterações no orçamento recalculam os valores na tela. Clique em **Salvar** para compartilhar as mudanças. Em caso de falha na conexão ou edição concorrente, o formulário preserva as mudanças locais para nova tentativa ou revisão.

## Desenvolvimento

O site usa React, Vite, Tailwind CSS e Node.js 24.

```sh
cd site
npm ci
npm run dev
npm test
npm run build
npm run preview
```

O workflow `.github/workflows/pages.yml` publica `site/dist` no GitHub Pages a partir da `main`. O Vite usa caminhos relativos para os recursos.

Os links diretos são `#orcamento-simular`, `#orcamento-custos`, `#orcamento-receitas`, `#orcamento-operacao` e `#galeria`. Os links antigos da entrada e do plano abrem **Preço de venda**. Os links de favoritos abrem **Nomes** em Marca.

## Dados

`budgetCatalog.js` mantém os preços de referência e as receitas. `budgetMath.js` calcula custos e preços. O preço por quilo, litro ou unidade é derivado do preço e da quantidade já salvos. Os dois campos são gravados juntos ao editar uma compra.

`useSharedBudget.js` salva o orçamento com controle de revisão e consulta atualizações a cada 15 segundos. `useSharedChoices.js` salva as escolhas de marca. O backend é hospedado separadamente e usa SQLite (D1).

Os valores da pesquisa são referências de 06/10/2026. Consulte o [modelo de orçamento](docs/ORCAMENTO.md) e as [fontes dos preços](docs/PRECOS-REFERENCIA.md). As imagens de referência em **Marca** pertencem aos respectivos autores.

As miniaturas dos ingredientes e sabores são imagens ilustrativas geradas para o caderno. [Prompts e arquivos](docs/IMAGENS.md)
