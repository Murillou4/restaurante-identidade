# Orçamento da batata recheada

**Atualizado em 06/10/2026. Uso interno de mãe e filho.** O caderno permite comparar porções, ingredientes e preços para planejar o delivery em Senador Canedo/GO. As receitas e os custos iniciais são hipóteses editáveis; precisam de teste de cozinha e conferência das compras antes de aprovar cardápio e preço.

A referência de implementação é o [catálogo](../site/src/budgetCatalog.js), com os cálculos em [budgetMath.js](../site/src/budgetMath.js). As fontes públicas e seus limites estão em [PRECOS-REFERENCIA.md](PRECOS-REFERENCIA.md), com pesquisa de **06/10/2026**.

## Como usar o caderno juntos

1. Abrir o mesmo link completo do caderno nos dois aparelhos. O orçamento é único para vocês dois; não precisa escolher uma pessoa.
2. Comparar uma composição: queijo e de um a três recheios. Conferir a divisão dos recheios e o custo por porção.
3. Atualizar preços, pesos dos pacotes e rendimento com as compras e os testes reais. Ajustar as receitas e os custos da operação.
4. Informar o preço que pretendem praticar, o volume mensal e as taxas aplicáveis ao canal de venda.
5. Salvar e aguardar a confirmação **“Orçamento salvo para vocês dois.”** No outro aparelho, conferir a mesma composição e os valores confirmados.

As edições recalculam a simulação na aba atual; tornam-se compartilhadas depois da resposta do servidor. Em uma falha de salvamento, as edições continuam na aba e podem ser reenviadas. Se outro aparelho salvar primeiro, o caderno carrega os valores novos e preserva o rascunho para revisão antes de salvar novamente.

O seletor **Eu (filho) / Mãe** fica somente na Galeria e identifica quem marca os favoritos de nome e logo.

O frontend se conecta a uma API em um **backend separado**, com o orçamento associado ao mesmo identificador de caderno do link. Quem tem esse link pode acessar e editar o caderno. O salvamento de um orçamento registra uma simulação de planejamento; a aprovação da receita e do preço deve ser combinada pelos dois.

## Base inicial de uma porção

| Parte | Valor inicial | Interpretação |
| --- | ---: | --- |
| Batata | 450 g | Peso **cru comprado**; não é promessa de peso pronto |
| Queijo escolhido | 40 g | Contado à parte do total dos recheios |
| Recheios cremosos | 150 g no total | Peso útil das composições, dividido entre uma e três escolhas |
| Óleo | 5 ml | Hipótese por porção |
| Sal | 2 g | Hipótese por porção |
| Cheiro-verde | 2 g | Hipótese; preço do maço ainda estimado |
| Batata palha | 0 g | Editável; a sugestão de strogonoff usa 10 g |

Com um recheio, ele recebe **150 g**; com dois, **75 g cada**; com três, **50 g cada**. A escolha de mais recheios reparte os mesmos 150 g. O peso de cada creme inclui seus ingredientes: por exemplo, 150 g de frango cremoso não significam 150 g de carne de frango.

As escolhas de queijo são muçarela, cheddar, requeijão, muçarela + cheddar e sem queijo. Na combinação muçarela + cheddar, os 40 g são divididos em **20 g de cada**. O requeijão já presente na receita de um creme continua contado dentro do creme; os 40 g de queijo escolhido são a cobertura adicional.

## Receitas iniciais para testar

As quantidades abaixo descrevem a composição de **100 g de cada recheio**, em pesos úteis. São propostas para custear e comparar, sem aprovação de sabor, textura ou rendimento final do lote. As proporções são editáveis; o simulador as normaliza pelo total informado antes de aplicar à porção selecionada.

| Recheio | Composição inicial por 100 g |
| --- | --- |
| Frango cremoso | 70 g frango pronto + 22 g requeijão + 5 g molho de tomate + 2 g cebola + 1 g alho |
| Creme com bacon | 40 g bacon pronto + 55 g requeijão + 5 g cebola |
| Calabresa cremosa | 75 g calabresa pronta + 17 g requeijão + 5 g molho de tomate + 2 g cebola + 1 g alho |
| Strogonoff de frango | 60 g frango pronto + 24 g creme de leite + 5 g molho + 5 g ketchup + 2 g mostarda + 3 g cebola + 1 g alho |
| Carne de sol | 75 g carne pronta + 19 g requeijão + 3 g manteiga + 2 g cebola + 1 g alho |
| Milho cremoso | 75 g milho útil + 23 g requeijão + 2 g cebola |
| Brócolis cremoso | 70 g brócolis útil + 25 g requeijão + 3 g manteiga + 2 g cebola |
| Champignon cremoso | 70 g champignon drenado + 25 g requeijão + 3 g manteiga + 2 g cebola |

