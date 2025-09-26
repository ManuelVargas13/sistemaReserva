import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      document: ['', [Validators.required, Validators.minLength(8)]] // ✅ AGREGAR DOCUMENTO
    }, {
      validators: this.passwordsMatchValidator
    });
  }

  // Validador personalizado para que las contraseñas coincidan
  passwordsMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordsMismatch: true };
    }
    return null;
  }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  async register() {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const userData = {
      name: this.registerForm.value.name,
      email: this.registerForm.value.email,
      username: this.registerForm.value.username,
      password: this.registerForm.value.password,
      role: 'customer', // ✅ CUSTOMER
      document: this.registerForm.value.document // ✅ AGREGAR DOCUMENTO
    };

    try {
      // Verificar si el usuario ya existe
      const existingUsers = await this.http.get<any[]>('http://localhost:3000/users').toPromise();
      const userExists = existingUsers?.some(user =>
        user.username === userData.username || user.email === userData.email
      );

      if (userExists) {
        this.error.set('El usuario o email ya existe');
        this.loading.set(false);
        return;
      }

      // Crear nuevo usuario
      const newUser = await this.http.post('http://localhost:3000/users', userData).toPromise();

      this.loading.set(false);

      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: '¡Registro exitoso!',
        html: `
          <div class="text-center">
            <i class="bi bi-person-check text-success fs-2 mb-2"></i>
            <p class="mb-1">Cuenta creada correctamente</p>
            <small class="text-muted">Ahora puedes iniciar sesión</small>
          </div>
        `,
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
        allowOutsideClick: false,
        customClass: {
          popup: 'swal-compact',
          title: 'swal-title-small',
          htmlContainer: 'swal-content-small'
        },
        width: '400px',
        position: 'center'
      }).then(() => {
        this.router.navigate(['/auth']);
      });

    } catch (error) {
      console.error('Error al registrar:', error);
      this.error.set('Error al crear la cuenta');
      this.loading.set(false);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  // Getters para validación en template
  get name() { return this.registerForm.get('name'); }
  get email() { return this.registerForm.get('email'); }
  get username() { return this.registerForm.get('username'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }
  get passwordsMismatch() { return this.registerForm.hasError('passwordsMismatch'); }
  get document() { return this.registerForm.get('document'); }
}
