# iFood — taxas para comparar no orçamento

**Pesquisa e conferência: 06/10/2026. Uso interno de mãe e filho.** As referências abaixo vieram de fontes oficiais públicas do iFood, conferidas no HTML disponível nessa data. Nenhum cadastro foi enviado e nenhuma contratação foi feita. Os números permitem comparar cenários; os valores e as bases do contrato da loja precisam ser conferidos antes de definir o preço de venda.

## Referência inicial dos planos

| Plano | Entrega | Comissão | Pagamento via iFood | Total percentual com 100% dos pedidos pagos via iFood | Mensalidade de referência |
| --- | --- | ---: | ---: | ---: | ---: |
| Básico | Feita pela própria loja | 12% | 3,2% | 15,2% | R$ 110/mês |
| Entrega | Feita por entregadores parceiros do iFood | 23% | 3,2% | 26,2% | R$ 150/mês |

Os totais de 15,2% e 26,2% são a soma das duas taxas para a hipótese de mesma base e pagamento integral via iFood. A mensalidade e eventuais serviços adicionais não estão incluídos nesses percentuais. O custo da entrega própria também precisa entrar no orçamento do Plano Básico.

A [página de cadastro oficial](https://parceiros.ifood.com.br/restaurante) mostra os valores da tabela, mensalidade somente para faturamento **acima de R$ 1.800/mês** e **primeiro mês grátis**. O [artigo de planos, atualizado em 09/09/2026](https://blog-parceiros.ifood.com.br/planos-ifood/), confirma a isenção até R$ 1.800 e a gratuidade do primeiro mês para novos cadastros. Não considerar a mensalidade como cobrança por pedido nem presumir dois meses grátis a partir de páginas antigas.

O [artigo de taxas, atualizado em 15/09/2026](https://blog-parceiros.ifood.com.br/taxas-ifood/), confirma 3,2% nos dois planos e informa que as condições podem variar conforme a categoria, região e modelo. O [artigo de cadastro, também atualizado em 15/09/2026](https://blog-parceiros.ifood.com.br/ifood-cadastro/), apresenta os mesmos valores.

## Por que usamos 3,2% e registramos 3,5%

A [página explicativa de entregas](https://parceiros.ifood.com.br/restaurante/como-funciona/entregas) ainda apresenta **3,5%** para pagamentos via iFood nos dois planos. Ela não informa uma data pública de atualização. Seu conteúdo diverge da página atual de cadastro e dos artigos oficiais de setembro de 2026.

**Decisão de referência para a simulação:** adotar inicialmente 3,2%, pela concordância entre a oferta de cadastro e os artigos recentes. Essa escolha é uma interpretação das fontes, não a confirmação de uma condição contratada. Manter a taxa editável. Para testar a divergência, 3,5% levaria a 15,5% no Básico e 26,5% no Entrega, antes de mensalidade e extras.

Resultados de busca consultados em 06/10 mostraram versões antigas de alguns artigos, inclusive com outras datas e carências. As datas e os valores deste documento correspondem às páginas e seus metadados lidos ao vivo, não apenas aos resumos do buscador.

## Base de cálculo: o frete próprio ainda precisa ser confirmado

As páginas públicas atuais pesquisadas usam expressões como valor do pedido e faturamento mensal. **Não foi possível confirmar, por uma regra pública explícita, se a comissão do Plano Básico e o limiar de R$ 1.800 incluem a taxa de entrega cobrada pela própria loja ao cliente.** Também não foi confirmada a decomposição exata da base do pagamento online em todos os métodos.

O [artigo oficial do relatório de conciliação, atualizado em 26/05/2026](https://blog-parceiros.ifood.com.br/relatorio-de-conciliacao/), informa que o campo `BASE_CALCULO` mostra a base efetivamente usada nas taxas e comissões. Ao explicar o valor de vendas da loja, distingue valores pertencentes ao iFood, como sua taxa de entrega, taxa de serviço e conveniência de parcelamento. Isso ajuda a conferir um extrato, mas não determina por si só a regra do frete cobrado pela própria loja no Básico nem a composição do limiar da mensalidade.

**Hipótese explícita do nosso modelo:** calcular os percentuais sobre o preço da batata; estimar o faturamento mensal do canal como preço × porções vendidas naquele canal. O frete pago pelo cliente fica fora dessa base simplificada. Essa hipótese precisa ser conferida no contrato, na oferta do Portal do Parceiro e no `BASE_CALCULO` dos lançamentos reais. Se o frete próprio fizer parte da base contratual, a simulação precisa ser ajustada antes de representar o repasse.

O volume usado no cenário iFood deve representar apenas as porções vendidas pelo iFood, não todas as vendas do negócio em WhatsApp e outros canais. Um pedido com bebidas, adicionais, várias batatas, cupons ou frete precisa de uma composição própria; a simulação de uma batata não reproduz automaticamente o valor total de um pedido.

## Serviços e promoções opcionais

Os campos de antecipação, promoções e subsídio de entrega começam em **R$ 0 ou 0%**, sem adesão presumida. São editáveis conforme o serviço efetivamente escolhido. Zero informado nesses extras não significa que todos os serviços do iFood sejam gratuitos.

| Extra | Fonte oficial conferida | Como usar no orçamento |
| --- | --- | --- |
| Antecipação pontual ou repasse semanal | [iFood Pago — artigo atualizado em 17/07/2026](https://blog-parceiros.ifood.com.br/antecipacao-pontual-do-ifood-pago/) | Há cobrança por antecipar. A página atual manda consultar as condições e taxas no app; não publica uma taxa universal. Preencher somente após conhecer a oferta |
| Campanha Inteligente, cupons e descontos | [Campanha Inteligente — atualização de 07/07/2025](https://blog-parceiros.ifood.com.br/campanha-inteligente/) | Custo opcional conforme participação e pedidos alcançados. A loja pode controlar orçamento e sair; usar o custo assumido pela loja, sem presumir que todo pedido tenha promoção |
| Subsídio de entrega grátis | [Entrega Flex — atualização de 07/07/2025](https://blog-parceiros.ifood.com.br/plano-entrega-flex/) | Nas promoções da área parceira, a loja pode assumir a taxa que seria paga pelo cliente. Informar esse gasto conforme a regra escolhida, separado da comissão |

A página de Campanha Inteligente descreve até **R$ 5 por pedido** nas demais campanhas e até **R$ 9,99 por pedido** em entrega grátis, com orçamento mínimo disponibilizado de **R$ 100/dia**. São condições daquela ferramenta, não taxas obrigatórias dos planos. O gasto depende dos pedidos convertidos; a página também admite acúmulo de subsídio de entrega com outra promoção em determinados pedidos. Não lançar esses tetos automaticamente como custo fixo de toda batata.

O [artigo de repasse semanal](https://blog-parceiros.ifood.com.br/repasse-semanal/), atualizado em 07/07/2025, mantém percentuais vinculados ao cenário de 2022. Não foram adotados como padrão atual: a referência de julho de 2026 orienta verificar a condição individual no aplicativo.

A taxa de serviço cobrada do consumidor pertence ao iFood, conforme o [artigo de taxas](https://blog-parceiros.ifood.com.br/taxas-ifood/). Não foi adicionada como mais uma porcentagem de custo do restaurante. Eventuais cobranças, recolhimentos ou reembolsos devem ser conciliados com o extrato da loja.

## Disponibilidade em Senador Canedo

O [artigo oficial do Hits iFood, atualizado em 11/06/2026](https://blog-parceiros.ifood.com.br/ifood-hits/), inclui Senador Canedo–GO entre as cidades atendidas pela promoção. Isso indica presença da plataforma na cidade, mas **não confirma cobertura ou elegibilidade do Plano Entrega no endereço de produção**.

A [página oficial de entregas](https://parceiros.ifood.com.br/restaurante/como-funciona/entregas) pede a conferência do endereço específico antes da contratação. No planejamento, a disponibilidade de entregadores parceiros para este estabelecimento permanece **a confirmar**.

## Registro das fontes e datas

Todas as páginas desta tabela responderam na consulta pública de **06/10/2026**. Data de consulta não é data de atualização editorial.

| Fonte | Publicação / última atualização editorial observada | Uso na pesquisa |
| --- | --- | --- |
| [Cadastro para restaurantes](https://parceiros.ifood.com.br/restaurante) | Data não publicada | Oferta atual de 12%/23%, 3,2%, mensalidades, limiar e primeiro mês grátis |
| [Planos iFood](https://blog-parceiros.ifood.com.br/planos-ifood/) | 09/09/2026 / 09/09/2026 | Confirmação dos planos e isenções |
| [Taxas iFood](https://blog-parceiros.ifood.com.br/taxas-ifood/) | 13/02/2026 / 15/09/2026 | Confirmação das taxas e limites comerciais |
| [Cadastro iFood](https://blog-parceiros.ifood.com.br/ifood-cadastro/) | 12/02/2026 / 15/09/2026 | Confirmação de 3,2% e primeiro mês grátis |
| [Como funcionam as entregas](https://parceiros.ifood.com.br/restaurante/como-funciona/entregas) | Data não publicada | Registro da divergência de 3,5% e conferência de cobertura por endereço |
| [Relatório de conciliação](https://blog-parceiros.ifood.com.br/relatorio-de-conciliacao/) | 01/04/2026 / 26/05/2026 | Campo da base efetiva de cálculo e separação de valores do iFood |
| [iFood Pago](https://blog-parceiros.ifood.com.br/antecipacao-pontual-do-ifood-pago/) | 30/06/2026 / 17/07/2026 | Antecipação com condições consultadas no app; a URL antiga permanece com artigo atualizado |
| [Repasse semanal](https://blog-parceiros.ifood.com.br/repasse-semanal/) | 17/10/2022 / 07/07/2025 | Contexto histórico; percentuais não adotados como padrão atual |
| [Campanha Inteligente](https://blog-parceiros.ifood.com.br/campanha-inteligente/) | 02/07/2024 / 07/07/2025 | Promoções opcionais e subsídios |
| [Entrega Flex](https://blog-parceiros.ifood.com.br/plano-entrega-flex/) | 05/04/2024 / 07/07/2025 | Entrega grátis custeada pela loja na área parceira |
| [Hits iFood](https://blog-parceiros.ifood.com.br/ifood-hits/) | 28/02/2026 / 11/06/2026 | Presença em Senador Canedo sem garantia de cobertura do endereço |

## Manutenção no caderno

Os valores usados no orçamento são editáveis e salvos online no caderno compartilhado depois da confirmação do servidor. Compartilhar o mesmo link para comparar o mesmo cenário entre mãe e filho. Salvar valores de uma simulação não contrata plano, antecipação ou campanha e não aprova automaticamente o preço de venda.

Na próxima revisão, conferir o contrato e a oferta da loja, as bases das taxas, o faturamento do canal, a regra da mensalidade e a cobertura do endereço. Atualizar a data deste registro e suas fontes. Os ajustes salvos online pertencem ao caderno; não alteram automaticamente este documento de referência.

O método geral de custos, margem e resultado está em [ORCAMENTO.md](ORCAMENTO.md). Os preços dos ingredientes e embalagens estão em [PRECOS-REFERENCIA.md](PRECOS-REFERENCIA.md).
