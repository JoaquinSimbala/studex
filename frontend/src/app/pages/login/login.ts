import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ApiService } from '../../services/api.service';

/**
 * Interfaz que define la estructura de una categoría
 * @interface Category
 */
interface Category {
  /** Identificador único de la categoría */
  id: number;
  /** Nombre de la categoría */
  nombre: string;
  /** Descripción opcional de la categoría */
  descripcion?: string;
  /** Icono emoji o URL de la categoría */
  icono?: string;
  /** Color hexadecimal de la categoría */
  colorHex?: string;
}

/**
 * Componente de Login y Registro
 * 
 * Componente standalone que maneja tanto el inicio de sesión como el registro de usuarios.
 * Incluye validaciones de formulario, autenticación con Google OAuth, y carga de imagen de perfil.
 * 
 * @component
 * @standalone
 * @example
 * <app-login></app-login>
 * 
 * @description
 * Características principales:
 * - Formulario dual (Login/Registro) con toggle
 * - Validación de emails universitarios y comunes
 * - Selección de 1-3 categorías de interés en registro
 * - Carga opcional de imagen de perfil
 * - Autenticación con Google OAuth 2.0
 * - Validación de fortaleza de contraseña
 * - Responsive para móviles y desktop
 * 
 * @remarks
 * El componente lee el parámetro 'mode' de la URL para determinar qué formulario mostrar:
 * - ?mode=login → Muestra formulario de inicio de sesión
 * - ?mode=register → Muestra formulario de registro
 * - Sin parámetro → Muestra login por defecto
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit {
  
  // ==================== PROPIEDADES DE ESTADO ====================
  
  /**
   * Indica si el componente está en modo login (true) o registro (false)
   * @default true
   */
  isLoginMode = true;
  
  /**
   * Controla la visibilidad de la contraseña en los inputs
   * @default false
   */
  showPassword = false;
  
  /**
   * Indica si hay una operación en curso (login/registro)
   * @default false
   */
  isLoading = false;

  // ==================== FORMULARIOS ====================
  
  /**
   * FormGroup para el formulario de inicio de sesión
   * @type {FormGroup}
   * @property {string} email - Email del usuario (con validación universitaria/común)
   * @property {string} password - Contraseña del usuario (mínimo 8 caracteres)
   * @property {boolean} rememberMe - Mantener sesión activa
   */
  loginForm!: FormGroup;
  
  /**
   * FormGroup para el formulario de registro
   * @type {FormGroup}
   * @property {string} firstName - Nombre del usuario
   * @property {string} lastName - Apellido del usuario
   * @property {string} email - Email del usuario (con validación)
   * @property {number[]} preferredCategories - Array de IDs de categorías seleccionadas (1-3)
   * @property {File|null} profileImage - Imagen de perfil opcional
   * @property {string} password - Contraseña (con validación de fortaleza)
   * @property {string} confirmPassword - Confirmación de contraseña
   * @property {boolean} acceptTerms - Aceptación de términos y condiciones
   */
  registerForm!: FormGroup;

  // ==================== IMAGEN DE PERFIL ====================
  
  /**
   * Archivo de imagen seleccionado para el perfil
   * @type {File | null}
   * @default null
   */
  selectedProfileImage: File | null = null;
  
  /**
   * URL de vista previa de la imagen de perfil
   * @type {string | null}
   * @default null
   */
  profileImagePreview: string | null = null;

  // ==================== CATEGORÍAS ====================
  
  /**
   * Array de categorías cargadas desde el backend
   * @type {Category[]}
   * @default []
   */
  categories: Category[] = [];
  
  /**
   * Array de IDs de categorías seleccionadas por el usuario (máximo 3)
   * @type {number[]}
   * @default []
   */
  selectedCategories: number[] = [];

  // ==================== CONSTRUCTOR ====================
  
  /**
   * Constructor del componente
   * @param {FormBuilder} fb - Constructor de formularios reactivos
   * @param {AuthService} authService - Servicio de autenticación
   * @param {ApiService} apiService - Servicio para llamadas a la API
   * @param {Router} router - Router de Angular para navegación
   * @param {ActivatedRoute} route - Ruta activa para leer parámetros de URL
   * @param {NotificationService} notificationService - Servicio para mostrar notificaciones
   */
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {}

  // ==================== LIFECYCLE HOOKS ====================
  
  /**
   * Hook de inicialización del componente
   * Inicializa los formularios, carga categorías y lee parámetros de URL
   * @returns {void}
   */
  ngOnInit(): void {
    this.initializeForms();
    this.loadCategories();
    
    // Leer el parámetro 'mode' de la URL para determinar si mostrar login o registro
    this.route.queryParams.subscribe(params => {
      const mode = params['mode'];
      if (mode === 'register') {
        this.isLoginMode = false;
      } else if (mode === 'login') {
        this.isLoginMode = true;
      }
      // Si no hay parámetro, mantener el modo por defecto (login)
    });
  }

  // ==================== MÉTODOS DE CARGA DE DATOS ====================

  /**
   * Carga las categorías disponibles desde el backend
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Si hay un error al cargar las categorías
   * @example
   * await this.loadCategories();
   */
  async loadCategories(): Promise<void> {
    try {
      const response = await this.apiService.getCategories().toPromise();
      this.categories = response?.data || [];
      console.log('✅ Categorías cargadas:', this.categories);
    } catch (error) {
      console.error('❌ Error cargando categorías:', error);
      this.notificationService.showError('Error', 'No se pudieron cargar las categorías');
    }
  }

  // ==================== MÉTODOS DE GESTIÓN DE CATEGORÍAS ====================

  /**
   * Alterna la selección de una categoría (agregar/remover)
   * Máximo 3 categorías permitidas
   * @param {number} categoryId - ID de la categoría a alternar
   * @returns {void}
   * @example
   * this.toggleCategory(5);
   */
  toggleCategory(categoryId: number): void {
    const index = this.selectedCategories.indexOf(categoryId);
    
    if (index === -1) {
      // Agregar categoría si no está seleccionada y no se ha alcanzado el máximo
      if (this.selectedCategories.length < 3) {
        this.selectedCategories.push(categoryId);
      }
    } else {
      // Remover categoría si ya está seleccionada
      this.selectedCategories.splice(index, 1);
    }
    
    // Actualizar el form control
    this.registerForm.patchValue({
      preferredCategories: this.selectedCategories
    });
  }

  /**
   * Verifica si una categoría está seleccionada
   * @param {number} categoryId - ID de la categoría a verificar
   * @returns {boolean} True si la categoría está seleccionada
   * @example
   * const isSelected = this.isCategorySelected(5);
   */
  isCategorySelected(categoryId: number): boolean {
    return this.selectedCategories.includes(categoryId);
  }

  // ==================== AUTENTICACIÓN CON GOOGLE ====================

  /**
   * Inicia el flujo de autenticación con Google OAuth 2.0
   * Redirige al usuario al endpoint de Google en el backend
   * @returns {void}
   * @example
   * this.loginWithGoogle();
   * @remarks
   * El backend manejará la comunicación con Google y devolverá un JWT token
   */
  loginWithGoogle(): void {
    // Redirigir al endpoint de Google OAuth en el backend
    const backendUrl = 'http://localhost:3000'; // TODO: Usar variable de entorno en producción
    window.location.href = `${backendUrl}/api/auth/google`;
  }

  // ==================== INICIALIZACIÓN DE FORMULARIOS ====================

  /**
   * Inicializa los formularios reactivos de login y registro con sus validadores
   * @private
   * @returns {void}
   * @description
   * Crea dos FormGroups:
   * - loginForm: email, password, rememberMe
   * - registerForm: firstName, lastName, email, preferredCategories, profileImage, 
   *   password, confirmPassword, acceptTerms
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
      preferredCategories: [[], [Validators.required, this.categoriesValidator]],
      profileImage: [null],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });
  }

  // ==================== VALIDADORES PERSONALIZADOS ====================

  /**
   * Validador para categorías preferidas
   * Verifica que se hayan seleccionado entre 1 y 3 categorías
   * @private
   * @param {AbstractControl} control - Control del formulario a validar
   * @returns {{[key: string]: any} | null} Objeto con error si es inválido, null si es válido
   * @example
   * preferredCategories: [[], [Validators.required, this.categoriesValidator]]
   */
  private categoriesValidator(control: AbstractControl): {[key: string]: any} | null {
    const categories = control.value;
    if (!Array.isArray(categories) || categories.length < 1 || categories.length > 3) {
      return { categoriesInvalid: true };
    }
    return null;
  }

  /**
   * Validador personalizado para emails universitarios y comunes
   * Acepta emails de universidades peruanas (.edu.pe) y proveedores comunes (gmail, outlook, etc.)
   * @private
   * @param {AbstractControl} control - Control del formulario a validar
   * @returns {{[key: string]: any} | null} Objeto con error si es inválido, null si es válido
   * @example
   * email: ['', [Validators.required, Validators.email, this.universityEmailValidator]]
   */
  private universityEmailValidator(control: AbstractControl): {[key: string]: any} | null {
    const email = control.value;
    if (!email) return null;
    
    // Dominios universitarios permitidos
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
    
    // Dominios de correo común permitidos
    const commonDomains = [
      'gmail.com',
      'outlook.com',
      'hotmail.com',
      'yahoo.com',
      'live.com',
      'icloud.com',
      'protonmail.com'
    ];
    
    const domain = email.split('@')[1];
    
    // Validar si es universitario (.edu.pe o específicos)
    const isUniversity = universityDomains.some(validDomain => 
      domain === validDomain || domain?.endsWith('.edu.pe')
    );
    
    // Validar si es email común
    const isCommon = commonDomains.some(validDomain => domain === validDomain);
    
    // Es válido si es universitario O común
    return (isUniversity || isCommon) ? null : { universityEmail: true };
  }

  /**
   * Validador de fortaleza de contraseña
   * Verifica: mayúsculas, minúsculas, números, y longitud mínima de 8 caracteres
   * @private
   * @param {AbstractControl} control - Control del formulario a validar
   * @returns {{[key: string]: any} | null} Objeto con detalles del error si es inválido, null si es válido
   * @example
   * password: ['', [Validators.required, this.passwordStrengthValidator]]
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
   * Compara los campos 'password' y 'confirmPassword' del FormGroup
   * @private
   * @param {AbstractControl} form - FormGroup que contiene los campos de contraseña
   * @returns {{[key: string]: any} | null} Objeto con error si no coinciden, null si coinciden
   * @example
   * this.fb.group({...}, { validators: this.passwordMatchValidator })
   */
  private passwordMatchValidator(form: AbstractControl): {[key: string]: any} | null {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (!password || !confirmPassword) return null;
    
    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  // ==================== MÉTODOS DE CONTROL DE UI ====================

  /**
   * Cambia entre modo login y registro
   * Resetea el formulario correspondiente al cambiar de modo
   * @param {boolean} isLogin - True para modo login, false para modo registro
   * @returns {void}
   * @example
   * this.setLoginMode(true); // Cambiar a login
   * this.setLoginMode(false); // Cambiar a registro
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
   * Alterna la visibilidad de la contraseña (mostrar/ocultar)
   * @returns {void}
   * @example
   * this.togglePassword();
   */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // ==================== MANEJO DE ENVÍO DE FORMULARIOS ====================

  /**
   * Maneja el envío del formulario activo (login o registro)
   * Valida el formulario antes de procesar y muestra el estado de carga
   * @async
   * @returns {Promise<void>}
   * @example
   * await this.onSubmit();
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
   * Procesa el inicio de sesión del usuario
   * @private
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Si hay un error durante el login
   * @description
   * - Extrae credenciales del loginForm
   * - Llama al AuthService para autenticar
   * - Redirige al home si es exitoso
   * - Muestra errores específicos si falla
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
   * Procesa el registro de un nuevo usuario
   * @private
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Si hay un error durante el registro
   * @description
   * - Extrae datos del registerForm
   * - Crea FormData con imagen de perfil si existe
   * - Incluye categorías preferidas seleccionadas
   * - Llama al AuthService para registrar
   * - Cambia a modo login si es exitoso
   * - Maneja errores específicos (409: email duplicado, 400: datos inválidos)
   */
  private async handleRegister(): Promise<void> {
    const formData = this.registerForm.value;
    
    try {
      // Crear FormData para multipart/form-data
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('university', ''); // Universidad vacía por ahora
      formDataToSend.append('password', formData.password);
      
      // Agregar categorías preferidas como JSON string
      formDataToSend.append('preferredCategories', JSON.stringify(this.selectedCategories));
      
      // Agregar imagen de perfil si existe
      if (this.selectedProfileImage) {
        formDataToSend.append('profileImage', this.selectedProfileImage);
      }
      
      const success = await this.authService.registerWithImage(formDataToSend);
      
      if (success) {
        this.notificationService.showSuccess(
          '¡Cuenta creada!', 
          `Bienvenido ${formData.firstName}. Tu cuenta ha sido creada exitosamente.`
        );
        this.resetRegistrationForm();
        this.setLoginMode(true);
        this.loginForm.patchValue({ email: formData.email });
      } else {
        this.handleRegistrationError();
      }
    } catch (error: any) {
      console.error('Error en registro:', error);
      
      // Manejar errores específicos
      if (error?.status === 409) {
        this.notificationService.showError(
          'Email ya registrado', 
          'Este email ya está en uso. Por favor, usa otro email o inicia sesión.'
        );
        this.registerForm.get('email')?.setErrors({ emailTaken: true });
      } else if (error?.status === 400) {
        this.notificationService.showError(
          'Datos inválidos', 
          error?.error?.message || 'Verifica que todos los campos estén correctos.'
        );
      } else {
        this.notificationService.showError(
          'Error de registro', 
          'No se pudo completar el registro. Por favor, intenta nuevamente.'
        );
      }
    }
  }

  /**
   * Maneja errores genéricos de registro
   * @private
   * @returns {void}
   */
  private handleRegistrationError(): void {
    this.notificationService.showError(
      'Error en el registro', 
      'No se pudo crear la cuenta. Es posible que el email ya esté registrado.'
    );
    this.registerForm.get('email')?.setErrors({ emailExists: true });
  }

  /**
   * Resetea el formulario de registro y limpia todos los datos relacionados
   * @private
   * @returns {void}
   */
  private resetRegistrationForm(): void {
    this.registerForm.reset();
    this.selectedProfileImage = null;
    this.profileImagePreview = null;
    this.selectedCategories = [];
  }

  /**
   * Marca todos los campos de un formulario como touched
   * Útil para mostrar errores de validación cuando el usuario intenta enviar un formulario inválido
   * @private
   * @param {FormGroup} formGroup - Formulario a marcar
   * @returns {void}
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

  // ==================== MANEJO DE IMAGEN DE PERFIL ====================

  /**
   * Maneja la selección de una imagen de perfil
   * Valida el tipo y tamaño del archivo, crea una vista previa y actualiza el formulario
   * @param {Event} event - Evento del input file
   * @returns {void}
   * @example
   * <input type="file" (change)="onProfileImageSelected($event)">
   * @description
   * Validaciones:
   * - Solo acepta archivos de tipo imagen
   * - Tamaño máximo: 5MB
   * - Crea una vista previa base64 de la imagen
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
   * Activa el input de archivo de imagen de perfil (oculto)
   * @returns {void}
   * @example
   * <button (click)="triggerFileInput()">Seleccionar imagen</button>
   */
  triggerFileInput(): void {
    const input = document.getElementById('profileImageInput') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  /**
   * Elimina la imagen de perfil seleccionada
   * Limpia el archivo, la vista previa y el campo del formulario
   * @returns {void}
   * @example
   * <button (click)="removeProfileImage()">Eliminar imagen</button>
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

  // ==================== GETTERS PARA EL TEMPLATE ====================

  /**
   * Getter para facilitar el acceso a los controles del loginForm en el template
   * @returns {Object} Objeto con los controles del formulario de login
   * @example
   * <div *ngIf="loginControls.email.invalid">Error en email</div>
   */
  get loginControls() {
    return this.loginForm.controls;
  }

  /**
   * Getter para facilitar el acceso a los controles del registerForm en el template
   * @returns {Object} Objeto con los controles del formulario de registro
   * @example
   * <div *ngIf="registerControls.firstName.invalid">Error en nombre</div>
   */
  get registerControls() {
    return this.registerForm.controls;
  }
}
