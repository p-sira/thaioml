export const THEMES = [
  { id: 'leuko', name: 'Leuko' },
  { id: 'darkroom', name: 'Darkroom' },
  { id: 'progressnote', name: 'Progressnote' },
] as const

export type Theme = (typeof THEMES)[number]['id']

export function isTheme(value: unknown): value is Theme {
  return THEMES.some(({ id }) => id === value)
}
