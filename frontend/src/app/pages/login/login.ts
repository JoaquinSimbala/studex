import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit {
  
  // Estados del componente
  isLoginMode = true;
  showPassword = false;
  isLoading = false;

  // Formularios reactivos
  loginForm!: FormGroup;
  registerForm!: FormGroup;

  // Propiedades para imagen de perfil
  selectedProfileImage: File | null = null;
  profileImagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
  }

  /**
   * Inicializa los formularios de login y registro
   */
  private initializeForms(): void {
    // Formulario de Login
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, this.universityEmailValidator]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false]
    });

    // Formulario de Registro
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email, this.universityEmailValidator]],
      university: ['', Validators.required],
      profileImage: [null],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });
  }

  /**
   * Validador personalizado para emails universitarios
   */
  private universityEmailValidator(control: AbstractControl): {[key: string]: any} | null {
    const email = control.value;
    if (!email) return null;
    
    const universityDomains = [
      'pucp.edu.pe', 'pucp.pe',
      'uni.edu.pe', 'uni.pe', 
      'unmsm.edu.pe',
      'upc.edu.pe', 'upc.pe',
      'usil.edu.pe',
      'ulima.edu.pe',
      'utec.edu.pe',
      'up.edu.pe',
      'esan.edu.pe'
    ];
    
    const domain = email.split('@')[1];
    const isValid = universityDomains.some(validDomain => 
      domain === validDomain || domain?.endsWith('.edu.pe')
    );
    
    return isValid ? null : { universityEmail: true };
  }

  /**
   * Validador de fortaleza de contraseña
   */
  private passwordStrengthValidator(control: AbstractControl): {[key: string]: any} | null {
    const password = control.value;
    if (!password) return null;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const valid = hasUpperCase && hasLowerCase && hasNumbers && password.length >= 8;
    
    if (!valid) {
      return { 
        passwordStrength: {
          hasUpperCase,
          hasLowerCase, 
          hasNumbers,
          hasSpecialChar,
          minLength: password.length >= 8
        }
      };
    }

    return null;
  }

  /**
   * Validador para confirmar que las contraseñas coinciden
   */
  private passwordMatchValidator(form: AbstractControl): {[key: string]: any} | null {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (!password || !confirmPassword) return null;
    
    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  /**
   * Cambia entre modo login y registro
   */
  setLoginMode(isLogin: boolean): void {
    this.isLoginMode = isLogin;
    this.showPassword = false;
    
    // Reset forms cuando cambia el modo
    if (isLogin) {
      this.loginForm.reset();
    } else {
      this.registerForm.reset();
    }
  }

  /**
   * Toggle para mostrar/ocultar contraseña
   */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Maneja el envío del formulario (login o registro)
   */
  async onSubmit(): Promise<void> {
    if (this.isLoading) return;

    const currentForm = this.isLoginMode ? this.loginForm : this.registerForm;
    
    if (currentForm.invalid) {
      this.markFormGroupTouched(currentForm);
      return;
    }

    this.isLoading = true;

    try {
      if (this.isLoginMode) {
        await this.handleLogin();
      } else {
        await this.handleRegister();
      }
    } catch (error) {
      console.error('Error en autenticación:', error);
      this.notificationService.showError(
        'Error inesperado', 
        'Ocurrió un problema durante la autenticación. Por favor, intenta nuevamente.'
      );
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Maneja el proceso de login
   */
  private async handleLogin(): Promise<void> {
    const { email, password, rememberMe } = this.loginForm.value;
    
    try {
      const success = await this.authService.login(email, password, rememberMe);
      
      if (success) {
        const user = this.authService.getCurrentUser();
        this.notificationService.showSuccess(
          '¡Bienvenido!', 
          `Hola ${user?.firstName}, has iniciado sesión correctamente.`
        );
        // Redirigir al dashboard o página principal
        this.router.navigate(['/']);
      } else {
        this.notificationService.showError(
          'Error de autenticación', 
          'Email o contraseña incorrectos. Por favor, verifica tus datos.'
        );
        this.loginForm.get('password')?.setErrors({ invalidCredentials: true });
      }
    } catch (error: any) {
      console.error('Error en login:', error);
      this.notificationService.showError(
        'Error de conexión', 
        'No se pudo conectar con el servidor. Por favor, intenta más tarde.'
      );
    }
  }

  /**
   * Maneja el proceso de registro
   */
  private async handleRegister(): Promise<void> {
    const formData = this.registerForm.value;
    
    try {
      // Si hay una imagen, crear FormData para multipart/form-data
      if (this.selectedProfileImage) {
        const formDataToSend = new FormData();
        formDataToSend.append('firstName', formData.firstName);
        formDataToSend.append('lastName', formData.lastName);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('university', formData.university);
        formDataToSend.append('password', formData.password);
        formDataToSend.append('profileImage', this.selectedProfileImage);
        
        const success = await this.authService.registerWithImage(formDataToSend);
        
        if (success) {
          this.notificationService.showSuccess(
            '¡Cuenta creada!', 
            `Bienvenido ${formData.firstName}. Tu cuenta ha sido creada exitosamente con tu imagen de perfil.`
          );
          this.resetRegistrationForm();
          this.setLoginMode(true);
          this.loginForm.patchValue({ email: formData.email });
        } else {
          this.handleRegistrationError();
        }
      } else {
        // Registro sin imagen
        const userData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          university: formData.university,
          password: formData.password
        };
        
        const success = await this.authService.register(userData);
        
        if (success) {
          this.notificationService.showSuccess(
            '¡Cuenta creada!', 
            `Bienvenido ${userData.firstName}. Tu cuenta ha sido creada exitosamente. Ahora puedes iniciar sesión.`
          );
          this.setLoginMode(true);
          this.loginForm.patchValue({ email: userData.email });
        } else {
          this.handleRegistrationError();
        }
      }
    } catch (error: any) {
      console.error('Error en registro:', error);
      let errorMessage = 'No se pudo crear la cuenta. Por favor, intenta más tarde.';
      
      // Manejo específico de errores
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message?.includes('email')) {
        errorMessage = 'El email ya está registrado. Por favor, usa otro email o inicia sesión.';
      }
      
      this.notificationService.showError('Error en el registro', errorMessage);
    }
  }

  /**
   * Maneja errores de registro
   */
  private handleRegistrationError(): void {
    this.notificationService.showError(
      'Error en el registro', 
      'No se pudo crear la cuenta. Es posible que el email ya esté registrado.'
    );
    this.registerForm.get('email')?.setErrors({ emailExists: true });
  }

  /**
   * Resetea el formulario de registro
   */
  private resetRegistrationForm(): void {
    this.registerForm.reset();
    this.selectedProfileImage = null;
    this.profileImagePreview = null;
  }

  /**
   * Marca todos los campos de un formulario como touched para mostrar errores
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Maneja la selección de imagen de perfil
   */
  onProfileImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        this.notificationService.showError(
          'Archivo inválido',
          'Por favor selecciona una imagen válida (JPG, PNG, etc.)'
        );
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.showError(
          'Archivo muy grande',
          'La imagen debe ser menor a 5MB'
        );
        return;
      }
      
      this.selectedProfileImage = file;
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = () => {
        this.profileImagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
      
      // Actualizar el formulario
      this.registerForm.patchValue({ profileImage: file });
    }
  }

  /**
   * Dispara el input de archivo de imagen de perfil
   */
  triggerFileInput(): void {
    const input = document.getElementById('profileImageInput') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  /**
   * Elimina la imagen de perfil seleccionada
   */
  removeProfileImage(): void {
    this.selectedProfileImage = null;
    this.profileImagePreview = null;
    this.registerForm.patchValue({ profileImage: null });
    
    // Limpiar el input file
    const input = document.getElementById('profileImageInput') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  /**
   * Maneja el login con Google (pendiente implementación)
   */
  onGoogleLogin(): void {
    // TODO: Implementar login con Google OAuth
    console.log('Google login - pendiente implementación');
  }

  /**
   * Getter para facilitar acceso a los controles del formulario en el template
   */
  get loginControls() {
    return this.loginForm.controls;
  }

  get registerControls() {
    return this.registerForm.controls;
  }
}
