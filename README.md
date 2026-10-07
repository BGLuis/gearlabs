# GearLabs ⚙️

> Simulador interativo, catálogo de materiais e otimizador combinatório para o mod **Silent Gear** (Minecraft) e seus addons.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-Vitest-green)](https://vitest.dev/)

---

## 🌟 Funcionalidades

- **Simulador Interativo Modular:** Montagem slot-a-slot de armas (espada, katana), ferramentas (picareta, machado) e armaduras (capacete, peitoral, calça, botas).
- **Motor de Cálculo Oficial:** Resolução exata de atributos (Dano, Durabilidade, Velocidade, Armadura, Tenacidade, Mineração), cálculo de sinergia (*synergy*) e multiplicadores de graduação (*grades* E a MAX).
- **Otimizador Combinatório ("Best Build Finder"):** Algoritmo que avalia todas as combinações viáveis usando apenas os materiais disponíveis no seu inventário e sugere as Top 3 melhores builds para metas como Dano Máximo, Maior DPS, Durabilidade ou Proteção.
- **Renderizador 2D Pixel-Art:** Compositor em *Canvas* que desenha as armas e armaduras por camadas com tingimento de cores em tempo real no estilo autêntico do Minecraft.
- **Catálogo & Inventário Pessoal:** Tabela completa com filtros, busca e checklist de materiais possuídos salvo no navegador (*LocalStorage*).
- **Compartilhamento por URL:** Criação de *permalinks* compactados via *LZ-String* no hash da URL (`#...`), sem exigir criação de conta.
- **Pipeline de Extração Oficial:** Script que mapeia e extrai dados diretamente das branches oficiais (`1.16.x` a `1.21.x`) do repositório [`SilentChaos512/Silent-Gear`](https://github.com/SilentChaos512/Silent-Gear).
- **Suporte Bilíngue:** Interface completa em Português do Brasil (`PT-BR`) e Inglês (`EN`).

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ (testado no Node.js v26)
- npm ou pnpm

### Instalação
```bash
git clone git@github.com:BGLuis/gearlabs.git
cd gearlabs
npm install
```

### Desenvolvimento Local
```bash
npm run dev
# Acesse http://localhost:3000
```

### Testes Automatizados
```bash
npm test
```

### Build de Produção
```bash
npm run build
npm start
```

### Extração de Dados Oficiais
```bash
npm run extract-data
```

---

## 📚 Documentação e Relatórios Técnicos

- [Relatório de Arquitetura e Engenharia](docs/reports/GEARLABS-SILENT-GEAR-BUILDER.md)
- [Índice de Relatórios Técnicos](docs/reports/README.md)

---

## 📄 Licença

Distribuído sob licença MIT. Feito para a comunidade de Silent Gear & Minecraft modded.
