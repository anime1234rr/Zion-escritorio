import { useEffect, useState } from 'react'

export type ThemeMode = 'sistema' | 'oscuro' | 'claro'
export type Density = 'compacta' | 'normal' | 'comoda'
export type Radius = 'cuadrado' | 'suave' | 'normal' | 'redondo'

export interface AppearanceSettings {
  theme: ThemeMode
  accent: string
  density: Density
  radius: Radius
}

export const ACCENTS: { nombre: string; valor: string }[] = [
  { nombre: 'Índigo', valor: '#6366f1' },
  { nombre: 'Violeta', valor: '#8b5cf6' },
  { nombre: 'Azul', valor: '#3b82f6' },
  { nombre: 'Cian', valor: '#06b6d4' },
  { nombre: 'Verde', valor: '#22c55e' },
  { nombre: 'Ámbar', valor: '#f59e0b' },
  { nombre: 'Rosa', valor: '#ec4899' },
  { nombre: 'Rojo', valor: '#ef4444' },
]

const DENSITY_SPACING: Record<Density, string> = {
  compacta: '0.225rem',
  normal: '0.25rem',
  comoda: '0.285rem',
}

const RADIUS_VALUE: Record<Radius, string> = {
  cuadrado: '0rem',
  suave: '0.375rem',
  normal: '0.625rem',
  redondo: '1rem',
}

const STORAGE_KEY = 'zion:appearance-settings'
const THEMES: ThemeMode[] = ['sistema', 'oscuro', 'claro']
const DENSITIES: Density[] = ['compacta', 'normal', 'comoda']
const RADII: Radius[] = ['cuadrado', 'suave', 'normal', 'redondo']

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: 'oscuro',
  accent: '#6366f1',
  density: 'normal',
  radius: 'normal',
}

function readStored(): AppearanceSettings {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_APPEARANCE
    const parsed = JSON.parse(raw) as Partial<AppearanceSettings>
    return {
      theme: parsed.theme && THEMES.includes(parsed.theme) ? parsed.theme : DEFAULT_APPEARANCE.theme,
      accent:
        typeof parsed.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.accent)
          ? parsed.accent
          : DEFAULT_APPEARANCE.accent,
      density:
        parsed.density && DENSITIES.includes(parsed.density)
          ? parsed.density
          : DEFAULT_APPEARANCE.density,
      radius: parsed.radius && RADII.includes(parsed.radius) ? parsed.radius : DEFAULT_APPEARANCE.radius,
    }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

function prefiereClaro(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
  )
}

function applyToDocument(current: AppearanceSettings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  const claro = current.theme === 'claro' || (current.theme === 'sistema' && prefiereClaro())
  root.classList.toggle('light', claro)

  root.style.setProperty('--primary', current.accent)
  root.style.setProperty('--ring', current.accent)
  root.style.setProperty('--sidebar-primary', current.accent)
  root.style.setProperty('--sidebar-ring', current.accent)
  root.style.setProperty('--chart-1', current.accent)

  root.style.setProperty('--spacing', DENSITY_SPACING[current.density])
  root.style.setProperty('--radius', RADIUS_VALUE[current.radius])
  root.dataset.density = current.density
}

let settings: AppearanceSettings = readStored()
applyToDocument(settings)

const listeners = new Set<(settings: AppearanceSettings) => void>()

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    return
  }
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (settings.theme === 'sistema') applyToDocument(settings)
  })
}

export function getAppearanceSettings(): AppearanceSettings {
  return settings
}

export function setAppearanceSetting<K extends keyof AppearanceSettings>(
  key: K,
  value: AppearanceSettings[K]
): void {
  settings = { ...settings, [key]: value }
  persist()
  applyToDocument(settings)
  for (const listener of listeners) listener(settings)
}

export function resetAppearance(): void {
  settings = { ...DEFAULT_APPEARANCE }
  persist()
  applyToDocument(settings)
  for (const listener of listeners) listener(settings)
}

export function useAppearanceSettings(): AppearanceSettings {
  const [snapshot, setSnapshot] = useState(settings)

  useEffect(() => {
    listeners.add(setSnapshot)
    return () => {
      listeners.delete(setSnapshot)
    }
  }, [])

  return snapshot
}
