import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { platformAdminGuard } from './core/guards/platform-admin.guard';



export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'platform-login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/platform-login/platform-login.component').then(m => m.PlatformLoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },

  // ================= ADMIN TREE (আলাদা layout, বাম পাশে sidebar) =================
  {
    path: 'admin',
    canActivate: [authGuard, platformAdminGuard],
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'menus', pathMatch: 'full' },
      {
        path: 'menus',
        loadComponent: () =>
          import('./features/config/menu-management.component').then(m => m.MenuManagementComponent),
      },
      {
        path: 'permissions',
        loadComponent: () =>
          import('./features/admin/permission-management/permission-management.component')
            .then(m => m.PermissionManagementComponent),
      },
      { path: 'roles', loadComponent: () => import('./features/admin/roles/role-list.component').then(m => m.RoleListComponent) },
      { path: 'users', loadComponent: () => import('./features/admin/users/user-admin.component').then(m => m.UserAdminComponent) },
      { path: 'invites', loadComponent: () => import('./features/admin/invites/invite.component').then(m => m.InviteComponent) },
      { path: 'lookups', loadComponent: () => import('./features/admin/lookups/lookup.component').then(m => m.LookupComponent) },
      {
        path: 'municipalities',
        loadComponent: () =>
          import('./features/municipality/municipality-management.component')
            .then(m => m.MunicipalityManagementComponent),
      },
    ],
  },

  // পুরনো link ভাঙবে না
  { path: 'config/menus', redirectTo: 'admin/menus', pathMatch: 'full' },

  // ================= USER TREE (উপরে header menu) =================
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'committee', loadComponent: () => import('./features/committee/committee-list.component').then(m => m.CommitteeListComponent) },
      { path: 'committee/create', loadComponent: () => import('./features/committee/committee-form.component').then(m => m.CommitteeFormComponent) },
      { path: 'committee/:id', loadComponent: () => import('./features/committee/committee-detail.component').then(m => m.CommitteeDetailComponent) },
      { path: 'workflow', loadComponent: () => import('./features/workflow/workflow-list.component').then(m => m.WorkflowListComponent) },
      { path: 'workflow/:id', loadComponent: () => import('./features/workflow/workflow-decision.component').then(m => m.WorkflowDecisionComponent) },
      { path: 'document', loadComponent: () => import('./features/document/document-list.component').then(m => m.DocumentListComponent) },
      { path: 'config/types', loadComponent: () => import('./features/config/type-list.component').then(m => m.TypeListComponent) },
      { path: 'config/designations', loadComponent: () => import('./features/config/designation-list.component').then(m => m.DesignationListComponent) },
      { path: 'config/routes', loadComponent: () => import('./features/config/route-list.component').then(m => m.RouteListComponent) },
      { path: 'config/scopes', loadComponent: () => import('./features/config/scope-tree.component').then(m => m.ScopeTreeComponent) },
      { path: 'audit', loadComponent: () => import('./features/audit/audit-list.component').then(m => m.AuditListComponent) },
    ],
  },
  { path: '**', redirectTo: 'login' },
];