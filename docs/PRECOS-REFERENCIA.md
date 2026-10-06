# Preços de referência — compras para o orçamento

**Pesquisa: 06/10/2026. Uso interno de mãe e filho.** Este documento registra os valores iniciais do [catálogo do simulador](../site/src/budgetCatalog.js). São referências de varejo para comparar custos; a compra final depende de preço, peso, disponibilidade, frete e condições da loja no momento do pedido.

As fontes são páginas públicas das lojas ou suas vitrines de venda. O catálogo Sousa e páginas da JK/Potência foram consultados no HTML público em 06/10/2026. Parte dos resultados de supermercado também veio de páginas indexadas, que podem guardar preços anteriores. Não houve fechamento de carrinho, pedido de compra ou cotação comercial com validade garantida.

## Como ler os valores

- **Referência:** há preço publicado para a apresentação indicada; confirmar antes de comprar.
- **Estimativa a confirmar:** hipótese para permitir a simulação, sem preço local verificado.
- **Indisponível:** preço visível, mas sem estoque anunciado. Não considerar uma compra disponível.
- **Preço normalizado:** preço do pacote dividido por seu conteúdo, convertido para R$/kg, R$/L ou R$/un. Não incorpora o rendimento do preparo nem a reserva adicional de perdas.

Os valores normalizados abaixo são exibidos com até quatro casas decimais. O simulador usa a divisão completa e arredonda apenas a apresentação em reais.

## Localidade das fontes

