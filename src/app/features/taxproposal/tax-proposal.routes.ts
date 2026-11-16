import { Routes } from '@angular/router';

export const TAX_PROPOSAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./tax-proposal-list.component').then(m => m.TaxproposalListComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./tax-proposal-create.component').then(m => m.TaxproposalCreateComponent)
  },
  // Detail page porer step e: { path: ':id', loadComponent: ... TaxProposalDetailComponent }
];