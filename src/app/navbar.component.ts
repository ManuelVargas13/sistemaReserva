import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  imports: [
    CommonModule,
    RouterModule
  ],
})
export class NavbarComponent {
  constructor(private auth: AuthService, private router: Router) {}

  get user() {
    return this.auth.getUser();
  }

  get showNavbar() {
    const currentUrl = this.router.url;
    return this.auth.isAuthenticated() &&
           !currentUrl.startsWith('/auth');
  }

  logout() {
    console.log('🔓 Navbar: Iniciando logout...');

    // ✅ LLAMAR AL MÉTODO LOGOUT DEL SERVICIO
    this.auth.logout();

    // ✅ LIMPIAR HISTORIAL DEL NAVEGADOR
    window.history.replaceState(null, '', '/auth');

    // ✅ NAVEGAR AL LOGIN REEMPLAZANDO LA ENTRADA DEL HISTORIAL
    this.router.navigate(['/auth'], {
      replaceUrl: true
    }).then(() => {
      console.log('✅ Navbar: Logout completado y redirigido');
    });
  }
}
