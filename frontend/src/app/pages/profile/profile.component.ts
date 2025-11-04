import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService, ApiResponse } from '../../services/api.service';
import { BackButtonComponent } from '../../components/back-button/back-button.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  currentUser: User | null = null;
  profileForm: FormGroup;
  passwordForm: FormGroup;
  
  // Categorías
  categories: any[] = [];
  userCategories: any[] = [];
  selectedCategoryIds: number[] = [];
  isEditingCategories = false;
  isLoadingCategories = false;
  categoriesMessage = '';
  categoriesSuccess = false;
  
  // Estados de la aplicación
  isEditingProfile = false;
  isChangingPassword = false;
  isLoadingProfile = false;
  isLoadingPassword = false;
  isUploadingImage = false;
  
  // Mensajes
  profileMessage = '';
  passwordMessage = '';
  imageMessage = '';
  
  // Estados de éxito/error
  profileSuccess = false;
  passwordSuccess = false;
  imageSuccess = false;
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
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

  ngOnInit() {
    this.loadUserProfile();
    this.loadCategories();
    this.loadUserCategories();
  }

  // Cargar datos del usuario
  async loadUserProfile() {
    try {
      this.currentUser = this.authService.getCurrentUser();
      if (this.currentUser) {
        this.profileForm.patchValue({
          firstName: this.currentUser.firstName,
          lastName: this.currentUser.lastName,
          email: this.currentUser.email,
          university: this.currentUser.university || '',
          areaEstudio: this.currentUser.areaEstudio || '',
          descripcion: this.currentUser.descripcion || ''
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  // Validador para confirmar contraseña
  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  // Activar edición de perfil
  enableProfileEdit() {
    this.isEditingProfile = true;
    this.profileMessage = '';
  }

  // Cancelar edición de perfil
  cancelProfileEdit() {
    this.isEditingProfile = false;
    this.loadUserProfile(); // Restaurar valores originales
    this.profileMessage = '';
  }

  // Guardar cambios de perfil
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

  // Activar cambio de contraseña
  enablePasswordChange() {
    this.isChangingPassword = true;
    this.passwordMessage = '';
  }

  // Cancelar cambio de contraseña
  cancelPasswordChange() {
    this.isChangingPassword = false;
    this.passwordForm.reset();
    this.passwordMessage = '';
  }

  // Cambiar contraseña
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

  // Subir imagen de perfil
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
            
            console.log('✅ Usuario actualizado:', updatedUser);
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

  // Obtener URL de imagen de perfil con fallback y cache busting
  getProfileImageUrl(): string {
    if (this.currentUser?.profileImage) {
      // Si la imagen ya tiene timestamp, la usamos tal como está
      if (this.currentUser.profileImage.includes('?t=')) {
        return this.currentUser.profileImage;
      }
      // Si no tiene timestamp, agregamos uno para evitar cache
      const separator = this.currentUser.profileImage.includes('?') ? '&' : '?';
      return `${this.currentUser.profileImage}${separator}t=${Date.now()}`;
    }
    
    if (this.currentUser) {
      return `https://ui-avatars.com/api/?name=${this.currentUser.firstName}+${this.currentUser.lastName}&background=10B981&color=fff&size=128`;
    }
    
    return 'https://ui-avatars.com/api/?name=Usuario&background=10B981&color=fff&size=128';
  }

  // Marcar todos los campos como tocados para mostrar errores
  markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // ==================== GESTIÓN DE CATEGORÍAS ====================

  /**
   * Carga todas las categorías disponibles
   */
  async loadCategories() {
    try {
      const response = await this.apiService.getCategories().toPromise();
      if (response && response.success && response.data) {
        this.categories = response.data;
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  }

  /**
   * Carga las categorías preferidas del usuario
   */
  async loadUserCategories() {
    try {
      const response = await this.apiService.getPreferredCategories().toPromise();
      if (response && response.success && response.data) {
        this.userCategories = response.data;
        this.selectedCategoryIds = this.userCategories.map(cat => cat.id);
      }
    } catch (error) {
      console.error('Error cargando categorías del usuario:', error);
    }
  }

  /**
   * Activa el modo de edición de categorías
   */
  enableCategoriesEdit() {
    this.isEditingCategories = true;
    this.categoriesMessage = '';
    // Inicializar con las categorías actuales
    this.selectedCategoryIds = [...this.userCategories.map(cat => cat.id)];
  }

  /**
   * Cancela la edición de categorías
   */
  cancelCategoriesEdit() {
    this.isEditingCategories = false;
    this.categoriesMessage = '';
    // Restaurar categorías originales
    this.selectedCategoryIds = this.userCategories.map(cat => cat.id);
  }

  /**
   * Alterna la selección de una categoría
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
   */
  isCategorySelected(categoryId: number): boolean {
    return this.selectedCategoryIds.includes(categoryId);
  }

  /**
   * Verifica si se puede agregar más categorías
   */
  canAddMoreCategories(): boolean {
    return this.selectedCategoryIds.length < 3;
  }

  /**
   * Verifica si las categorías son válidas (1-3)
   */
  areCategoriesValid(): boolean {
    return this.selectedCategoryIds.length >= 1 && this.selectedCategoryIds.length <= 3;
  }

  /**
   * Guarda las categorías preferidas del usuario
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

  // ==================== FIN GESTIÓN DE CATEGORÍAS ====================

  // Obtener mensaje de error para un campo
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

}