A proposta vegetariana combina milho e brócolis, 75 g de cada creme, com muçarela. A combinação **Suprema da Casa** usa frango, bacon e calabresa, 50 g de cada creme, e queijo misto. São atalhos de comparação. O champignon é uma alternativa para teste com compra pendente: a fonte pesquisada anuncia o produto **indisponível**.

## Rendimento de compra e reserva adicional

Para cada ingrediente, o modelo calcula a quantidade a comprar para obter a quantidade útil desejada:

```text
quantidade de compra = quantidade útil / (rendimento percentual / 100)
preço por kg = preço do pacote / peso do pacote em g × 1.000
custo do ingrediente = quantidade de compra em g / 1.000 × preço por kg
```

Para óleo, usar ml e R$/L; para unidades, usar a quantidade de unidades e R$/un. O rendimento é aplicado uma única vez. A batata mantém 450 g crus no orçamento com rendimento inicial de 100%; não é calculada como 450 g de batata assada.

Exemplo: uma porção com 150 g de frango cremoso leva **105 g de frango pronto**. Com rendimento hipotético de 60%, a compra necessária é **175 g**; a R$ 13,99/kg, esse frango custa **R$ 2,44825**. Se o corte ou o processo mudar, medir o novo rendimento antes de usar esse custo.

Os rendimentos iniciais são frango 60%, bacon 65%, calabresa 90%, carne de sol 70%, milho 85% e brócolis 85%. Os demais começam em 100%. São hipóteses, especialmente o peito de frango cuja descrição de venda não confirma filé sem osso, e o milho cujo peso drenado ainda precisa ser conferido. O champignon já usa 200 g drenados como conteúdo do pacote.

A **reserva adicional de 5%** incide sobre o custo total dos ingredientes. Ela é uma folga monetária para perdas extras ainda não identificadas; não é um segundo rendimento de preparo e não aumenta as gramas mostradas na lista de compra. Não registrar a mesma perda física no rendimento e novamente nessa reserva.

## Custos iniciais da operação

| Ajuste | Valor inicial | Estado |
| --- | ---: | --- |
| Reserva adicional sobre ingredientes | 5% | Hipótese editável |
| Embalagem por porção | R$ 1,9769 | Soma dos pacotes pesquisados: bandeja+tampa, saco, garfo e 2 guardanapos |
| Embalagem adicional | R$ 0,00 | Campo para despesas extras; não repetir os itens já contados |
| Energia por porção | R$ 0,80 | Hipótese; não é tarifa ou medição de consumo |
| Mão de obra por porção | R$ 2,00 | Hipótese de remuneração; não é salário apurado |
| Subsídio de entrega por porção | R$ 0,00 | Hipótese; incluir o que o negócio assumir da entrega |
| Custos fixos mensais | R$ 300,00 | Hipótese de planejamento |
| Volume mensal | 200 porções | Cenário, sem demanda confirmada |
| Impostos sobre a venda | 0% | Campo ainda a preencher com a operação real |
| Taxas sobre a venda | 0% | Campo ainda a preencher conforme canal/pagamento |
| Margem desejada | 25% da receita | Meta inicial para comparar preços |
| Preço escolhido | R$ 25,00 | Valor de simulação; preço de venda ainda a aprovar |

O conjunto de embalagem precisa de teste físico: a bandeja pesquisada tem 1.100 ml, mas só **4 cm de altura**. Conferir tampa, acomodação no saco, vazamentos e transporte com a porção completa. Os preços de embalagem não incluem frete nem adesivo.

Energia, mão de obra, fixos, volume, reserva, taxas, margem e preço escolhido **não são cotações de fornecedores**. Os zeros de impostos e taxas significam que ainda não foram informados; não comprovam isenção ou ausência de cobrança. Evitar contar remuneração, energia ou entrega tanto por porção quanto nos custos fixos.

## Como o preço e o resultado são calculados

Definições: `I` é o custo dos ingredientes com rendimento ajustado; `V` é o custo variável por porção; `F` são os custos fixos mensais; `N` é o volume mensal; `C` é o custo completo da porção; `P` é o preço escolhido. Na fórmula do preço, impostos, taxas e margem são frações: 25% = 0,25.

