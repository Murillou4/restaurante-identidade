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

Os favoritos ficam no navegador de cada visitante, sem sincronização entre aparelhos. Não há envio de escolhas ou coleta de informações pessoais.

As imagens de referência pertencem aos respectivos donos; nenhuma é a logo deste projeto. Não foram geradas novas imagens para o site.
