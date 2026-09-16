import type { EstadoCuenta, TipoRolStaff, TipoSancion } from '@/lib/moderation'

export const ETIQUETA_TIPO_SANCION: Record<TipoSancion, string> = {
  advertencia: 'Advertencia',
  ban_temporal: 'Suspensión temporal',
  ban_permanente: 'Suspensión permanente',
}

export const ETIQUETA_ROL_STAFF: Record<TipoRolStaff, string> = {
  core_dev: 'Desarrollador Core',
  frontend_dev: 'Desarrollador UI/UX',
  moderador: 'Moderador',
}

export const ESTADO_CUENTA_CONFIG: Record<EstadoCuenta, { label: string; className: string }> = {
  activo: { label: 'Activo', className: 'bg-online/10 text-online' },
  advertido: { label: 'Advertido', className: 'bg-idle/10 text-idle' },
  ban_temporal: { label: 'Ban temporal', className: 'bg-destructive/10 text-destructive' },
  ban_permanente: { label: 'Suspendido', className: 'bg-destructive/15 text-destructive' },
}
