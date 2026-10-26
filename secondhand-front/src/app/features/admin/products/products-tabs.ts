import { AdminTab } from '../components/admin-tabs/admin-tabs.component';

/** Las pestañas de la sección Productos. Las usan la página de activos/inactivos y la de la papelera. */
export function productsTabs(counts: { active: number | null; inactive: number | null; trash: number | null }): AdminTab[] {
  return [
    { label: 'Activos', icon: 'checkCircle', link: '/admin/products', count: counts.active },
    { label: 'Inactivos', icon: 'eyeOff', link: '/admin/products/inactive', count: counts.inactive },
    { label: 'Papelera', icon: 'trash', link: '/admin/products/trash', count: counts.trash },
  ];
}
