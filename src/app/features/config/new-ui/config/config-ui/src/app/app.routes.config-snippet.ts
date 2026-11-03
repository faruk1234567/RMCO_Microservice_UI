// আপনার app.routes.ts-এর USER TREE (main-layout children)-এ আগের config/* route গুলো এই তালিকা দিয়ে বদলান।
// (type-list, designation-list, route-list, scope-tree-এর class-নাম আগের মতোই রাখা হয়েছে)
export const CONFIG_CHILDREN = [
  { path: 'config/types', loadComponent: () => import('./features/config/type-list.component').then(m => m.TypeListComponent) },
  { path: 'config/types/:typeId/versions/:versionId', loadComponent: () => import('./features/config/type-editor.component').then(m => m.TypeEditorComponent) },
  { path: 'config/designations', loadComponent: () => import('./features/config/designation-list.component').then(m => m.DesignationListComponent) },
  { path: 'config/scopes', loadComponent: () => import('./features/config/scope-tree.component').then(m => m.ScopeTreeComponent) },
  { path: 'config/routes', loadComponent: () => import('./features/config/route-list.component').then(m => m.RouteListComponent) },
  { path: 'config/routes/:id', loadComponent: () => import('./features/config/route-editor.component').then(m => m.RouteEditorComponent) },
  { path: 'config/master-items', loadComponent: () => import('./features/config/master-item.component').then(m => m.MasterItemComponent) },
  { path: 'config/labels', loadComponent: () => import('./features/config/label-template.component').then(m => m.LabelTemplateComponent) },
  { path: 'config/upload-policy', loadComponent: () => import('./features/config/upload-policy.component').then(m => m.UploadPolicyComponent) },
  { path: 'config/change-log', loadComponent: () => import('./features/config/change-log.component').then(m => m.ChangeLogComponent) },
];
// ব্যবহার: children: [ ...আগের অন্য route..., ...CONFIG_CHILDREN ]
