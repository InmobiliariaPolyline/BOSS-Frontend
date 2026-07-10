import { Routes } from '@angular/router';
import { EmpleadoComponent } from './pages/empleado/empleado.component';
import { LoginComponent } from './pages/login/login.component';
import { LayoutComponent } from './pages/layout/layout.component';
import { MaterialComponent } from './pages/material/material.component';
import { DonacionesComponent } from './pages/donaciones/donaciones.component';
import { CajaChicaComponent } from './pages/caja-chica/caja-chica.component';
import { ParteDiarioComponent } from './pages/parte-diario/parte-diario.component';
import { ReporteComponent } from './pages/reporte/reporte.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { jefeGuard } from './guards/jefe.guard';
import { developerGuard } from './guards/developer.guard';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: LoginComponent,
    },
    {
        path: 'pages',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'dashboard',
            },
            {
                path: 'dashboard',
                component: DashboardComponent,
                data: {
                    title: 'Dashboard',
                },
            },
            {
                path: 'partes-diarios',
                component: ParteDiarioComponent,
            },
            {
                path: 'inventario',
                component: MaterialComponent,
            },
            {
                path: 'caja-chica',
                component: CajaChicaComponent,
            },
            {
                path: 'donaciones',
                component: DonacionesComponent,
            },
            {
                path: 'trabajadores',
                component: EmpleadoComponent,
                canActivate: [jefeGuard],
            },
            {
                path: 'usuarios',
                component: UsuariosComponent,
                canActivate: [developerGuard],
            },
            {
                path: 'reportes',
                component: ReporteComponent,
                data: {
                    title: 'Reportes',
                },
            },
        ],
    }
];