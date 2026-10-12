import { TraitCondition, TraitInfo } from '@/types/silentgear';

export interface TraitLang {
  en: Record<string, string>;
  pt: Record<string, string>;
}

type TextComponent = string | { translate?: string; text?: string } | undefined;

function resolveText(component: TextComponent, lang: Record<string, string>): string | undefined {
  if (typeof component === 'string') return lang[component] ?? component;
  if (component?.translate) return lang[component.translate];
  return component?.text;
}

/**
 * Converte silentgear_traits/*.json em TraitInfo. Textos vêm do lang do próprio jar
 * (pt_br quando existir, senão en_us); `fallback` cobre o que o jar não traduz.
 */
export function parseTraitJson(
  id: string,
  json: { name?: TextComponent; description?: TextComponent; max_level?: number; conditions?: TraitCondition[] },
  lang: TraitLang,
  fallback?: TraitInfo
): TraitInfo {
  const slug = id.replace(/^.*:/, '');
  const nameEn = resolveText(json.name, lang.en) ?? fallback?.name.en ?? slug;
  const descEn = resolveText(json.description, lang.en) ?? fallback?.description.en ?? '';
  return {
    id,
    maxLevel: typeof json.max_level === 'number' ? json.max_level : fallback?.maxLevel ?? 1,
    name: { en: nameEn, pt: resolveText(json.name, lang.pt) ?? fallback?.name.pt ?? nameEn },
    description: { en: descEn, pt: resolveText(json.description, lang.pt) ?? fallback?.description.pt ?? descEn },
    ...(json.conditions && json.conditions.length > 0 && { conditions: json.conditions }),
  };
}
