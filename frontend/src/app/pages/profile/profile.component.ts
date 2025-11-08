import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
// import { Router } from '@angular/router'; // ❌ COMENTADO: No se usa Router en este componente
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { LoggerService } from '../../services/logger.service';
import { BackButtonComponent } from '../../components/back-button/back-button.component';

/**
 * Componente de perfil de usuario
 * 
 * @description
 * Gestiona la visualización y edición del perfil del usuario, incluyendo:
 * - Información personal (nombre, apellido, email, universidad, etc.)
 * - Imagen de perfil con soporte para Google OAuth y Cloudinary
 * - Categorías de interés (1-3 categorías)
 * - Cambio de contraseña (solo para usuarios con autenticación LOCAL)
 * 
 * @features
 * - Skeleton loading durante la carga inicial
 * - Validación de formularios con mensajes de error
 * - Soporte para autenticación Google OAuth y Local
 * - Manejo de errores de carga de imágenes con fallback
 * - Actualización reactiva del usuario desde AuthService
 * 
 * @author Studex Team
 * @version 2.0.0
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  
  // ==================== PROPIEDADES DE USUARIO ====================
  
  /** Usuario actual autenticado */
  currentUser: User | null = null;
  
  /** Formulario de edición de perfil */
  profileForm: FormGroup;
  
  /** Formulario de cambio de contraseña */
  passwordForm: FormGroup;
  
  // ==================== PROPIEDADES DE CATEGORÍAS ====================
  
  /** Lista de todas las categorías disponibles */
  categories: any[] = [];
  
  /** Categorías preferidas del usuario actual */
  userCategories: any[] = [];
  
  /** IDs de categorías seleccionadas (temporal durante edición) */
  selectedCategoryIds: number[] = [];
  
  /** Indica si el usuario está editando sus categorías */
  isEditingCategories = false;
  
  /** Indica si se está guardando las categorías */
  isLoadingCategories = false;
  
  /** Mensaje de feedback para operaciones de categorías */
  categoriesMessage = '';
  
  /** Indica si la última operación de categorías fue exitosa */
  categoriesSuccess = false;
  
  // ==================== ESTADOS DE CARGA Y EDICIÓN ====================
  
  /** Indica si se está cargando el perfil del usuario (skeleton) */
  isLoadingUser = true;
  
  /** Indica si el usuario está editando su perfil */
  isEditingProfile = false;
  
  /** Indica si el usuario está cambiando su contraseña */
  isChangingPassword = false;
  
  /** Indica si se está guardando el perfil */
  isLoadingProfile = false;
  
  /** Indica si se está cambiando la contraseña */
  isLoadingPassword = false;
  
  /** Indica si se está subiendo una imagen de perfil */
  isUploadingImage = false;
  
  // ==================== MENSAJES DE FEEDBACK ====================
  
  /** Mensaje de feedback para operaciones de perfil */
  profileMessage = '';
  
  /** Mensaje de feedback para operaciones de contraseña */
  passwordMessage = '';
  
  /** Mensaje de feedback para operaciones de imagen */
  imageMessage = '';
  
  // ==================== ESTADOS DE ÉXITO/ERROR ====================
  
  /** Indica si la última operación de perfil fue exitosa */
  profileSuccess = false;
  
  /** Indica si la última operación de contraseña fue exitosa */
  passwordSuccess = false;
  
  /** Indica si la última operación de imagen fue exitosa */
  imageSuccess = false;
  
  /**
   * Constructor del componente
   * 
   * @param fb - FormBuilder para crear formularios reactivos
   * @param authService - Servicio de autenticación para gestionar el usuario actual
   * @param apiService - Servicio API para comunicación con el backend
   * @param sanitizer - DomSanitizer para sanitizar HTML
   * @param logger - Servicio de logging
   */
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private apiService: ApiService,
    private sanitizer: DomSanitizer,
    private logger: LoggerService
  ) {
    // Formulario de perfil
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      university: [''],
      areaEstudio: [''], // Área de estudio/carrera
      descripcion: ['', [Validators.maxLength(500)]] // Biografía/descripción
    });

    // Formulario de cambio de contraseña
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  /**
   * Hook de inicialización del componente
   * 
   * @description
   * - Espera a que AuthService esté inicializado
   * - Carga el perfil del usuario
   * - Carga todas las categorías disponibles
   * - Carga las categorías preferidas del usuario
   */
  ngOnInit() {
    // Esperar a que el AuthService esté inicializado antes de cargar el perfil
    this.authService.isInitialized$.subscribe(isInitialized => {
      if (isInitialized) {
        this.loadUserProfile();
      }
    });
    
    this.loadCategories();
    this.loadUserCategories();
  }

  // ==================== GESTIÓN DE PERFIL ====================

  /**
   * Carga el perfil del usuario actual
   * 
   * @description
   * Se suscribe al observable currentUser$ del AuthService para obtener
   * actualizaciones en tiempo real del usuario. Actualiza el formulario
   * con los datos del usuario.
   */
  async loadUserProfile() {
    try {
      this.isLoadingUser = true;
      
      // Suscribirse al observable del usuario para actualizaciones en tiempo real
      this.authService.currentUser$.subscribe(user => {
        if (user) {
          this.currentUser = user;
          this.profileForm.patchValue({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            university: user.university || '',
            areaEstudio: user.areaEstudio || '',
            descripcion: user.descripcion || ''
          });
          this.logger.debug('Perfil de usuario cargado');
          this.isLoadingUser = false;
        } else {
          this.logger.warn('No hay usuario autenticado');
          this.isLoadingUser = false;
        }
      });
    } catch (error) {
      this.logger.error('Error loading user profile', error);
      this.isLoadingUser = false;
    }
  }

  /**
   * Validador personalizado para confirmar que las contraseñas coincidan
   * 
   * @param form - FormGroup que contiene los campos de contraseña
   * @returns Object con error si no coinciden, null si coinciden
   */
  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  /**
   * Activa el modo de edición del perfil
   */
  enableProfileEdit() {
    this.isEditingProfile = true;
    this.profileMessage = '';
  }

  /**
   * Cancela la edición del perfil y restaura los valores originales
   */
  cancelProfileEdit() {
    this.isEditingProfile = false;
    this.loadUserProfile(); // Restaurar valores originales
    this.profileMessage = '';
  }

  /**
   * Guarda los cambios del perfil
   * 
   * @description
   * Valida el formulario y envía los datos actualizados al backend.
   * Actualiza el usuario en el AuthService si la operación es exitosa.
   */
  async saveProfile() {
    if (this.profileForm.valid) {
      this.isLoadingProfile = true;
      this.profileMessage = '';
      
      try {
        const profileData = this.profileForm.value;
        const response = await this.apiService.updateUserProfile(profileData).toPromise();
        
        if (response && response.success) {
          this.profileSuccess = true;
          this.profileMessage = 'Perfil actualizado correctamente';
          this.isEditingProfile = false;
          
          // Actualizar usuario actual en AuthService si hay datos de usuario
          if (response.data) {
            this.authService.updateUser(response.data);
            this.currentUser = response.data;
          }
          
          // Limpiar mensaje después de 3 segundos
          setTimeout(() => {
            this.profileMessage = '';
            this.profileSuccess = false;
          }, 3000);
        }
      } catch (error: any) {
        this.profileSuccess = false;
        this.profileMessage = error.error?.message || 'Error al actualizar el perfil';
      } finally {
        this.isLoadingProfile = false;
      }
    } else {
      this.markFormGroupTouched(this.profileForm);
    }
  }

  // ==================== GESTIÓN DE CONTRASEÑA ====================

  /**
   * Activa el modo de cambio de contraseña
   */
  enablePasswordChange() {
    this.isChangingPassword = true;
    this.passwordMessage = '';
  }

  /**
   * Cancela el cambio de contraseña y limpia el formulario
   */
  cancelPasswordChange() {
    this.isChangingPassword = false;
    this.passwordForm.reset();
    this.passwordMessage = '';
  }

  /**
   * Cambia la contraseña del usuario
   * 
   * @description
   * Solo disponible para usuarios con autenticación LOCAL.
   * Valida el formulario y envía la solicitud al backend.
   */
  async changePassword() {
    if (this.passwordForm.valid) {
      this.isLoadingPassword = true;
      this.passwordMessage = '';
      
      try {
        const { currentPassword, newPassword } = this.passwordForm.value;
        const response = await this.apiService.changePassword(currentPassword, newPassword).toPromise();
        
        if (response && response.success) {
          this.passwordSuccess = true;
          this.passwordMessage = 'Contraseña cambiada correctamente';
          this.isChangingPassword = false;
          this.passwordForm.reset();
          
          // Limpiar mensaje después de 3 segundos
          setTimeout(() => {
            this.passwordMessage = '';
            this.passwordSuccess = false;
          }, 3000);
        }
      } catch (error: any) {
        this.passwordSuccess = false;
        this.passwordMessage = error.error?.message || 'Error al cambiar la contraseña';
      } finally {
        this.isLoadingPassword = false;
      }
    } else {
      this.markFormGroupTouched(this.passwordForm);
    }
  }

  // ==================== GESTIÓN DE IMAGEN DE PERFIL ====================

  /**
   * Maneja la selección y carga de una nueva imagen de perfil
   * 
   * @param event - Evento del input file
   * 
   * @description
   * Valida el tipo de archivo (solo imágenes) y el tamaño (máx 5MB).
   * Sube la imagen a Cloudinary y actualiza el usuario.
   */
  async onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        this.imageMessage = 'Por favor selecciona una imagen válida';
        this.imageSuccess = false;
        return;
      }

      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.imageMessage = 'La imagen no debe exceder 5MB';
        this.imageSuccess = false;
        return;
      }

      this.isUploadingImage = true;
      this.imageMessage = '';

      try {
        const formData = new FormData();
        formData.append('profileImage', file);
        
        const response = await this.apiService.uploadProfileImage(formData).toPromise();
        
        if (response && response.success && response.data) {
          this.imageSuccess = true;
          this.imageMessage = 'Imagen actualizada correctamente';
          
          // Actualizar imagen y usuario completo del backend
          const updatedUser = response.data.user;
          if (updatedUser) {
            // Forzar actualización con timestamp para evitar cache
            const imageUrl = response.data.imageUrl;
            const timestampedUrl = imageUrl.includes('?') 
              ? `${imageUrl}&t=${Date.now()}` 
              : `${imageUrl}?t=${Date.now()}`;
            
            // Actualizar el usuario con la nueva imagen
            updatedUser.profileImage = timestampedUrl;
            this.currentUser = updatedUser;
            
            // Actualizar en el AuthService
            this.authService.updateUser(updatedUser);
            
            this.logger.success('Usuario actualizado con nueva imagen');
          }
          
          // Limpiar mensaje después de 3 segundos
          setTimeout(() => {
            this.imageMessage = '';
            this.imageSuccess = false;
          }, 3000);
        }
      } catch (error: any) {
        this.imageSuccess = false;
        this.imageMessage = error.error?.message || 'Error al subir la imagen';
      } finally {
        this.isUploadingImage = false;
      }
    }
  }

  /**
   * Obtiene la URL de la imagen de perfil con manejo inteligente de fuentes
   * 
   * @returns URL de la imagen de perfil o avatar generado
   * 
   * @description
   * Maneja diferentes fuentes de imágenes:
   * - Google OAuth (googleusercontent.com) → Sin modificar
   * - Cloudinary → Sin modificar (ya tiene cache control)
   * - Otras imágenes → Agrega timestamp si es necesario
   * - Fallback → Avatar generado con iniciales del usuario
   */
  getProfileImageUrl(): string {
    if (this.currentUser?.profileImage) {
      const profileImage = this.currentUser.profileImage;
      
      // Si es una imagen de Google (googleusercontent.com), usarla directamente
      if (profileImage.includes('googleusercontent.com')) {
        return profileImage;
      }
      
      // Si ya tiene timestamp, usarla tal como está
      if (profileImage.includes('?t=') || profileImage.includes('&t=')) {
        return profileImage;
      }
      
      // Para imágenes de Cloudinary (nuestro servidor), NO agregar timestamp
      // porque ya tienen control de cache adecuado
      if (profileImage.includes('cloudinary.com')) {
        return profileImage;
      }
      
      // Para otras imágenes, agregar timestamp solo si es necesario
      const separator = profileImage.includes('?') ? '&' : '?';
      return `${profileImage}${separator}t=${Date.now()}`;
    }
    
    // Fallback a avatar generado con iniciales
    if (this.currentUser) {
      const firstName = this.currentUser.firstName || 'Usuario';
      const lastName = this.currentUser.lastName || '';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=10B981&color=fff&size=200`;
    }
    
    return 'https://ui-avatars.com/api/?name=Usuario&background=10B981&color=fff&size=200';
  }

  /**
   * Maneja errores de carga de imagen de perfil
   * 
   * @param event - Evento de error de la imagen
   * 
   * @description
   * Si la imagen falla al cargar (URL expirada, error de red, etc.),
   * automáticamente cambia a un avatar generado con las iniciales del usuario.
   */
  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    const name = encodeURIComponent(
      `${this.currentUser?.firstName || ''} ${this.currentUser?.lastName || ''}`.trim() || 'Usuario'
    );
    imgElement.src = `https://ui-avatars.com/api/?name=${name}&size=200&background=4F46E5&color=fff&bold=true`;
    this.logger.error('Error al cargar imagen de perfil, usando fallback');
  }

  // ==================== GESTIÓN DE CATEGORÍAS ====================

  /**
   * Carga todas las categorías disponibles del sistema
   * 
   * @description
   * Obtiene la lista completa de categorías desde el backend
   * para mostrarlas en el selector de categorías de interés.
   */
  async loadCategories() {
    try {
      const response = await this.apiService.getCategories().toPromise();
      if (response && response.success && response.data) {
        this.categories = response.data;
      }
    } catch (error) {
      this.logger.error('Error cargando categorías', error);
    }
  }

  /**
   * Carga las categorías preferidas del usuario actual
   * 
   * @description
   * Obtiene las categorías que el usuario ha seleccionado como
   * sus áreas de interés (máximo 3).
   */
  async loadUserCategories() {
    try {
      const response = await this.apiService.getPreferredCategories().toPromise();
      if (response && response.success && response.data) {
        this.userCategories = response.data;
        this.selectedCategoryIds = this.userCategories.map(cat => cat.id);
      }
    } catch (error) {
      this.logger.error('Error cargando categorías del usuario', error);
    }
  }

  /**
   * Activa el modo de edición de categorías
   * 
   * @description
   * Inicializa el array temporal de categorías seleccionadas
   * con las categorías actuales del usuario.
   */
  enableCategoriesEdit() {
    this.isEditingCategories = true;
    this.categoriesMessage = '';
    // Inicializar con las categorías actuales
    this.selectedCategoryIds = [...this.userCategories.map(cat => cat.id)];
  }

  /**
   * Cancela la edición de categorías y restaura las originales
   */
  cancelCategoriesEdit() {
    this.isEditingCategories = false;
    this.categoriesMessage = '';
    // Restaurar categorías originales
    this.selectedCategoryIds = this.userCategories.map(cat => cat.id);
  }

  /**
   * Alterna la selección de una categoría
   * 
   * @param categoryId - ID de la categoría a alternar
   * 
   * @description
   * Si la categoría está seleccionada, la remueve.
   * Si no está seleccionada y hay espacio (< 3), la agrega.
   */
  toggleCategory(categoryId: number) {
    const index = this.selectedCategoryIds.indexOf(categoryId);
    
    if (index > -1) {
      // Ya está seleccionada, la removemos
      this.selectedCategoryIds.splice(index, 1);
    } else {
      // No está seleccionada, la agregamos si no excede el límite
      if (this.selectedCategoryIds.length < 3) {
        this.selectedCategoryIds.push(categoryId);
      }
    }
  }

  /**
   * Verifica si una categoría está seleccionada
   * 
   * @param categoryId - ID de la categoría a verificar
   * @returns true si la categoría está seleccionada, false en caso contrario
   */
  isCategorySelected(categoryId: number): boolean {
    return this.selectedCategoryIds.includes(categoryId);
  }

  /**
   * Verifica si se pueden agregar más categorías
   * 
   * @returns true si se pueden agregar más (< 3), false si ya tiene 3
   */
  canAddMoreCategories(): boolean {
    return this.selectedCategoryIds.length < 3;
  }

  /**
   * Verifica si la selección de categorías es válida
   * 
   * @returns true si hay entre 1 y 3 categorías seleccionadas
   */
  areCategoriesValid(): boolean {
    return this.selectedCategoryIds.length >= 1 && this.selectedCategoryIds.length <= 3;
  }

  /**
   * Guarda las categorías preferidas del usuario
   * 
   * @description
   * Valida que haya entre 1 y 3 categorías seleccionadas,
   * envía la actualización al backend y recarga las categorías del usuario.
   */
  async saveCategories() {
    if (!this.areCategoriesValid()) {
      this.categoriesSuccess = false;
      this.categoriesMessage = 'Debes seleccionar entre 1 y 3 categorías';
      return;
    }

    this.isLoadingCategories = true;
    this.categoriesMessage = '';

    try {
      const response = await this.apiService.updatePreferredCategories(this.selectedCategoryIds).toPromise();
      
      if (response && response.success) {
        this.categoriesSuccess = true;
        this.categoriesMessage = 'Categorías actualizadas correctamente';
        this.isEditingCategories = false;
        
        // Actualizar categorías del usuario
        if (response.data) {
          this.userCategories = response.data;
        }
        
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => {
          this.categoriesMessage = '';
          this.categoriesSuccess = false;
        }, 3000);
      }
    } catch (error: any) {
      this.categoriesSuccess = false;
      this.categoriesMessage = error.message || 'Error al actualizar las categorías';
    } finally {
      this.isLoadingCategories = false;
    }
  }

  // ==================== UTILIDADES ====================

  /**
   * Marca todos los campos de un formulario como tocados
   * 
   * @param formGroup - FormGroup cuyos campos se marcarán como tocados
   * 
   * @description
   * Útil para mostrar errores de validación cuando el usuario
   * intenta enviar un formulario inválido.
   */
  markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Obtiene el mensaje de error para un campo específico del formulario
   * 
   * @param formGroup - FormGroup que contiene el campo
   * @param fieldName - Nombre del campo a validar
   * @returns Mensaje de error localizado o string vacío si no hay error
   * 
   * @description
   * Traduce los errores de validación de Angular a mensajes
   * amigables en español.
   */
  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field?.touched && field?.errors) {
      if (field.errors['required']) return `Este campo es obligatorio`;
      if (field.errors['email']) return `Ingresa un email válido`;
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
      if (field.errors['pattern']) return `Formato no válido`;
      if (field.errors['passwordMismatch']) return `Las contraseñas no coinciden`;
    }
    return '';
  }

  /**
   * Sanitiza el HTML del icono de categoría para renderizar SVG de forma segura
   */
  getSafeHtml(html: string | undefined): SafeHtml {
    if (!html) {
      const defaultIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';
      return this.sanitizer.bypassSecurityTrustHtml(defaultIcon);
    }
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

}