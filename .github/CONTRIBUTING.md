# Contribuindo com o GearLabs

Obrigado pelo interesse em contribuir! Este guia explica como propor mudanças.

## Reportando bugs e sugerindo melhorias

- Procure nas [issues](https://github.com/BGLuis/gearlabs/issues) se o assunto já foi aberto.
- Se não foi, abra uma issue descrevendo o problema ou sugestão com o máximo de detalhes possível.

## Preparando o ambiente

Siga a seção "Como iniciar" do [README](../README.md) para instalar e rodar o projeto.

## Fluxo de contribuição

1. Faça um fork do repositório e crie uma branch a partir de `main`.
2. Faça as mudanças em commits pequenos e com mensagens claras.
3. Rode as verificações abaixo antes de abrir o Pull Request.
4. Abra o Pull Request para `main` descrevendo o que foi alterado.

## Padrão de commits

Este projeto usa [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

## Verificações

```sh
npm run typecheck
npm test
```
