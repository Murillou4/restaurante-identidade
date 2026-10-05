# Nossa batataria

Caderno visual para conversar sobre o nome e a identidade de um delivery de batata recheada em Senador Canedo, Goiás.

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

Os favoritos são salvos online, em um caderno identificado pelo parâmetro `caderno` no link. O site mostra as escolhas do filho e da mãe separadamente e atualiza a cada 10 segundos, ao voltar para a aba e após salvar. Só a preferência de identidade (Eu ou Mãe) fica no navegador.

Abra [o site](https://murillou4.github.io/restaurante-identidade/), escolha quem está marcando e use **Copiar link para minha mãe**. É preciso compartilhar o link completo do caderno: abrir apenas a página inicial em outro aparelho cria outro caderno. Quem tem o link pode ler e alterar as escolhas, sem conta ou senha.

`site/src/useSharedChoices.js` conecta o GitHub Pages à API hospedada em Sites, com persistência SQLite (D1). As gravações usam valores explícitos e o site só confirma um favorito depois da resposta do servidor. Falhas oferecem uma tentativa de repetição e não substituem as últimas escolhas confirmadas.

O código do backend é mantido no projeto de hospedagem separado `shared-backend/`, ignorado neste repositório. Ele aceita quatro nomes, dez referências e as identidades `eu`/`mae`; cada caderno usa um UUID aleatório no link. Não são solicitados nome pessoal, e-mail, telefone ou endereço.

As imagens de referência pertencem aos respectivos donos; nenhuma é a logo deste projeto. Não foram geradas novas imagens para o site.
