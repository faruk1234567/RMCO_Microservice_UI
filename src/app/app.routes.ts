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
  import('./menu/menu-manager.component')
    .then(m => m.MenuManagerComponent),},
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
        path: 'wards',
        loadComponent: () =>
          import('./features/admin/ward/ward-management.component')
            .then(m => m.WardManagementComponent),
      },
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
      {
        path: 'user-management',
        loadComponent: () =>
          import('./features/admin/users/user-admin.component')
            .then(m => m.UserAdminComponent),
      },
      // পৌরসভা অ্যাডমিনের জন্য রোল ব্যবস্থাপনা (platformAdminGuard ছাড়া)
      {
        path: 'role-management',
        loadComponent: () =>
          import('./features/admin/roles/role-list.component')
            .then(m => m.RoleListComponent),
      },
      {
        path: 'wards',
        loadComponent: () =>
          import('./features/admin/ward/ward-management.component')
            .then(m => m.WardManagementComponent),
      },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'committee', loadComponent: () => import('./features/committee/committee-list.component').then(m => m.CommitteeListComponent) },
      { path: 'committee/create', loadComponent: () => import('./features/committee/committee-form.component').then(m => m.CommitteeFormComponent) },
      { path: 'committee/hierarchy', loadComponent: () => import('./features/committee/committee-hierarchy.component').then(m => m.CommitteeHierarchyComponent) },
      { path: 'committee/:id', loadComponent: () => import('./features/committee/committee-detail.component').then(m => m.CommitteeDetailComponent) },
      { path: 'workflow', loadComponent: () => import('./features/workflow/workflow-list.component').then(m => m.WorkflowListComponent) },
      { path: 'workflow/:id', loadComponent: () => import('./features/workflow/workflow-decision.component').then(m => m.WorkflowDecisionComponent) },
      { path: 'document', loadComponent: () => import('./features/document/document-list.component').then(m => m.DocumentListComponent) },

      // ---------- Config (B-01 … B-13) ----------
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

      // ---------- কর প্রস্তাব, আপত্তি, নোটিশ ----------
      { path: 'tax-proposals', loadComponent: () => import('./features/municipal/tax-proposal-list.component').then(m => m.TaxProposalListComponent) },
      { path: 'tax-proposals/new', loadComponent: () => import('./features/municipal/tax-proposal-form.component').then(m => m.TaxProposalFormComponent) },
      { path: 'tax-proposals/:id', loadComponent: () => import('./features/municipal/tax-proposal-detail.component').then(m => m.TaxProposalDetailComponent) },
      { path: 'objections', loadComponent: () => import('./features/municipal/objection-list.component').then(m => m.ObjectionListComponent) },
      { path: 'objections/new', loadComponent: () => import('./features/municipal/objection-form.component').then(m => m.ObjectionFormComponent) },
      { path: 'objections/:id', loadComponent: () => import('./features/municipal/objection-detail.component').then(m => m.ObjectionDetailComponent) },
      { path: 'notices', loadComponent: () => import('./features/municipal/notice-home.component').then(m => m.NoticeHomeComponent) },
      { path: 'notices/messages/new', loadComponent: () => import('./features/municipal/notice-message-form.component').then(m => m.NoticeMessageFormComponent) },
      { path: 'notices/campaigns/new', loadComponent: () => import('./features/municipal/notice-campaign-form.component').then(m => m.NoticeCampaignFormComponent) },
      { path: 'notices/campaigns/:id', loadComponent: () => import('./features/municipal/notice-campaign-detail.component').then(m => m.NoticeCampaignDetailComponent) },
      { path: 'notices/print-jobs/new', loadComponent: () => import('./features/municipal/notice-print-job.component').then(m => m.NoticePrintJobComponent) },

      { path: 'audit', loadComponent: () => import('./features/audit/audit-list.component').then(m => m.AuditListComponent) },
    ],
  },
  { path: '**', redirectTo: 'login' },
];