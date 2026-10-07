# GearLabs — simulador e catálogo de equipamentos para silent gear e addons

| Campo | Valor |
|-------|-------|
| **Status** | 🟡 Parcial — arquitetura e requisitos validados via *grill-me*; implementação não iniciada |
| **Cobertura** | ~0 % (0 de 6 etapas) |
| **Esforço** | 7–10 dias-dev para o escopo completo; 3–4 d para o mínimo viável |
| **Depende de** | Nada (pode iniciar imediatamente) |

---

## 1. Estado atual — evidências

O repositório `gearlabs` encontra-se em estado inicial limpo, sem arquivos de código, configurações de *build* ou dependências instaladas. Não há estrutura prévia de frontend, banco de dados ou *pipeline* de extração de dados.

### Precedentes no código

Não existem precedentes internos no repositório. Uma busca no diretório raiz confirma a inexistência de arquivos de código ou documentação prévia:

```bash
ls -la /home/luis/gearlabs
# → 0 resultados
```

Como não há implementações legadas, toda a arquitetura será estabelecida do zero seguindo as convenções modernas do Next.js 14+ com TypeScript estrito [F3].

### Não-objetivos

- **Não haverá emulação de execução Java no navegador:** o site não interpretará código compilado de mods; ele consome apenas definições declarativas em JSON de *datapacks* [F1].
- **Não haverá backend com autenticação ou banco de dados relacional nesta versão:** as preferências e montagens são salvas localmente via *LocalStorage* e compartilhadas por *hash* de URL compactada [F4].
- **Não haverá renderizador 3D em tempo real (*WebGL* / *Three.js*):** a renderização de equipamentos será composta em 2D por camadas (*pixel-art* sobre *Canvas*), preservando a fidelidade estética do Minecraft e mantendo consumo mínimo de GPU [F6].
- **Não haverá edição manual in-game de arquivos:** o sistema é estritamente uma ferramenta web externa de planejamento e consulta.

### O que existe

Atualmente, o projeto possui apenas a inicialização do controle de versão Git no diretório raiz:

```bash
git status
# On branch main
# No commits yet
# nothing to commit
```

### O que não existe

Não há nenhuma implementação ou manifesto de pacote no repositório:

```bash
find . -maxdepth 2 -not -path '*/.*'
# → 0 resultados
```

```bash
grep -rn "silentgear" .
# → 0 resultados
```

---

## 2. As 8 decisões de design

### 2.1 Gestão e ingestão de dados de versões e modpacks

O Silent Gear opera com uma arquitetura orientada a dados (*data-driven*) baseada em *datapacks* JSON no caminho `data/<modid>/silentgear_materials/` [F1]. Entre versões do Minecraft (notadamente 1.16, 1.18, 1.19, 1.20 e a transição para *Codecs* no 1.21+), a estrutura de *stats* evoluiu para *properties* [F1]. Além disso, modpacks customizados frequentemente alteram valores de sinergia e criam ligas exclusivas via KubeJS ou *datapacks*.

| Opção | O que é | Custo | Base | Veredicto |
|---|---|---|---|---|
| Ingestão puramente manual | Cadastro formulário a formulário em CMS | 4 d | [modelado] | Rejeitada: insustentável para centenas de materiais |
| Parser exclusivo *client-side* | Usuário precisa sempre carregar pasta do modpack | 1,5 d | [F5] | Rejeitada: barreira alta de entrada para usuários casuais |
| Catálogo estático fechado | Apenas versões oficiais selecionadas pré-compiladas | 1 d | [F1] [F2] | Rejeitada: não atende modpacks customizados |
| Híbrido: presets oficiais + importador de *datapacks* | Catálogo oficial integrado somado a leitor de ZIP/JSON no navegador | 2 d | [F1] [F5] | **Recomendada** |

A abordagem híbrida oferece catálogo instantâneo das versões estáveis oficiais (1.16.5, 1.18.2, 1.19.2, 1.20.1 e 1.21.x) e de addons populares (*Silent's Gems*, *Nether's Delight*), permitindo que jogadores de modpacks específicos importem seu *datapack* compactado em `.zip` via `JSZip` [F5].

### 2.2 Motor de cálculo do simulador de equipamentos (*Gear Builder*)

