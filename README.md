# Agenda Escolar - Contatos Telefonicos

Site estatico com HTML, CSS e JavaScript puro.

## Arquivos

- `index.html`: estrutura da pagina.
- `styles.css`: visual do site, com azul inspirado na Secretaria Escolar Digital.
- `script.js`: cadastro, edicao, exclusao, WhatsApp, CSV e planilha Excel de frequencia.

## Como abrir no VS Code

1. Abra esta pasta no VS Code.
2. Abra o arquivo `index.html` no navegador.
3. Para testar como servidor local, instale a extensao Live Server e clique em "Go Live".

## Planilha de frequencia

No painel lateral, escolha a sala, o mes e o ano. Clique em `Baixar planilha Excel (.xlsx)`.
A planilha vem com os alunos da sala e os dias uteis do mes. Em cada quadradinho, marque:

- `P` para presente
- `A` para ausente
- `F` para feriado

## Como publicar no GitHub Pages

1. Crie um repositorio no GitHub.
2. Envie estes tres arquivos para a raiz do repositorio: `index.html`, `styles.css` e `script.js`.
3. No GitHub, entre em Settings > Pages.
4. Em Branch, selecione `main` e a pasta `/root`.
5. Salve. O GitHub vai gerar um link publico do site.