import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
})
export class LoginComponent {
  loginForm;
  error = '';
  loading = false;
  showPassword = false; // ✅ AGREGAR ESTA PROPIEDAD

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  // ✅ MÉTODO PARA MOSTRAR/OCULTAR CONTRASEÑA
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  // ✅ MÉTODO PARA LLENAR USUARIOS DE PRUEBA
  fillTestUser(type: 'admin' | 'user') {
    if (type === 'admin') {
      this.loginForm.patchValue({
        username: 'admin',
        password: 'admin123'
      });
    } else {
      this.loginForm.patchValue({
        username: 'carlos',
        password: '123456'
      });
    }

    // Marcar campos como tocados para mostrar validación
    this.loginForm.markAllAsTouched();
  }

  async login() {
    this.loading = true;
    this.error = '';
    const username = String(this.loginForm.value.username ?? '');
    const password = String(this.loginForm.value.password ?? '');
    console.log('Intentando login con:', username, password);
    const success = await this.auth.login(username, password);
    this.loading = false;
    console.log('Resultado login:', success, 'Usuario:', this.auth.getUser());

    if (success) {
      const userRole = this.auth.getUser()?.role;
      const userName = this.auth.getUser()?.name;

      if (this.auth.isAdmin()) {
        console.log('Usuario es admin, navegando a dashboard');

        Swal.fire({
          icon: 'success',
          title: `¡Bienvenido Administrador!`,
          html: `
            <div class="text-center">
              <i class="bi bi-shield-check text-success fs-2 mb-2"></i>
              <p class="mb-1">Hola <strong>${userName}</strong></p>
              <small class="text-muted">Panel de administración</small>
            </div>
          `,
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
          allowOutsideClick: false,
          customClass: {
            popup: 'swal-compact',
            title: 'swal-title-small',
            htmlContainer: 'swal-content-small'
          },
          width: '400px',
          backdrop: true,
          position: 'center'
        }).then(() => {
          this.router.navigate(['/']);
        });

      } else {
        console.log('Usuario es cliente, navegando a dashboard');

        Swal.fire({
          icon: 'success',
          title: `¡Bienvenido!`,
          html: `
            <div class="text-center">
              <i class="bi bi-person-check text-primary fs-2 mb-2"></i>
              <p class="mb-1">Hola <strong>${userName}</strong></p>
              <small class="text-muted">¿Listo para viajar?</small>
            </div>
          `,
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
          allowOutsideClick: false,
          customClass: {
            popup: 'swal-compact',
            title: 'swal-title-small',
            htmlContainer: 'swal-content-small'
          },
          width: '400px',
          backdrop: true,
          position: 'center'
        }).then(() => {
          this.router.navigate(['/']);
        });
      }
    } else {
      this.error = 'Credenciales inválidas';
      console.log('Login fallido');
    }
  }
}