No Silent Gear, uma arma ou armadura é montada a partir de peças modulares: parte principal (*main*), haste (*rod*), ponta (*tip*), revestimento (*coating*), empunhadura (*grip*) e forro (*lining*) [F1] [F2]. Os atributos finais dependem de:
1. Atributos base do material na categoria do equipamento (*durability*, *armor*, *damage*, etc.) [F2].
2. Coeficiente de sinergia (*synergy*) entre materiais incompatíveis ou harmônicos [F2].
3. Graduação de qualidade do material (*grade* de E até MAX) aplicando multiplicadores percentuais [F2].
4. Soma ponderada e resolução de níveis de *traits* (efeitos cumulativos como *Flexible*, *Brittle*, *Maiming*) [F2].

| Opção | O que é | Custo | Base | Veredicto |
|---|---|---|---|---|
| Calculadora estática de tabela | Apenas exibe stats brutos de cada material isolado | 0,5 d | [F2] | Rejeitada: não simula o item montado |
| Otimizador baseado em heurística | Algoritmo que escolhe sozinho as peças ideais | 3 d | [modelado] | Rejeitada: complexidade alta, tira a liberdade do jogador |
| Simulador interativo modular com matriz de sinergia | Montagem peça por peça com cálculo instantâneo e detalhamento de *traits* | 1,5 d | [F1] [F2] | **Recomendada** |

O simulador modular permite ao jogador selecionar o molde do equipamento (espada, picareta, machado, katana, capacete, peitoral, etc.), preencher os compartimentos (*slots*) de peças e visualizar imediatamente os valores resultantes com discriminação transparente das fórmulas [F2].

### 2.3 Filtro de inventário ("Materiais Disponíveis")

Jogadores no modo sobrevivência raramente possuem acesso a todos os materiais do jogo simultaneamente.

| Opção | O que é | Custo | Base | Veredicto |
|---|---|---|---|---|
| Sem filtro de restrição | Todos os materiais sempre aparecem em todos os seletores | 0 d | [modelado] | Rejeitada: gera frustração ao sugerir itens inatingíveis |
| Checklist de inventário do jogador | O usuário marca os materiais que possui e a ferramenta restringe as peças | 0,5 d | [modelado] | **Recomendada** |

Com o checklist de materiais disponíveis, o usuário pode marcar ou desmarcar itens individualmente ou em lote (ex.: "Apenas materiais do Overworld inicial", "Apenas metais básicos"), mantendo suas escolhas sincronizadas no armazenamento local do navegador.

### 2.4 Renderização visual de itens e composição de texturas

O Silent Gear utiliza um sistema dinâmico de renderização em camadas (*layering*): a textura da lâmina, da guarda e da empunhadura são sobrepostas e tingidas (*tinted*) com os códigos hexadecimais de cor declarados em cada material [F1] [F6].

| Opção | O que é | Custo | Base | Veredicto |
|---|---|---|---|---|
| Apenas ícones genéricos dos materiais | Sem visualização da arma combinada | 0,5 d | [modelado] | Rejeitada: experiência visual pobre |
| Visualizador 3D em Three.js | Carregamento de modelos *obj/gltf* em tempo real | 3,5 d | [modelado] | Rejeitada: pesado para celulares e desnecessário |
| Compositor 2D em Canvas com *color tinting* | Sobreposição de sprites PNG em *Canvas* com blend de cores e *pixel-art* | 1,5 d | [F6] | **Recomendada** |

O compositor em *Canvas* 2D utiliza o contexto nativo `CanvasRenderingContext2D` com `imageSmoothingEnabled = false` para preservar a estética de *pixels* nítidos típica do Minecraft [F6]. Cada camada da peça é desenhada aplicando a cor RGB/HEX do material por meio da operação `globalCompositeOperation = 'multiply'` ou máscara de matriz de pixels, gerando um sprite fidedigno do item montado [F6].

### 2.5 Persistência e compartilhamento sem cadastro

Usuários da comunidade de modpacks compartilham frequentemente suas combinações em servidores do Discord, fóruns e Reddit.

| Opção | O que é | Custo | Base | Veredicto |
|---|---|---|---|---|
| Autenticação completa e banco de dados | Criação de contas com e-mail/Discord e banco remoto | 3 d | [modelado] | Rejeitada: custo operacional, latência e atrito de uso |
| Armazenamento local puro sem compartilhamento | Salva apenas no navegador local da máquina atual | 0,5 d | [modelado] | Rejeitada: impede compartilhamento entre jogadores |
| *LocalStorage* + *hash* de URL compactada (*LZ-String*) | Estado da montagem serializado e codificado em base64 na URL | 0,5 d | [F4] | **Recomendada** |

