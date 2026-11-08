# Spike #106: ordem de camadas entre jars

Experimento para saber qual regra o NeoForge 26.1.2 e o Silent Gear 4.2.3 usam quando dois mods definem o mesmo id em `silentgear_materials`: id do mod, nome do arquivo ou `ordering` das dependências. Os jars de teste são gerados, nunca versionados.

## Gerar os jars

```sh
npx tsx scripts/order-probe/generate.ts /tmp/probe-out
```

Cria `/tmp/probe-out/run1` … `run6`, cada uma com `mods/` (os dois jars-sonda) e, na `run6`, também `kubegroovy/`. Cada jar tem só `META-INF/neoforge.mods.toml` (`modLoader="lowcodefml"`) e `data/silentgear/silentgear_materials/order_probe.json`. O ingrediente é `minecraft:stick`, então não há dependência de outros mods.

| Rodada | Mods | O que muda |
|---|---|---|
| 1 | `aaa_probe` em `aaa-probe-1.0.0.jar`, `zzz_probe` em `zzz-probe-1.0.0.jar` | Sem dependência; nome de arquivo na ordem do id do mod |
| 2 | `aaa_probe` em `zzz-probe-1.0.0.jar`, `zzz_probe` em `aaa-probe-1.0.0.jar` | Nome de arquivo na ordem inversa |
| 3 | como a 1 | `zzz_probe` depende de `aaa_probe` com `ordering="AFTER"` |
| 4 | como a 1 | `zzz_probe` depende de `aaa_probe` com `ordering="BEFORE"` |
| 5 | como a 1 | `zzz_probe` declara `silentgear` com `ordering="AFTER"` (como o `sgearmetalworks`) |
| 6 | como a 1 | Mais `order_probe` em `kubegroovy/dynamic_data/` |

O nome do material (coluna `Name` do dump) é `Probe AAA`, `Probe ZZZ` ou `Probe KubeGroovy`, e cada sonda tem um trait distinto, para a linha do TSV dizer quem venceu.

## Instância mínima (nunca a instância real)

1. No Prism, crie uma instância nova com Minecraft 26.1.2 e NeoForge 26.1.2.126 (`ATM 11` não é copiada nem alterada).
2. Em `mods/` da instância nova coloque só `silent-lib-26.1.2-neoforge-11.2.0.jar` e `silent-gear-26.1.2-neoforge-4.2.3.jar` (sha1 `f0e1d83ebb243990ffa3ceac22f807b016364fdf`, o publicado). Na rodada 6 acrescente `kubegroovy-neoforge-1.0.1+26.1.2-neoforge.jar`.
3. Para cada rodada, esvazie as sondas de `mods/`, copie os jars de `runN/mods/` e, na rodada 6, a pasta `runN/kubegroovy/` para a raiz da instância (`minecraft/kubegroovy/`).
4. Abra um mundo de criativo, rode `/sgear_mats dump` e copie `output/silentgear/material_export.tsv` para `tests/fixtures/material_export.probe-106-runN.tsv`.
5. Antes das seis rodadas, rode só a 1 e confira em `logs/latest.log` que os dois mods `*_probe` carregaram. Se o loader for rejeitado, troque `MOD_LOADER` em `generate.ts` por `javafml` e gere de novo.
6. A linha que interessa é a de ID `silentgear:order_probe`; a coluna `Pack` diz de qual pacote o jogo tirou o material.
