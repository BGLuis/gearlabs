<p align="center">
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/header/graph.svg?title=GearLabs&subtitle=Simulador+interativo%2C+cat%C3%A1logo+de+materiais+e+otimizador+para+Silent+Gear&align=left&font=geist-mono&mode=dark" /><img alt="GearLabs" src="https://shieldcn.dev/header/graph.svg?title=GearLabs&subtitle=Simulador+interativo%2C+cat%C3%A1logo+de+materiais+e+otimizador+para+Silent+Gear&align=left&font=geist-mono&mode=light" /></picture>
</p>

<p align="center"><b>Português (BR)</b> · <a href="README.en.md">English</a></p>

<p align="center">
  <img alt="TypeScript" src="https://shieldcn.dev/badge/Language-TypeScript-3178C6.svg?logo=typescript&variant=branded&size=sm" />
  <img alt="Next.js" src="https://shieldcn.dev/badge/Framework-Next.js-000000.svg?logo=nextdotjs&variant=branded&size=sm" />
  <img alt="React" src="https://shieldcn.dev/badge/Stack-React-61DAFB.svg?logo=react&variant=branded&size=sm" />
  <img alt="Tailwind" src="https://shieldcn.dev/badge/CSS-Tailwind-06B6D4.svg?logo=tailwindcss&variant=branded&size=sm" />
  <img alt="Vitest" src="https://shieldcn.dev/badge/Tests-Vitest-6E9F18.svg?logo=vitest&variant=branded&size=sm" />
</p>

# 📖 Sobre

O **GearLabs** é um simulador interativo, catálogo de materiais e otimizador combinatório completo para o mod **Silent Gear** (Minecraft) e seus addons.

Principais funcionalidades:

- **Simulador Interativo Modular:** Montagem slot-a-slot de armas (espada, katana), ferramentas (picareta, machado) e armaduras (capacete, peitoral, calça, botas).
- **Motor de Cálculo Oficial:** Resolução exata de atributos (Dano, Durabilidade, Velocidade, Armadura, Tenacidade, Mineração), cálculo de sinergia (*synergy*) e multiplicadores de graduação (*grades* E a MAX).
- **Otimizador Combinatório ("Best Build Finder"):** Algoritmo que avalia todas as combinações viáveis usando apenas os materiais disponíveis no seu inventário e sugere as Top 3 melhores builds para metas como Dano Máximo, Maior DPS, Durabilidade ou Proteção.
- **Renderizador 2D Pixel-Art:** Compositor em *Canvas* que desenha as armas e armaduras por camadas com tingimento de cores em tempo real no estilo autêntico do Minecraft.
- **Catálogo & Inventário Pessoal:** Tabela completa com filtros, busca e checklist de materiais possuídos salvo no navegador (*LocalStorage*).
- **Compartilhamento por URL:** Criação de *permalinks* compactados via *LZ-String* no hash da URL (`#...`), sem exigir criação de conta.
- **Pipeline de Extração Oficial:** Script que mapeia e extrai dados diretamente das branches oficiais (`1.16.x` a `1.21.x`) do repositório [`SilentChaos512/Silent-Gear`](https://github.com/SilentChaos512/Silent-Gear).
- **Suporte Bilíngue:** Interface completa em Português do Brasil (`PT-BR`) e Inglês (`EN`).

# 📋 Motivo

Eu precisava de uma maneira de otimizar a criação de ligas para o Silent Gear a fim de verificar a melhor liga possível para combate — o que se mostrou inútil a partir do momento em que ambos se tornaram imunes a dano físico e hiper-resistentes a dano mágico.

# 💻 Como iniciar

### Requisitos

- [Node.js](https://nodejs.org/) 18+ (testado no Node.js v26)
- [npm](https://www.npmjs.com/)

### Instalação

1. Clone o repositório:

   ```sh
   git clone https://github.com/BGLuis/gearlabs.git
   ```

2. Entre no diretório do projeto:

   ```sh
   cd gearlabs
   ```

3. Instale as dependências e inicie o ambiente de desenvolvimento:

   ```sh
   npm install
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

### Outros comandos

- **Testes automatizados:** `npm test`
- **Build de produção:** `npm run build && npm start`
- **Extração de dados oficiais:** `npm run extract-data`

# 🤝 Contribuidores

<a href="https://github.com/BGLuis/gearlabs/graphs/contributors">
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/contributors/BGLuis/gearlabs.svg?title=false&preset=transparent&border=false&mode=dark" /><img alt="Contribuidores" src="https://shieldcn.dev/contributors/BGLuis/gearlabs.svg?title=false&preset=transparent&border=false&mode=light" /></picture>
</a>

# 📄 Licença

Distribuído sob a licença [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](LICENSE).

### Dependências de Terceiros e Mistura de Cores (Mixbox)

O algoritmo de renderização e mistura de pigmentos de ligas metálicas e compostas utiliza a biblioteca **Mixbox** (via pacote npm `mixbox`), reproduzindo com fidelidade física o comportamento do Silent Gear e SilentLib (`ColorUtils.blendMixbox`). O Mixbox é disponibilizado sob a licença **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** © Secret Weapons para uso não comercial. Por isso o GearLabs adota a mesma licença não comercial; quaisquer usos comerciais de trabalhos derivados requerem licenciamento comercial próprio junto à [Secret Weapons](https://scrtwpns.com/mixbox).