| Fonte pública | Evidência de Goiânia/GO | Limite da referência |
| --- | --- | --- |
| [Sousa — catálogo de compra](https://www.cardapio.datacaixa.com.br/loja=7655) | Avenida Mangalo, Morada do Sol, Goiânia | Catálogo único da loja; não há URL individual para cada produto nesta pesquisa |
| [Carrefour Jardim Goiás — Rappi](https://www.rappi.com.br/lojas/900129537-carrefour-hiper-express-express) | Vitrine de Goiânia; Av. Deputado Jamel Cecílio, 3900 | Canal de venda por aplicativo; preço pode variar por endereço, horário e promoção |
| [Hiper Moreira](https://www.moreira.com.br/) | Página informa St. Coimbra, Av. Perimetral, Goiânia–GO | Preços de internet; o site informa que o valor do carrinho e a disponibilidade da entrega prevalecem |
| [Nata Online](https://www.nataonline.com.br/) | Área de entrega declarada: Goiânia e Aparecida de Goiânia | Atendimento na cidade confirmado; endereço físico não confirmado nesta pesquisa |
| [Embalagens JK](https://www.embalagensjk.com.br/) | Av. Anhanguera nº 9247, Setor Campinas, Goiânia–GO | Frete, retirada e ajuste físico da embalagem ainda precisam ser conferidos |
| [Potência Embalagens — Quem somos](https://www.potenciaembalagens.com.br/quem-somos) | A loja declara sua origem em Goiânia | Confirmar prazo e variante do produto antes da compra |

O restaurante será um delivery em Senador Canedo/GO. Estas são referências de compra na região de Goiânia; a pesquisa não confirma entrega das lojas até o local de produção.

## Ingredientes do catálogo

| Insumo / apresentação | Conteúdo usado no cálculo | Preço | Preço normalizado | Fonte exata | Estado e limite |
| --- | ---: | ---: | ---: | --- | --- |
| Batata inglesa | 1 unidade de aproximadamente 160 g | R$ 1,15 | R$ 7,1875/kg | [Carrefour Jardim Goiás / Rappi](https://www.rappi.com.br/lojas/900129537-carrefour-hiper-express-express) | Referência aproximada de peso; uma batata grande de 450 g ainda precisa ser cotada |
| Peito de frango | 1 kg | R$ 13,99 | R$ 13,9900/kg | [Sousa](https://www.cardapio.datacaixa.com.br/loja=7655) | Descrição não confirma filé sem osso; conferir o corte comprado |
| Bacon | 1 kg | R$ 34,99 | R$ 34,9900/kg | [Sousa](https://www.cardapio.datacaixa.com.br/loja=7655) | Referência de compra antes de fritar |
| Calabresa grossa | 1 kg | R$ 29,99 | R$ 29,9900/kg | [Sousa](https://www.cardapio.datacaixa.com.br/loja=7655) | Referência de compra antes do preparo |
| Carne de sol, manta | 1 kg | R$ 55,99 | R$ 55,9900/kg | [Sousa](https://www.cardapio.datacaixa.com.br/loja=7655) | Conferir corte, dessalga e rendimento |
| Muçarela Piracanjuba fatiada | 500 g | R$ 24,99 | R$ 49,9800/kg | [Sousa](https://www.cardapio.datacaixa.com.br/loja=7655) | Referência do pacote fatiado; outras apresentações devem ter preço próprio |
| Requeijão cremoso Boua | 180 g | R$ 8,99 | R$ 49,9444/kg | [Sousa](https://www.cardapio.datacaixa.com.br/loja=7655) | Conferir resultado culinário da marca e apresentação |
| Cheddar cremoso | Base hipotética de 1 kg | R$ 40,00 | R$ 40,0000/kg | Sem cotação local confirmada | **Estimativa a confirmar**; não é preço pesquisado |
| Cebola nacional a granel | Base de 1 kg | R$ 4,97 | R$ 4,9700/kg | [Moreira](https://www.moreira.com.br/p/cebola-nacional-kg) | Peso variável; preço anunciado por kg |
| Alho a granel | Base de 1 kg | R$ 14,97 | R$ 14,9700/kg | [Moreira](https://www.moreira.com.br/p/alho-agranel-kg-a1) | Peso variável; preço anunciado por kg |
| Molho de tomate Goialli tradicional | 340 g | R$ 3,29 | R$ 9,6765/kg | [Moreira](https://www.moreira.com.br/p/molho-de-tomate-goialli-340g-tradicional) | Conferir receita e apresentação comprada |
| Óleo de soja Comigo | 900 ml | R$ 8,99 | R$ 9,9889/L | [Moreira](https://www.moreira.com.br/p/oleo-de-soja-comigo-900ml) | Medição em ml; não converter automaticamente para gramas |
| Sal | Base hipotética de 1 kg | R$ 4,00 | R$ 4,0000/kg | Sem cotação local confirmada | **Estimativa a confirmar** |
| Manteiga Piracanjuba sem sal | 500 g | R$ 31,19 | R$ 62,3800/kg | [Moreira](https://www.moreira.com.br/p/manteiga-de-primeira-qualidade-sem-sal-piracanjuba-pote-500g) | Manteiga, conforme a apresentação pesquisada |
| Creme de leite Italac | 200 g | R$ 3,89 | R$ 19,4500/kg | [Moreira](https://www.moreira.com.br/p/creme-de-leite-uht-leve-homogeneizado-italac-caixa-200g) | Usado o valor da página aberta; não a promoção anterior encontrada na busca |
| Ketchup Predilecta Zero | 380 g | R$ 14,90 | R$ 39,2105/kg | [Moreira](https://www.moreira.com.br/p/ketchup-predilecta-zero-squeeze-380g) | Referência provisória; cotar ketchup comum antes de aprovar a receita |
| Mostarda amarela Quero | 190 g | R$ 11,19 | R$ 58,8947/kg | [Moreira](https://www.moreira.com.br/p/mostarda-amarela-quero-squeeze-190g) | Referência da apresentação anunciada |
| Milho verde Fugini, sachê | 200 g anunciados | R$ 5,49 | R$ 27,4500/kg anunciado | [Nata Online](https://www.nataonline.com.br/) | Peso drenado não confirmado; rendimento de 85% é hipótese |
| Brócolis Aliança | 300 g | R$ 11,19 | R$ 37,3000/kg comprado | [Moreira](https://www.moreira.com.br/p/brocolis-ramoso) | Rendimento de 85% é hipótese; conferir aproveitamento |
| Champignon fatiado Aica | 200 g **drenados** | R$ 32,90 | R$ 164,5000/kg drenado | [Moreira](https://www.moreira.com.br/p/cogumelo-champignon-em-conserva-fatiado-aica-selecao-premium-vidro-200g) | **Indisponível**. O vidro anuncia 580 g líquidos e 200 g drenados; o cálculo usa 200 g |
| Batata palha Moinho Fino tradicional | 110 g | R$ 7,99 | R$ 72,6364/kg | [Moreira](https://www.moreira.com.br/p/batata-palha-moinho-fino-tradicional-110g) | Quantidade por porção é editável; padrão geral é 0 g |
| Cheiro-verde | Maço hipotético de 50 g | R$ 3,00 | R$ 60,0000/kg | Sem cotação local confirmada | **Estimativa a confirmar** de preço e peso; pesar o maço real |

## Rendimento adotado inicialmente

Estes percentuais pertencem ao orçamento e **não foram medidos nas lojas nem aprovados como receita**. O preço normalizado da tabela anterior é o preço comprado; o simulador aumenta a quantidade de compra necessária para obter o peso útil desejado.

| Insumo | Rendimento inicial | O que validar |
| --- | ---: | --- |
| Peito de frango | 60% | Tipo de corte, osso/pele e peso desfiado pronto |
| Bacon | 65% | Peso útil depois de fritar e retirar a gordura que não entra na receita |
| Calabresa | 90% | Peso pronto aproveitado |
| Carne de sol | 70% | Peso após dessalgar, limpar e preparar |
| Milho verde | 85% | Peso drenado real da apresentação comprada |
| Brócolis | 85% | Limpeza e preparo do lote |
| Demais ingredientes | 100% | Hipótese inicial sem ajuste; alterar se houver perda mensurável |

O champignon já usa peso drenado no pacote; não aplicar novamente a perda da salmoura. A batata é orçada por **450 g crus comprados** na base atual: esse valor não representa seu peso assado.

## Embalagens e acessórios

| Item | Apresentação pesquisada | Preço do pacote | R$/un | Quantidade por porção | Fonte exata / limite |
| --- | --- | ---: | ---: | ---: | --- |
| Bandeja de alumínio 4P com tampa | 1.100 ml; 21,5 × 17 × 4 cm; caixa de 100 un; tampa de papel aluminizado | R$ 99,99 | R$ 0,9999 | 1 | [JK](https://www.embalagensjk.com.br/produto/bandeja-de-aluminio-4p-m170-215x170x40-100x1). Testar fechamento com a batata recheada; altura de apenas 4 cm |
| Saco de papel delivery 25 kg | 31 × 37 × 18 cm; pacote de 100 un | R$ 80,50 | R$ 0,8050 | 1 | [JK](https://www.embalagensjk.com.br/produto/saco-papel-p-delivery-25kg). Testar o conjunto; não pressupor que o nome “25 kg” seja o peso da porção |
| Garfo descartável Linha Prática | Caixa de 1.000 un | R$ 60,00 | R$ 0,0600 | 1 | [Potência](https://www.potenciaembalagens.com.br/descartaveis/garfo-refeicao-linha-pratica-leve). Confirmar variante na compra |
| Guardanapo Florax | 30 × 30 cm; pacote de 50 un | R$ 2,80 | R$ 0,0560 | 2 | [JK](https://www.embalagensjk.com.br/produto/guardanapo-30x30-50x1) |

**Total inicial por porção: R$ 1,9769** = 0,9999 + 0,8050 + 0,0600 + (2 × 0,0560). Frete, adesivo, personalização e perdas de embalagem não estão incluídos. O orçamento permite editar preços, conteúdos dos pacotes, quantidades por pedido e um custo adicional de embalagem, que começa em R$ 0,00.

Não foi adotado o [kit plástico 750 ml da Potência](https://www.potenciaembalagens.com.br/potes-plasticos/kit-pote-plastico-750-ml-com-sobretampa-e-selo-de-aluminio-798-unidades): o título anuncia 1.000 unidades, mas a descrição lista 540 potes, 540 sobretampas e 1.000 selos. Não usar o preço dividido por 1.000 como custo de um pote. Uma opção de PP com tampa continua a cotar se a bandeja de alumínio não passar no teste.

## Próxima atualização de compras

1. Conferir as apresentações e a disponibilidade; registrar a data da compra e sua fonte pública ou comprovante interno.
2. Trocar preço e conteúdo do pacote juntos, principalmente para queijo culinário, milho drenado e batatas grandes.
3. Medir o peso comprado e o peso útil do lote; atualizar o rendimento separadamente.
4. Conferir frete, embalagem e demais custos que ficaram fora da pesquisa.
5. Salvar os valores no caderno compartilhado e repetir a simulação antes de definir preço de venda.

Na manutenção do projeto, revisar este documento junto de [budgetCatalog.js](../site/src/budgetCatalog.js) e [ORCAMENTO.md](ORCAMENTO.md). Os preços editados e salvos no caderno online podem ser diferentes deste registro inicial.
