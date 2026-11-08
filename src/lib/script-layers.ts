/**
 * Camadas de script do pack (#93): pastas de dados geradas por KubeJS/KubeGroovy na
 * instância. O id da camada é o nome da pasta raiz; dentro dela, as subpastas listadas
 * vêm em ordem de precedência crescente (a última vence no mesmo arquivo).
 */
export const SCRIPT_LAYERS = [
  { id: 'kubegroovy', name: 'KubeGroovy (ATM)', dataDirs: ['dynamic_data'] },
  { id: 'kubejs', name: 'KubeJS (ATM)', dataDirs: ['data', 'dynamic_data'] },
] as const;

export const SCRIPT_LAYER_IDS: readonly string[] = SCRIPT_LAYERS.map((layer) => layer.id);

export const isScriptLayer = (layerId: string | undefined): boolean =>
  layerId !== undefined && SCRIPT_LAYER_IDS.includes(layerId);
