import { useState } from 'react'

import { cn } from '@/lib/utils'

type Tab = 'terminos' | 'privacidad'

export function TerminosPrivacidadSection() {
  const [tab, setTab] = useState<Tab>('terminos')

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Términos y Privacidad</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Las condiciones de uso y la política de privacidad de Zion, para escritorio, móvil y la web.
        Última actualización: 1 de octubre de 2026.
      </p>

      <div className="mt-5 flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setTab('terminos')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
            tab === 'terminos'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Términos de servicio
        </button>
        <button
          type="button"
          onClick={() => setTab('privacidad')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
            tab === 'privacidad'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Privacidad
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
        {tab === 'terminos' ? <Terminos /> : <Privacidad />}
      </div>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </section>
  )
}

function Terminos() {
  return (
    <>
      <p>
        Estos términos rigen el uso de Zion — la app de escritorio, la app móvil y la web — para
        cualquier persona que cree una cuenta o use el servicio. Es el mismo acuerdo para las tres
        plataformas: es la misma cuenta y el mismo servicio.
      </p>

      <Seccion titulo="Tu cuenta">
        <p>
          Tu cuenta es personal e intransferible. Sos responsable de mantener la confidencialidad de tu
          contraseña y de toda actividad que ocurra bajo tu cuenta. Es la misma cuenta en escritorio,
          móvil y la web: lo que cambies en una se refleja en las otras.
        </p>
      </Seccion>

      <Seccion titulo="Uso aceptable y conducta">
        <p>Al usar Zion, te comprometés a no:</p>
        <ul className="ml-4 flex list-disc flex-col gap-1">
          <li>Publicar contenido ilegal o que infrinja los derechos de terceros.</li>
          <li>Acosar, amenazar o intimidar a otras personas usuarias.</li>
          <li>Suplantar la identidad de otra persona, servidor o del equipo de Zion.</li>
          <li>
            Automatizar acciones por fuera del sistema oficial de Apps y Webhooks — bots o clientes
            modificados que interactúen con el servicio sin usar esa vía no están permitidos.
          </li>
          <li>Intentar eludir la moderación, los baneos, o el motor de permisos y roles de un servidor.</li>
        </ul>
        <p>
          Los propietarios y administradores de cada servidor pueden establecer normas adicionales
          propias que también tenés que respetar mientras participás ahí.
        </p>
      </Seccion>

      <Seccion titulo="Contenido que generás">
        <p>
          Mantenés la titularidad de los mensajes, imágenes y demás contenido que subís. Al publicarlo,
          nos das el permiso técnico para almacenarlo, sincronizarlo entre tus dispositivos y mostrarlo
          según los permisos del servidor donde lo publicaste — nada más. Sos el único responsable del
          contenido que publicás.
        </p>
      </Seccion>

      <Seccion titulo="Propiedad intelectual">
        <p>
          Zion, su logotipo, su nombre y el diseño de sus apps y su web son propiedad de @anime1234rr. El
          código fuente, los binarios y los assets son de código propietario: no pueden copiarse,
          redistribuirse ni modificarse por fuera de las herramientas oficiales de la app. Los términos
          completos de la licencia están en el archivo LICENSE de cada repositorio del proyecto.
        </p>
      </Seccion>

      <Seccion titulo="Cambios al servicio y cierre de cuentas">
        <p>
          Zion está en desarrollo activo: podemos agregar, modificar o discontinuar funcionalidades en
          cualquier momento, incluso durante actualizaciones automáticas. Podemos suspender o cerrar tu
          cuenta si incumplís estos términos o representás un riesgo de seguridad para otras personas
          usuarias. Vos también podés cerrar tu cuenta cuando quieras desde Configuración de cuenta.
        </p>
      </Seccion>

      <Seccion titulo="Limitación de responsabilidad">
        <p>
          Zion se ofrece "tal cual" y "según disponibilidad", sin garantías de disponibilidad continua o
          libre de errores. Usás Zion bajo tu propio riesgo; en la medida permitida por la ley, no somos
          responsables por daños derivados del uso o la imposibilidad de uso del servicio.
        </p>
      </Seccion>

      <p className="text-xs text-muted-foreground">
        Esta es una versión resumida. La versión completa, con todas las cláusulas, está disponible en
        la sección de Términos de servicio de nuestra web.
      </p>
    </>
  )
}

function Privacidad() {
  return (
    <>
      <p>
        Esta política explica qué información maneja Zion en escritorio, móvil y la web, para qué la
        usamos y qué control tenés sobre ella. Es la misma cuenta y los mismos datos en las tres
        plataformas.
      </p>

      <Seccion titulo="Información que recopilamos">
        <ul className="ml-4 flex list-disc flex-col gap-1">
          <li>Credenciales de acceso: tu correo y tu contraseña (o solo tu correo, si usás link mágico).</li>
          <li>
            Datos de perfil: nombre de usuario, nombre visible, biografía, avatar, banner y tu estado de
            presencia — todo lo que configurás vos mismo.
          </li>
          <li>Contenido de uso: mensajes, servidores, roles y archivos, necesarios para sincronizarlos entre tus dispositivos.</li>
        </ul>
        <p>No pedimos datos que no necesitemos para que el servicio funcione.</p>
      </Seccion>

      <Seccion titulo="Cómo usamos tu información">
        <p>
          Exclusivamente para autenticarte, sincronizar tus comunidades entre dispositivos, mostrar tu
          perfil y presencia a quienes compartís un servidor, y mantener la seguridad del servicio. No
          usamos tu información para publicidad, no armamos perfiles para terceros y no la vendemos.
        </p>
      </Seccion>

      <Seccion titulo="Con quién la compartimos">
        <p>
          Tu perfil público es visible para quienes compartan un servidor con vos. Tus mensajes directos
          solo son visibles para quienes participan en ellos. No compartimos ni vendemos tu información a
          terceros con fines comerciales.
        </p>
      </Seccion>

      <Seccion titulo="Seguridad de los datos">
        <p>
          Toda la información viaja cifrada entre tus dispositivos y nuestros servidores. Tu contraseña
          nunca se guarda en texto plano. El acceso a tus datos está restringido por los permisos de cada
          servidor y de tu cuenta.
        </p>
      </Seccion>

      <Seccion titulo="Tus derechos">
        <p>
          Podés ver y editar tu perfil, cambiar tu correo o contraseña, y pedir la eliminación completa de
          tu cuenta y tus datos — todo desde Configuración de cuenta → Seguridad.
        </p>
      </Seccion>

      <p className="text-xs text-muted-foreground">
        Esta es una versión resumida. La versión completa, con todas las cláusulas, está disponible en
        la sección de Privacidad de nuestra web.
      </p>
    </>
  )
}