Utilizando a biblioteca `lz-string`, o *payload* JSON de uma montagem completa (versão, molde, IDs das peças, materiais e graus) é compactado em uma sequência alfanumérica segura para URLs de cerca de 40 a 70 caracteres [F4]. O link gerado pode ser colado em qualquer canal e aberto instantaneamente por outro usuário.

### 2.6 Framework e renderização web

O site precisa aliar performance máxima para navegação estática com suporte a metatags ricas em redes sociais (*OpenGraph* dinâmico).

| Opção | O que é | Custo | Base | Veredicto |
|---|---|---|---|---|
| Vite + React puro (SPA) | Aplicação 100 % cliente | 1 d | [modelado] | Rejeitada: não gera preview dinâmico com imagem no Discord |
| Astro | Framework estático voltado a conteúdo | 1,5 d | [modelado] | Rejeitada: menor suporte nativo para manipulação de imagem de OG |
| Next.js 14+ (App Router) + Tailwind CSS | SSG para páginas e `@vercel/og` / `ImageResponse` para embeds sociais | 1,5 d | [F3] | **Recomendada** |

O Next.js com *App Router* permite compilar estaticamente o catálogo e a documentação, enquanto a rota dinâmica de metatags gera a imagem do card de pré-visualização no Discord mostrando o item montado e seus atributos centrais [F3].

### 2.7 Estratégia de internacionalização e nomenclaturas

Silent Gear e seus addons são desenvolvidos originalmente em inglês, e os nomes de *traits* e materiais em modpacks técnicos comumente mantêm termos em inglês.

| Opção | O que é | Custo | Base | Veredicto |
|---|---|---|---|---|
| Exclusivamente Português do Brasil | Tradução literal forçada de todos os nomes técnicos | 0,5 d | [modelado] | Rejeitada: desconecta de buscas de tutoriais globais |
| Exclusivamente Inglês | Sem suporte à comunidade brasileira | 0,5 d | [modelado] | Rejeitada: contraria a preferência de acessibilidade local |
| Bilíngue (PT-BR / EN) com termos técnicos preservados | Interface e descrições localizadas; identificadores oficiais mantidos | 1 d | [F2] | **Recomendada** |

O sistema contará com alternador de idioma no cabeçalho (*header*). Nomes de materiais e *traits* mantêm a referência técnica original com *tooltips* explicativos em português detalhando os efeitos práticos no jogo [F2].

### 2.8 O que não fazer

1. **Não carregar dados via requisições a APIs dinâmicas lentas:** todos os dados de versões padrão devem estar pré-compilados em arquivos JSON estáticos servidos pelo próprio pacote da aplicação ou CDN, garantindo resposta em tempo de execução sub-milissegundo.
2. **Não implementar validações rígidas de receitas Java no frontend:** a verificação foca na viabilidade dos materiais nos *slots* de equipamento, sem tentar replicar a árvore de receitas de bancada ou máquinas de forja que variam com KubeJS.
3. **Não poluir a URL com estruturas JSON legíveis não compactadas:** URLs longas quebram em determinados clientes de chat; a compactação via *LZ-String* é obrigatória para qualquer estado serializado [F4].

---

## 3. Plano de implementação

O plano é dividido em 6 etapas estruturadas de forma sequencial, minimizando retrabalho de tipos e interface:

1. **F0: Fundação do projeto e schema de tipos TypeScript (1–1,5 d)** — Inicialização do projeto Next.js com TypeScript e Tailwind CSS [F3]. Definição dos contratos de tipos para `Material`, `Part`, `GearType`, `Trait`, `StatModifier` e `VersionCatalog` baseados nas especificações do Silent Gear [F1] [F2].
2. **F1: Engine de cálculo e simulador de equipamentos (1,5–2 d)** — Módulo funcional puro para resolução de montagem de equipamentos: cálculo de atributos base, multiplicador de sinergia (*synergy*), bônus de graduação de qualidade (*grading*) e agregação de níveis de *traits* [F2]. Interface interativa de montagem slot a slot.
3. **F2: Compositor 2D de texturas e renderizador de camadas (1,5–2 d)** — Pipeline de sprites em *Canvas* 2D que extrai as camadas do equipamento, aplica o *color tint* proporcional ao material selecionado e renderiza o item com estilo *pixel-art* nítido [F6].
4. **F3: Catálogo de materiais e filtro de inventário do jogador (1 d)** — Página de listagem, busca e ordenação de materiais por atributos (durabilidade, dano, velocidade, armadura) com seletor de "Materiais Disponíveis" e persistência em *LocalStorage*.
5. **F4: Importador client-side de datapacks e compartilhamento por URL (1–1,5 d)** — Descompactador e leitor de *datapacks* `.zip` no navegador utilizando `JSZip` [F5], com validação de esquema de dados, e codificador/decodificador de links de montagem via `lz-string` [F4].
6. **F5: Página de changelog do site, i18n e OpenGraph dinâmico (1 d)** — Construção da página dedicada `/changelog` registrando as atualizações do GearLabs, configuração dos dicionários de internacionalização (PT-BR e EN) e geração de cards dinâmicos para Discord via `next/og` [F3].

