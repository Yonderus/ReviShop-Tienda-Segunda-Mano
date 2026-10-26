import { IconName } from '../../shared/ui/icon.component';

export interface AdminNavLink {
  label: string;
  icon: IconName;
  path: string;
  exact?: boolean;
}

/** Módulo de la plataforma sin API todavía: solo nombre, sin ruta, datos ni servicios. */
export interface PlatformModule {
  label: string;
  icon: IconName;
  description: string;
  enabled: false;
}

export interface AdminNavGroup {
  title: string;
  links: AdminNavLink[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: 'General',
    links: [{ label: 'Resumen', icon: 'dashboard', path: '/admin', exact: true }],
  },
  {
    title: 'Catálogo',
    // La papelera de cada sección es una pestaña dentro de ella (Activos · Inactivos · Papelera).
    links: [{ label: 'Productos', icon: 'package', path: '/admin/products' }],
  },
];

/** Para activar un módulo: crear features/<entidad>/, añadir su ruta y moverlo a ADMIN_NAV. */
export const PLATFORM_MODULES: PlatformModule[] = [
  { label: 'Usuarios', icon: 'users', description: 'Perfiles de compradores y vendedores', enabled: false },
  { label: 'Mensajes', icon: 'message', description: 'Conversaciones entre usuarios', enabled: false },
  { label: 'Reservas', icon: 'calendarCheck', description: 'Productos apartados para un comprador', enabled: false },
  { label: 'Valoraciones', icon: 'star', description: 'Opiniones tras cada venta', enabled: false },
  { label: 'Pagos', icon: 'card', description: 'Cobros y reembolsos', enabled: false },
  { label: 'Envíos', icon: 'truck', description: 'Seguimiento de paquetes', enabled: false },
];
