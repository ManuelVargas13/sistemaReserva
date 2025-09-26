import { Routes } from '@angular/router';
import { FlightsAdminComponent } from './flights-admin.component';
import { ReportsAdminComponent } from './reports-admin/reports-admin.component';

export const adminRoutes: Routes = [
  {
    path: 'flights',
    component: FlightsAdminComponent
  },
  {
    path: 'reports',
    component: ReportsAdminComponent
  }
];