**Mínimo viável** (apenas o literalmente solicitado): F0 + F1 + F3 ≈ 3,5–4,5 d.
**Escopo completo:** F0–F5 ≈ 7–10 d.

A ordem estabelecida é mandatória: a definição de schemas (F0) antes do motor de cálculo (F1) evita refatorações nos tipos de dados, e o motor de cálculo (F1) precede o compositor visual (F2) para permitir validação lógica imediata por testes unitários.

---

## 4. Armadilhas

| Armadilha | Mitigação |
|---|---|
| Mudança de schema de materiais do Silent Gear no Minecraft 1.21+ (*Codecs* substituindo *stats* por *properties*) [F1] | Implementar um adaptador de normalização na camada de ingestão que converte ambos os formatos para o modelo interno unificado de tipos |
| URLs de compartilhamento excessivamente longas ao salvar montagens complexas | Serializar apenas os identificadores numéricos ou chaves mínimas das peças (`partId`, `matId`, `grade`) antes da compressão via *LZ-String* [F4] |
| Texturas de *Canvas* 2D borradas em telas com alta densidade de pixels (Retina / 4K) | Ajustar o *Canvas* para a resolução real multiplicando pelo `window.devicePixelRatio` e forçar `image-rendering: pixelated` no CSS [F6] |
| Arquivos de modpack corrompidos ou malformados enviados pelo usuário | Envolver o parser do `JSZip` em validação com esquema Zod com tratamento amigável de erro e alertas de linha [F5] |
| Incompatibilidade de nomes de itens entre mods de diferentes idiomas | Manter IDs universais do jogo (ex.: `silentgear:iron_ingot`) como chave primária interna e expor rótulos amigáveis traduzíveis [F1] [F2] |

---

## 5. Verificação

**Automatizável no host (`npm test` / Vitest):**
- [ ] `calculateGearStats`: montar espada com lâmina de ferro e haste de madeira calcula exatamente a durabilidade com sinergia conforme fórmula oficial do Silent Gear [F2].
- [ ] `traitAccumulator`: acumular duas peças com *trait* `Maiming I` e `Maiming II` resulta em `Maiming III`, respeitando o teto máximo da habilidade [F2].
- [ ] `lzStringEncoder`: serializar uma montagem de armadura completa, gerar o link e deserializar no cliente restaura 100 % das opções selecionadas [F4].
- [ ] `datapackParser`: importar arquivo de teste com schema legado (1.20) e schema moderno (1.21) normaliza os materiais sem exceções de *runtime* [F1] [F5].
- [ ] `inventoryFilter`: desmarcar o material `Diamond` oculta-o da lista de seleção do simulador e recalcula as opções disponíveis de montagem.

**Verificação visual e de renderização manual (navegador):**
- [ ] O compositor *Canvas* 2D desenha o ícone do item montado com bordas nítidas sem anti-aliasing borrado em telas de 1x e 2x DPI [F6].
- [ ] O alternador de idioma alterna a interface entre Português e Inglês sem resetar a montagem em andamento.
- [ ] O link compartilhado gera um card de imagem com o resumo correto da arma quando inspecionado no depurador de metatags sociais do OpenGraph [F3].

---

## 6. Riscos

