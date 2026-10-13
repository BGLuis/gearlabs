<p align="center">
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/header/graph.svg?title=GearLabs&subtitle=Interactive+simulator%2C+material+catalog%2C+and+build+optimizer+for+Silent+Gear&align=left&font=geist-mono&mode=dark" /><img alt="GearLabs" src="https://shieldcn.dev/header/graph.svg?title=GearLabs&subtitle=Interactive+simulator%2C+material+catalog%2C+and+build+optimizer+for+Silent+Gear&align=left&font=geist-mono&mode=light" /></picture>
</p>

<p align="center"><b>English</b> · <a href="README.md">Português (BR)</a></p>

<p align="center">
  <img alt="TypeScript" src="https://shieldcn.dev/badge/Language-TypeScript-3178C6.svg?logo=typescript&variant=branded&size=sm" />
  <img alt="Next.js" src="https://shieldcn.dev/badge/Framework-Next.js-000000.svg?logo=nextdotjs&variant=branded&size=sm" />
  <img alt="React" src="https://shieldcn.dev/badge/Stack-React-61DAFB.svg?logo=react&variant=branded&size=sm" />
  <img alt="Tailwind" src="https://shieldcn.dev/badge/CSS-Tailwind-06B6D4.svg?logo=tailwindcss&variant=branded&size=sm" />
  <img alt="Vitest" src="https://shieldcn.dev/badge/Tests-Vitest-6E9F18.svg?logo=vitest&variant=branded&size=sm" />
</p>

# 📖 About

**GearLabs** is a comprehensive interactive simulator, material catalog, and combinatorial build optimizer for the **Silent Gear** Minecraft mod and its addons.

Key features:

- **Modular Interactive Simulator:** Slot-by-slot construction of weapons (sword, katana), tools (pickaxe, axe), and armor (helmet, chestplate, leggings, boots).
- **Official Calculation Engine:** Accurate stat resolution (Damage, Durability, Speed, Armor, Toughness, Harvest Level), synergy calculation, and grade multipliers (grades E through MAX).
- **Combinatorial Optimizer ("Best Build Finder"):** Algorithm evaluating all viable combinations from materials in your inventory and suggesting the Top 3 builds for goals like Max Damage, Highest DPS, Durability, or Protection.
- **2D Pixel-Art Renderer:** Canvas compositor rendering layered weapons and armor with real-time color tinting in authentic Minecraft style.
- **Catalog & Personal Inventory:** Comprehensive table with filters, search, and owned-materials checklist saved in browser LocalStorage.
- **URL Sharing:** Compressed permalink generation via LZ-String in URL hash (`#...`), requiring no account creation.
- **Official Extraction Pipeline:** Script that maps and extracts data directly from official repository branches (`1.16.x` to `1.21.x`) of [`SilentChaos512/Silent-Gear`](https://github.com/SilentChaos512/Silent-Gear).
- **Bilingual Support:** Complete interface in Brazilian Portuguese (`PT-BR`) and English (`EN`).

# 📋 Motivation

I needed a way to optimize alloy crafting for Silent Gear to find the best possible alloy for combat — which proved futile once both sides became immune to physical damage and hyper-resistant to magic damage.

# 💻 Getting Started

### Requirements

- [Node.js](https://nodejs.org/) 18+ (tested on Node.js v26)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/BGLuis/gearlabs.git
   ```

2. Enter the project directory:

   ```sh
   cd gearlabs
   ```

3. Install dependencies and start the development server:

   ```sh
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other Commands

- **Automated tests:** `npm test`
- **Production build:** `npm run build && npm start`
- **Extract official data:** `npm run extract-data`

# 🤝 Contributors

<a href="https://github.com/BGLuis/gearlabs/graphs/contributors">
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/contributors/BGLuis/gearlabs.svg?title=false&preset=transparent&border=false&mode=dark" /><img alt="Contributors" src="https://shieldcn.dev/contributors/BGLuis/gearlabs.svg?title=false&preset=transparent&border=false&mode=light" /></picture>
</a>

# 📄 License

Distributed under the [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](LICENSE) license.

### Third-Party Dependencies and Pigment Blending (Mixbox)

The rendering and pigment blending algorithm for metal and compound alloys uses the **Mixbox** library (via npm package `mixbox`), physically reproducing the behavior of Silent Gear and SilentLib (`ColorUtils.blendMixbox`). Mixbox is released under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** © Secret Weapons license for non-commercial use. Therefore, GearLabs adopts the same non-commercial license; any commercial use of derivative works requires separate commercial licensing with [Secret Weapons](https://scrtwpns.com/mixbox).