```text
reserva = I × 0,05
V = I + reserva + embalagem + energia + mão de obra + subsídio de entrega
fixos por porção = F / N
C = V + F / N

preço sugerido = C / (1 − impostos − taxas − margem desejada)

impostos da venda = P × alíquota de impostos
taxas da venda = P × alíquota de taxas
contribuição por porção = P − impostos da venda − taxas da venda − V
margem de contribuição = contribuição / P × 100
resultado estimado por porção = contribuição − F / N
resultado mensal estimado = contribuição × N − F
ponto de equilíbrio em porções = arredondar para cima(F / contribuição)
```

Impostos + taxas + margem desejada precisam somar menos de 100% para existir o preço sugerido. Com contribuição igual ou menor que zero, não há ponto de equilíbrio por aumento do volume nesse cenário. A margem de contribuição só tem percentual definido quando o preço é maior que zero.

**Margem e markup têm bases diferentes.** Acrescentar 25% sobre um custo de R$ 20 produz R$ 25 de preço e uma margem de 20% sobre a venda, sem taxas. Para uma margem de 25% sobre a receita, o mesmo custo exige `20 / 0,75 = R$ 26,67`. No caderno, a margem desejada incide sobre a receita depois de considerar os percentuais de impostos e taxas; a base de custo inclui o rateio dos fixos.

## Exemplo reproduzível do catálogo inicial

Com 450 g de batata crua, 150 g de frango cremoso, 40 g de muçarela e os ajustes iniciais acima, o motor calcula:

| Resultado | Estimativa |
| --- | ---: |
| Ingredientes, após ajuste de rendimento | R$ 9,6179 |
| Reserva adicional de 5% | R$ 0,4809 |
| Embalagem | R$ 1,9769 |
| Custo variável, incluindo R$ 0,80 de energia e R$ 2,00 de mão de obra | R$ 14,8757 |
| Fixos por porção: R$ 300 / 200 | R$ 1,5000 |
| Custo completo por porção | R$ 16,3757 |
| Preço sugerido para margem de 25%, com taxas/impostos em 0% | R$ 21,83 |
| Preço escolhido na simulação | R$ 25,00 |
| Impostos / taxas por porção no cenário de 0% | R$ 0,00 / R$ 0,00 |
| Contribuição por porção a R$ 25,00 | R$ 10,1243 |
| Margem de contribuição | 40,50% |
| Resultado estimado por porção após rateio dos fixos | R$ 8,6243 |
| Resultado mensal estimado para 200 porções | R$ 1.724,87 |
| Ponto de equilíbrio desse cenário | 30 porções |

Os cálculos usam valores completos; somar valores de apresentação já arredondados pode gerar pequenas diferenças. Esse resultado é uma projeção sob as hipóteses declaradas, não lucro realizado. Compras de pacotes inteiros, estoque, equipamentos, investimentos e capital de giro precisam de planejamento separado do custo consumido por porção.

A projeção mensal atual repete **uma composição** pelo volume informado. Não representa automaticamente um mês com sabores diferentes: carne de sol, vegetariana e frango podem ter contribuições distintas. Para planejar vendas mistas, estimar quantidade e contribuição de cada composição, somar suas contribuições e descontar os fixos do mês uma única vez. Os 150 g divididos entre três recheios em uma batata são uma composição de porção, e não uma previsão de distribuição das vendas.

## Antes de aprovar receita e preço

1. Comprar um lote de teste, pesar os insumos e registrar peso útil após preparar ou drenar.
2. Ajustar os cremes pela textura e pelo sabor; pesar a porção servida e repetir o custo.
3. Conferir batata grande, queijo culinário, milho drenado, cheddar, sal e cheiro-verde; substituir hipóteses pelas compras reais.
4. Testar a embalagem completa e atualizar seu custo com frete e acessórios necessários.
5. Informar mão de obra, consumo, fixos, taxas, impostos, entrega e volume realista sem duplicações.
6. Comparar o resultado por composição e combinar o cardápio e o preço entre os dois.

Para futuras atualizações, manter preços, pesos, rendimentos e receitas coerentes entre [budgetCatalog.js](../site/src/budgetCatalog.js), [PRECOS-REFERENCIA.md](PRECOS-REFERENCIA.md) e este documento. Alterações online no caderno são valores salvos daquele caderno; não modificam automaticamente estes arquivos de referência do projeto.