1. **Variações extremas de scripts KubeJS em modpacks de terceiros.** Modpacks com modificações muito agressivas podem injetar atributos via eventos de inicialização do Java que não ficam persistidos nos JSONs de *datapacks*; a ferramenta mitiga isso permitindo o uso do comando oficial de exportação `/sgear_mats dump` [F1].
2. **Direitos autorais de sprites de mods proprietários.** Extrair e redistribuir texturas de certos addons pode violar licenças de criadores de conteúdo; a mitigação consiste em empacotar apenas texturas de mods sob licenças abertas (MIT, CC-BY) e usar geradores procedurais de silhueta para mods fechados.
3. **Complexidade de manutenção entre versões ativas do Minecraft.** Manter catálogos de 1.16 até 1.21+ exige acompanhamento frequente de lançamentos do mod oficial; o isolamento modular das pastas de dados estáticos minimiza o risco de quebras regressivas no código da aplicação.

---

## 7. Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `package.json` | **novo** — configuração de dependências Next.js, React, Tailwind CSS, Vitest, LZ-String e JSZip |
| `tsconfig.json` | **novo** — configuração estrita do compilador TypeScript |
| `tailwind.config.ts` | **novo** — tokens de estilização, fontes pixeladas e paleta visual |
| `src/types/silentgear.ts` | **novo** — tipos de dados de materiais, peças, traits, stats e presets |
| `src/lib/calculator.ts` | **novo** — motor funcional puro de cálculo de stats e sinergia do Silent Gear |
| `src/lib/calculator.test.ts` | **novo** — testes unitários automatizados do motor de cálculo |
| `src/lib/canvas-renderer.ts` | **novo** — compositor de sprites e camadas de texturas com tingimento de cor |
| `src/lib/datapack-parser.ts` | **novo** — leitor e normalizador de arquivos de datapack via JSZip |
| `src/lib/url-state.ts` | **novo** — serializador e compactador de builds via LZ-String |
| `src/app/page.tsx` | **novo** — página principal do simulador de equipamentos e interface do builder |
| `src/app/materials/page.tsx` | **novo** — catálogo de materiais com filtros e matriz comparativa |
| `src/app/changelog/page.tsx` | **novo** — página de histórico de atualizações e versões do GearLabs |
| `src/app/api/og/route.tsx` | **novo** — gerador dinâmico de cartões OpenGraph para compartilhamento |
| `src/locales/pt-BR.json` | **novo** — dicionário de localização em português do Brasil |
| `src/locales/en.json` | **novo** — dicionário de localização em inglês |
| `docs/reports/README.md` | **novo** — índice e sumário de relatórios técnicos de engenharia |
| `docs/reports/GEARLABS-SILENT-GEAR-BUILDER.md` | **novo** — este relatório de análise técnica e arquitetura |

---

## 8. Fontes consultadas

| # | Fonte | Tipo | Versão | Consultada em | Sustenta |
|---|---|---|---|---|---|
| F1 | [SilentChaos512/Silent-Gear — Repositório GitHub](https://github.com/SilentChaos512/Silent-Gear) | Doc oficial | 3.6.x / 3.8.x | 2026-10-07 | Decisões 2.1, 2.2, 2.4, 2.7, 2.8, F0 e armadilhas |
| F2 | [Silent Gear Wiki — Materiais, Sinergia e Traits](https://github.com/SilentChaos512/Silent-Gear/wiki) | Doc oficial | 3.x | 2026-10-07 | Decisões 2.1, 2.2, 2.7, F0, F1 e testes |
| F3 | [Next.js Documentation — App Router & ImageResponse](https://nextjs.org/docs) | Doc oficial | 14.2.x | 2026-10-07 | Decisões 2.6, F0, F5 e validação de metatags |
| F4 | [pieroxy/lz-string — Compactação de URL para JavaScript](https://github.com/pieroxy/lz-string) | Projeto de terceiros | 1.5.0 | 2026-10-07 | Decisões 2.5, 2.8, F4 e verificação de URL |
| F5 | [Stuk/jszip — Manipulação de arquivos ZIP no cliente](https://stuk.github.io/jszip/) | Doc oficial | 3.10.1 | 2026-10-07 | Decisões 2.1, F4 e mitigação de modpacks |
| F6 | [MDN Web Docs — CanvasRenderingContext2D e pixel manipulation](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D) | Doc oficial | Web Standard | 2026-10-07 | Decisões 2.4, F2 e renderização gráfica |

---

> Nenhum item deste relatório foi executado em ambiente de produção. Toda a análise decorre da leitura das fontes oficiais e do estado inicial do repositório no branch `main` (commit inicial limpo); a validação empírica está listada na seção 5 como pendente.
