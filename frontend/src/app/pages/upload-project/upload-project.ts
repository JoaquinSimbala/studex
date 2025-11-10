/**
 * @fileoverview Componente para la subida de proyectos académicos al marketplace de STUDEX.
 * Implementa un formulario multi-paso con validación, gestión de archivos y modales interactivos.
 * 
 * @author STUDEX Team
 * @version 1.0.0
 * @since 2025-11-03
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService, User } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { BackButtonComponent } from '../../components/back-button/back-button.component';
import { LoggerService } from '../../services/logger.service';

/**
 * Interfaz que define la estructura de una categoría de proyecto.
 * @interface Category
 */
interface Category {
  /** ID único de la categoría */
  id: number;
  /** Nombre descriptivo de la categoría */
  nombre: string;
  /** Descripción detallada de la categoría */
  descripcion: string;
  /** Emoji o icono representativo */
  icono: string;
  /** Color hexadecimal para la UI (ej: #FF5733) */
  colorHex: string;
}

/**
 * Interfaz que define la estructura de un tipo de proyecto.
 * @interface ProjectType
 */
interface ProjectType {
  /** Valor único del tipo (ej: 'BASE_DATOS', 'CODIGO_FUENTE') */
  value: string;
  /** Etiqueta legible para mostrar en UI */
  label: string;
  /** Categoría a la que pertenece este tipo */
  category: string;
}

/**
 * Componente principal para la subida de proyectos académicos.
 * 
 * Funcionalidades principales:
 * - Formulario reactivo multi-paso (3 pasos: Información básica, Archivos, Revisión)
 * - Validación en tiempo real de campos
 * - Gestión de archivos e imágenes con preview
 * - Modales interactivos para selección de categorías y tipos de proyecto
 * - Integración con servicios de autenticación y notificaciones
 * - Carga de datos desde API (categorías y tipos de proyecto)
 * 
 * @class UploadProjectComponent
 * @implements {OnInit}
 */
@Component({
  selector: 'app-upload-project',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, BackButtonComponent],
  templateUrl: './upload-project.html',
  styleUrls: ['./upload-project.scss']
})
export class UploadProjectComponent implements OnInit {
  
  // ========================================
  // PROPIEDADES DEL FORMULARIO
  // ========================================
  
  /** Formulario reactivo principal con todos los campos del proyecto */
  uploadForm: FormGroup;
  
  /** Lista de categorías cargadas desde la base de datos */
  categories: Category[] = [];
  
  /** Lista de tipos de proyecto cargados desde la base de datos */
  projectTypes: ProjectType[] = [];
  
  /** Tipo de proyecto seleccionado actualmente */
  selectedProjectType: ProjectType | null = null;
  
  /** Categoría seleccionada actualmente */
  selectedCategory: Category | null = null;
  
  // ========================================
  // PROPIEDADES DE MODALES
  // ========================================
  
  /** Controla la visibilidad del modal de tipos de proyecto */
  showProjectTypesModal = false;
  
  /** Controla la visibilidad del modal de categorías */
  showCategoriesModal = false;
  
  // ========================================
  // PROPIEDADES DE ESTADO
  // ========================================
  
  /** Indica si se están cargando datos (categorías) */
  isLoading = false;
  
  /** Indica si el formulario está en proceso de envío */
  isSubmitting = false;
  
  /** Usuario autenticado actual */
  currentUser: User | null = null;
  
  // ========================================
  // PROPIEDADES DE ARCHIVOS
  // ========================================
  
  /** Array de archivos del proyecto seleccionados (PDFs, DOCs, etc.) */
  selectedFiles: File[] = [];
  
  /** Array de imágenes seleccionadas (portadas, capturas) */
  selectedImages: File[] = [];
  
  /** URLs de previsualización de las imágenes seleccionadas */
  imagePreviewUrls: string[] = [];
  
  /** Indica si se requiere al menos un archivo (usado en validación) */
  filesRequired = false;
  
  /** Indica si el usuario ha aceptado los términos de publicación */
  termsAccepted = false;
  
  // ========================================
  // PROPIEDADES DEL STEPPER
  // ========================================
  
  /** Paso actual del formulario (1, 2 o 3) */
  currentStep = 1;
  
  /** Número máximo de pasos */
  maxSteps = 3;

  /**
   * Constructor del componente.
   * Inicializa el formulario reactivo con todos sus campos y validaciones.
   * 
   * @param {FormBuilder} fb - Constructor de formularios reactivos de Angular
   * @param {HttpClient} http - Cliente HTTP para llamadas a la API
   * @param {Router} router - Servicio de navegación entre rutas
   * @param {AuthService} authService - Servicio de autenticación de usuarios
   * @param {NotificationService} notificationService - Servicio para mostrar notificaciones toast
   */
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private sanitizer: DomSanitizer,
    private logger: LoggerService
  ) {
    // Inicialización del formulario con validadores
    this.uploadForm = this.fb.group({
      // Información básica del proyecto
      titulo: ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', [Validators.required, Validators.minLength(20)]],
      precio: ['', [Validators.required, Validators.min(1)]],
      tipo: ['', [Validators.required]],
      categoryId: ['', [Validators.required]],
      university: ['', [Validators.required]],
      subject: ['', [Validators.required]],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2030)]],
      tags: [''] // Tags separados por comas
    });
  }

  /**
   * Hook de inicialización del componente.
   * Se ejecuta después de la construcción del componente.
   * 
   * Tareas realizadas:
   * - Verifica autenticación del usuario
   * - Redirige a login si no está autenticado
   * - Carga categorías y tipos de proyecto desde la API
   * 
   * @returns {void}
   */
  ngOnInit(): void {
    // Verificar autenticación solo después de que AuthService esté inicializado
    this.authService.isInitialized$.subscribe(initialized => {
      if (initialized) {
        this.authService.currentUser$.subscribe(user => {
          this.currentUser = user;
          if (!user) {
            this.logger.warn('Usuario no autenticado, redirigiendo a login');
            this.router.navigate(['/login']);
            return;
          }
        });
      }
    });

    // Cargar datos iniciales
    this.loadCategories();
    this.loadProjectTypes();
  }

  // ========================================
  // MÉTODOS DE CARGA DE DATOS
  // ========================================

  /**
   * Carga las categorías disponibles desde la API.
   * Actualiza la propiedad `categories` con los datos obtenidos.
   * Muestra estado de carga mientras se realiza la petición.
   * 
   * @returns {void}
   */
  loadCategories(): void {
    this.isLoading = true;
    this.http.get<any>('http://localhost:3000/api/categories').subscribe({
      next: (response) => {
        if (response.success) {
          this.categories = response.data;
          this.logger.debug('Categorías cargadas', this.categories.length);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.logger.error('Error cargando categorías', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Carga los tipos de proyecto disponibles desde la API.
   * Si hay un tipo previamente seleccionado en el formulario, lo restaura.
   * En caso de error, proporciona un tipo de proyecto por defecto.
   * 
   * @returns {void}
   */
  loadProjectTypes(): void {
    this.http.get<any>('http://localhost:3000/api/projects/types').subscribe({
      next: (response) => {
        if (response.success) {
          this.projectTypes = response.data;
          this.logger.debug('Tipos de proyecto cargados', this.projectTypes.length);
          
          // Si ya hay un tipo seleccionado en el formulario, encontrarlo
          const currentTipo = this.uploadForm.get('tipo')?.value;
          if (currentTipo) {
            this.selectedProjectType = this.projectTypes.find(type => type.value === currentTipo) || null;
          }
        }
      },
      error: (error) => {
        this.logger.error('Error cargando tipos de proyecto', error);
        // En caso de error, usar tipos por defecto
        this.projectTypes = [
          { value: 'OTRO', label: 'Otro', category: 'Otros formatos' }
        ];
      }
    });
  }

  // ========================================
  // MÉTODOS DE ENVÍO Y VALIDACIÓN
  // ========================================

  /**
   * Maneja el envío del formulario.
   * En los pasos 1 y 2, avanza al siguiente paso.
   * En el paso 3, envía el proyecto completo a la API.
   * 
   * Validaciones realizadas:
   * - Autenticación del usuario
   * - Validez del formulario
   * - Presencia de al menos un archivo o imagen
   * 
   * @returns {void}
   */
  onSubmit(): void {
    if (this.currentStep < this.maxSteps) {
      this.nextStep();
      return;
    }

    // Validar autenticación
    if (!this.currentUser) {
      this.notificationService.showWarning(
        '🔐 Autenticación requerida',
        'Debes iniciar sesión para subir proyectos.'
      );
      this.router.navigate(['/login']);
      return;
    }

    // Validar todo antes de enviar
    this.filesRequired = this.selectedFiles.length === 0;
    
    if (this.uploadForm.valid && (this.selectedFiles.length > 0 || this.selectedImages.length > 0)) {
      this.isSubmitting = true;
      
      const formData = new FormData();
      
      // Agregar datos del formulario
      formData.append('titulo', this.uploadForm.get('titulo')?.value);
      formData.append('descripcion', this.uploadForm.get('descripcion')?.value);
      formData.append('precio', this.uploadForm.get('precio')?.value);
      formData.append('tipo', this.uploadForm.get('tipo')?.value);
      formData.append('categoryId', this.uploadForm.get('categoryId')?.value);
      formData.append('university', this.uploadForm.get('university')?.value);
      formData.append('subject', this.uploadForm.get('subject')?.value);
      formData.append('year', this.uploadForm.get('year')?.value);
      formData.append('userId', this.currentUser.id.toString());
      
      // Procesar tags desde el formulario (separados por comas)
      const tagsInput = this.uploadForm.get('tags')?.value || '';
      this.logger.debug('Valor del campo tags', { tipo: typeof tagsInput });
      
      const tagsArray = tagsInput
        .split(',')
        .map((tag: string) => tag.trim().toLowerCase())
        .filter((tag: string) => tag.length > 0);
      
      formData.append('tags', JSON.stringify(tagsArray));
      this.logger.debug('Tags procesados', tagsArray.length);
      
      // Agregar archivos del proyecto
      this.selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      
      // Agregar imágenes
      this.selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      this.logger.debug('Enviando proyecto con archivos');

      this.http.post<any>('http://localhost:3000/api/projects/upload-with-files', formData).subscribe({
        next: (response) => {
          if (response.success) {
            this.logger.success('Proyecto creado exitosamente');
            
            // Notificación elegante de éxito
            this.notificationService.showSuccess(
              '🎉 ¡Proyecto subido!',
              `Tu proyecto "${this.uploadForm.get('titulo')?.value}" se ha publicado correctamente y ya está disponible para la venta.`
            );
            
            this.resetForm();
            this.router.navigate(['/vendedor/mis-proyectos']);
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          this.logger.error('Error subiendo proyecto', error);
          
          // Notificación elegante de error
          this.notificationService.showError(
            '❌ Error al subir proyecto',
            'Hubo un problema al subir tu proyecto. Por favor, verifica tu conexión e intenta nuevamente.'
          );
          
          this.isSubmitting = false;
        }
      });
    } else {
      this.logger.warn('Formulario inválido o faltan archivos');
      this.markFormGroupTouched(this.uploadForm);
      this.filesRequired = this.selectedFiles.length === 0 && this.selectedImages.length === 0;
    }
  }

  // ========================================
  // MÉTODOS DE NAVEGACIÓN ENTRE PASOS
  // ========================================

  /**
   * Avanza al siguiente paso del formulario si las validaciones son correctas.
   * 
   * Paso 1 → Paso 2: Valida información básica (isStep1Valid)
   * Paso 2 → Paso 3: Valida archivos (isStep2Valid)
   * 
   * @returns {void}
   */
  nextStep(): void {
    if (this.currentStep < this.maxSteps) {
      if (this.currentStep === 1 && this.isStep1Valid()) {
        this.currentStep++;
      } else if (this.currentStep === 2 && this.isStep2Valid()) {
        this.currentStep++;
      }
    }
  }

  /**
   * Retrocede al paso anterior del formulario.
   * No permite retroceder más allá del paso 1.
   * 
   * @returns {void}
   */
  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  /**
   * Valida que todos los campos del paso 1 sean válidos.
   * 
   * Campos validados:
   * - titulo, descripcion, precio, categoryId, university, subject, year
   * 
   * @returns {boolean} true si todos los campos del paso 1 son válidos
   */
  isStep1Valid(): boolean {
    const step1Controls = ['titulo', 'descripcion', 'precio', 'categoryId', 'university', 'subject', 'year'];
    return step1Controls.every(control => this.uploadForm.get(control)?.valid);
  }

  /**
   * Valida que el paso 2 tenga al menos un archivo o imagen.
   * 
   * @returns {boolean} true si hay archivos o imágenes seleccionados
   */
  isStep2Valid(): boolean {
    return this.selectedFiles.length > 0 || this.selectedImages.length > 0;
  }

  /**
   * Valida que el usuario haya aceptado los términos de publicación.
   * 
   * @returns {boolean} true si los términos han sido aceptados
   */
  isStep3Valid(): boolean {
    return this.termsAccepted;
  }

  // ========================================
  // MÉTODOS DE GESTIÓN DE ARCHIVOS
  // ========================================

  /**
   * Maneja la selección de archivos del proyecto (PDFs, DOCs, etc.).
   * 
   * Validaciones:
   * - Máximo 5 archivos por proyecto
   * - Tamaño máximo 49MB por archivo
   * 
   * @param {Event} event - Evento del input file
   * @returns {void}
   */
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      
      // Validar límite de archivos
      if (this.selectedFiles.length + files.length > 5) {
        this.notificationService.showWarning(
          '📁 Límite de archivos',
          'Máximo 5 archivos permitidos por proyecto.'
        );
        return;
      }

      // Validar tamaño total (49MB por archivo)
      const maxSize = 49 * 1024 * 1024; // 49MB
      const invalidFiles = files.filter(file => file.size > maxSize);
      
      if (invalidFiles.length > 0) {
        this.notificationService.showError(
          '📦 Archivos muy grandes',
          `Los siguientes archivos superan el límite de 49MB: ${invalidFiles.map(f => f.name).join(', ')}`
        );
        return;
      }

      this.selectedFiles = [...this.selectedFiles, ...files.filter(file => file.size <= maxSize)];
      this.filesRequired = false;
    }
  }

  /**
   * Maneja la selección de imágenes del proyecto.
   * 
   * Validaciones:
   * - Máximo 5 imágenes por proyecto
   * - Solo archivos de tipo imagen
   * - Tamaño máximo 49MB por imagen
   * - Crea previsualizaciones automáticas con FileReader
   * 
   * @param {Event} event - Evento del input file
   * @returns {void}
   */
  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      
      // Validar límite de imágenes
      if (this.selectedImages.length + files.length > 5) {
        this.notificationService.showWarning(
          '🖼️ Límite de imágenes',
          'Máximo 5 imágenes permitidas por proyecto.'
        );
        return;
      }

      files.forEach(file => {
        // Validar que sea imagen
        if (!file.type.startsWith('image/')) {
          this.notificationService.showError(
            '🚫 Formato inválido',
            `${file.name} no es una imagen válida. Solo se permiten archivos de imagen.`
          );
          return;
        }

        // Validar tamaño
        const maxSize = 49 * 1024 * 1024; // 49MB
        if (file.size > maxSize) {
          this.notificationService.showError(
            '📦 Imagen muy grande',
            `${file.name} supera el límite de 49MB.`
          );
          return;
        }

        this.selectedImages.push(file);
        
        // Crear vista previa
        const reader = new FileReader();
        reader.onload = (e) => {
          this.imagePreviewUrls.push(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  /**
   * Elimina un archivo de la lista de archivos seleccionados.
   * Actualiza el flag filesRequired si no quedan archivos ni imágenes.
   * 
   * @param {number} index - Índice del archivo a eliminar en el array selectedFiles
   * @returns {void}
   */
  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.filesRequired = this.selectedFiles.length === 0 && this.selectedImages.length === 0;
  }

  /**
   * Elimina una imagen de la lista de imágenes seleccionadas.
   * También elimina su URL de previsualización correspondiente.
   * 
   * @param {number} index - Índice de la imagen a eliminar en el array selectedImages
   * @returns {void}
   */
  removeImage(index: number): void {
    this.selectedImages.splice(index, 1);
    this.imagePreviewUrls.splice(index, 1);
  }

  /**
   * Convierte el tamaño de un archivo en bytes a formato legible (KB, MB, GB).
   * 
   * @param {number} bytes - Tamaño del archivo en bytes
   * @returns {string} Tamaño formateado con unidad (ej: "2.5 MB", "1.2 GB")
   * 
   * @example
   * getFileSize(1024) // "1 KB"
   * getFileSize(1048576) // "1 MB"
   * getFileSize(2621440) // "2.5 MB"
   */
  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Reinicia completamente el formulario y limpia todos los archivos.
   * Se usa después de un envío exitoso o para cancelar la operación.
   * 
   * Acciones realizadas:
   * - Resetea todos los campos del formulario a sus valores iniciales
   * - Limpia arrays de archivos e imágenes
   * - Elimina URLs de previsualización
   * - Resetea flags de validación
   * - Vuelve al paso 1
   * 
   * @returns {void}
   */
  resetForm(): void {
    this.uploadForm.reset();
    this.selectedFiles = [];
    this.selectedImages = [];
    this.imagePreviewUrls = [];
    this.filesRequired = false;
    this.termsAccepted = false;
    this.currentStep = 1;
  }

  /**
   * Marca todos los campos de un FormGroup como touched.
   * Útil para mostrar mensajes de validación cuando el usuario intenta enviar.
   * 
   * @private
   * @param {FormGroup} formGroup - FormGroup cuyos controles se marcarán como touched
   * @returns {void}
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  // ========================================
  // MÉTODOS DE UTILIDAD PARA CATEGORÍAS
  // ========================================

  /**
   * Sanitiza el HTML del icono de categoría para renderizar SVG de forma segura.
   * 
   * @description
   * Convierte el string SVG en SafeHtml para que Angular lo renderice correctamente.
   * Si no hay icono, retorna un icono de carpeta por defecto.
   * 
   * @param {string | undefined} html - String con el markup SVG del icono
   * @returns {SafeHtml} HTML sanitizado que Angular puede renderizar
   */
  getSafeHtml(html: string | undefined): SafeHtml {
    if (!html) {
      const defaultIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';
      return this.sanitizer.bypassSecurityTrustHtml(defaultIcon);
    }
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // ========================================
  // GETTERS PARA VALIDACIÓN EN TEMPLATE
  // ========================================

  /** 
   * Getter para acceder al control 'titulo' del formulario.
   * @returns {AbstractControl | null} Control del campo titulo
   */
  get titulo() { return this.uploadForm.get('titulo'); }
  
  /** 
   * Getter para acceder al control 'descripcion' del formulario.
   * @returns {AbstractControl | null} Control del campo descripcion
   */
  get descripcion() { return this.uploadForm.get('descripcion'); }
  
  /** 
   * Getter para acceder al control 'precio' del formulario.
   * @returns {AbstractControl | null} Control del campo precio
   */
  get precio() { return this.uploadForm.get('precio'); }
  
  /** 
   * Getter para acceder al control 'tipo' del formulario.
   * @returns {AbstractControl | null} Control del campo tipo
   */
  get tipo() { return this.uploadForm.get('tipo'); }
  
  /** 
   * Getter para acceder al control 'categoryId' del formulario.
   * @returns {AbstractControl | null} Control del campo categoryId
   */
  get categoryId() { return this.uploadForm.get('categoryId'); }
  
  /** 
   * Getter para acceder al control 'university' del formulario.
   * @returns {AbstractControl | null} Control del campo university
   */
  get university() { return this.uploadForm.get('university'); }
  
  /** 
   * Getter para acceder al control 'subject' del formulario.
   * @returns {AbstractControl | null} Control del campo subject
   */
  get subject() { return this.uploadForm.get('subject'); }
  
  /** 
   * Getter para acceder al control 'year' del formulario.
   * @returns {AbstractControl | null} Control del campo year
   */
  get year() { return this.uploadForm.get('year'); }

  // ========================================
  // MÉTODOS DEL MODAL DE TIPOS DE PROYECTO
  // ========================================

  /**
   * Abre el modal de selección de tipos de proyecto.
   * Muestra todos los tipos disponibles organizados por categoría.
   * 
   * @returns {void}
   */
  openProjectTypesModal(): void {
    this.showProjectTypesModal = true;
  }

  /**
   * Cierra el modal de selección de tipos de proyecto.
   * No guarda cambios si el usuario no ha confirmado la selección.
   * 
   * @returns {void}
   */
  closeProjectTypesModal(): void {
    this.showProjectTypesModal = false;
  }

  /**
   * Selecciona un tipo de proyecto del modal.
   * Ahora confirma automáticamente la selección y cierra el modal.
   * 
   * @param {ProjectType} type - Tipo de proyecto seleccionado
   * @returns {void}
   */
  selectProjectType(type: ProjectType): void {
    this.selectedProjectType = type;
    // Confirmación automática
    this.uploadForm.patchValue({ tipo: type.value });
    this.closeProjectTypesModal();
  }

  /**
   * Confirma la selección del tipo de proyecto.
   * Actualiza el formulario con el valor seleccionado y cierra el modal.
   * 
   * @returns {void}
   */
  confirmProjectTypeSelection(): void {
    if (this.selectedProjectType) {
      this.uploadForm.patchValue({ tipo: this.selectedProjectType.value });
      this.closeProjectTypesModal();
    }
  }

  /**
   * Agrupa los tipos de proyecto por categoría.
   * Útil para mostrar tipos organizados en secciones en el modal.
   * 
   * @returns {Array<{category: string, types: ProjectType[]}>} Array de objetos con categoría y sus tipos
   * 
   * @example
   * // Retorna algo como:
   * [
   *   { category: "Desarrollo y tecnología", types: [tipo1, tipo2] },
   *   { category: "Investigación", types: [tipo3, tipo4] }
   * ]
   */
  getProjectTypesByCategory(): any[] {
    const categories = new Map<string, ProjectType[]>();
    
    this.projectTypes.forEach(type => {
      if (!categories.has(type.category)) {
        categories.set(type.category, []);
      }
      categories.get(type.category)!.push(type);
    });

    return Array.from(categories.entries()).map(([category, types]) => ({
      category,
      types
    }));
  }

  /**
   * Obtiene el icono SVG representativo para un tipo de proyecto específico.
   * Cada tipo de proyecto tiene un icono único que lo identifica visualmente.
   * 
   * @param {ProjectType} type - Tipo de proyecto
   * @returns {string} Nombre del icono SVG correspondiente al tipo (default: 'document')
   */
  getProjectTypeIcon(type: ProjectType): string {
    const icons: { [key: string]: string } = {
      'MANUAL_GUIA': 'book-open',
      'TUTORIAL_CURSO': 'academic-cap',
      'DOCUMENTACION': 'clipboard-list',
      'PLANTILLA_TEMPLATE': 'document-text',
      'SISTEMA_APLICACION': 'desktop-computer',
      'CODIGO_FUENTE': 'code',
      'BASE_DATOS': 'database',
      'API_SERVICIO': 'server',
      'PLAN_NEGOCIO': 'briefcase',
      'ANALISIS_CASO': 'chart-bar',
      'INVESTIGACION_ESTUDIO': 'beaker',
      'ANALISIS_MERCADO': 'trending-up',
      'DISEÑO_GRAFICO': 'color-swatch',
      'PRESENTACION': 'presentation-chart-bar',
      'VIDEO_AUDIO': 'film',
      'MATERIAL_VISUAL': 'photograph',
      'HOJA_CALCULO': 'table',
      'FORMULARIO_FORMATO': 'document',
      'OTRO': 'question-mark-circle'
    };
    return icons[type.value] || 'document';
  }

  /**
   * Obtiene el path SVG para renderizar el icono del tipo de proyecto.
   * 
   * @param {string} iconName - Nombre del icono
   * @returns {string} Path SVG del icono
   */
  getIconSvgPath(iconName: string): string {
    const svgPaths: { [key: string]: string } = {
      'book-open': 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      'academic-cap': 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222',
      'clipboard-list': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      'document-text': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'desktop-computer': 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      'code': 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
      'database': 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
      'server': 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
      'briefcase': 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      'chart-bar': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      'beaker': 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
      'trending-up': 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      'color-swatch': 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
      'presentation-chart-bar': 'M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
      'film': 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z',
      'photograph': 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
      'table': 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      'document': 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      'question-mark-circle': 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    };
    return svgPaths[iconName] || svgPaths['document'];
  }

  /**
   * Obtiene el color del icono según el tipo de proyecto.
   * 
   * @param {ProjectType} type - Tipo de proyecto
   * @returns {string} Clase de color Tailwind para el icono
   */
  getIconColor(type: ProjectType): string {
    const colors: { [key: string]: string } = {
      'MANUAL_GUIA': 'text-blue-600',
      'TUTORIAL_CURSO': 'text-purple-600',
      'DOCUMENTACION': 'text-gray-600',
      'PLANTILLA_TEMPLATE': 'text-indigo-600',
      'SISTEMA_APLICACION': 'text-cyan-600',
      'CODIGO_FUENTE': 'text-yellow-600',
      'BASE_DATOS': 'text-green-600',
      'API_SERVICIO': 'text-teal-600',
      'PLAN_NEGOCIO': 'text-orange-600',
      'ANALISIS_CASO': 'text-pink-600',
      'INVESTIGACION_ESTUDIO': 'text-violet-600',
      'ANALISIS_MERCADO': 'text-emerald-600',
      'DISEÑO_GRAFICO': 'text-rose-600',
      'PRESENTACION': 'text-fuchsia-600',
      'VIDEO_AUDIO': 'text-red-600',
      'MATERIAL_VISUAL': 'text-lime-600',
      'HOJA_CALCULO': 'text-sky-600',
      'FORMULARIO_FORMATO': 'text-slate-600',
      'OTRO': 'text-amber-600'
    };
    return colors[type.value] || 'text-studex-600';
  }

  /**
   * Obtiene la descripción detallada de un tipo de proyecto.
   * Proporciona información sobre qué tipo de contenido incluye cada tipo.
   * 
   * @param {ProjectType} type - Tipo de proyecto
   * @returns {string} Descripción detallada del tipo (default: 'Descripción no disponible')
   */
  getProjectTypeDescription(type: ProjectType): string {
    const descriptions: { [key: string]: string } = {
      'MANUAL_GUIA': 'Guías paso a paso, manuales de usuario o instrucciones',
      'TUTORIAL_CURSO': 'Cursos en línea, tutoriales educativos o material formativo',
      'DOCUMENTACION': 'Documentación técnica, especificaciones o reportes',
      'PLANTILLA_TEMPLATE': 'Plantillas reutilizables, formatos o modelos',
      'SISTEMA_APLICACION': 'Aplicaciones web, móviles o software completo',
      'CODIGO_FUENTE': 'Código de programación, scripts o librerías',
      'BASE_DATOS': 'Esquemas de BD, datos estructurados o modelos',
      'API_SERVICIO': 'APIs REST, microservicios o integraciones',
      'PLAN_NEGOCIO': 'Planes estratégicos, modelos de negocio o propuestas',
      'ANALISIS_CASO': 'Estudios de caso, análisis situacionales o evaluaciones',
      'INVESTIGACION_ESTUDIO': 'Investigaciones académicas, estudios científicos o papers',
      'ANALISIS_MERCADO': 'Estudios de mercado, análisis competitivos o tendencias',
      'DISEÑO_GRAFICO': 'Diseños visuales, logotipos, branding o identidad',
      'PRESENTACION': 'Presentaciones, slides o material expositivo',
      'VIDEO_AUDIO': 'Contenido multimedia, podcasts o producciones',
      'MATERIAL_VISUAL': 'Infografías, gráficos, ilustraciones o recursos visuales',
      'HOJA_CALCULO': 'Hojas de cálculo, modelos financieros o análisis de datos',
      'FORMULARIO_FORMATO': 'Formularios, formatos oficiales o documentos estructurados',
      'OTRO': 'Otros tipos de contenido no clasificados en las opciones anteriores'
    };
    return descriptions[type.value] || 'Descripción no disponible';
  }

  // ========================================
  // MÉTODOS DEL MODAL DE CATEGORÍAS
  // ========================================

  /**
   * Abre el modal de selección de categorías.
   * Muestra todas las categorías disponibles con sus iconos y colores.
   * 
   * @returns {void}
   */
  openCategoriesModal(): void {
    this.showCategoriesModal = true;
  }

  /**
   * Cierra el modal de selección de categorías.
   * No guarda cambios si el usuario no ha confirmado la selección.
   * 
   * @returns {void}
   */
  closeCategoriesModal(): void {
    this.showCategoriesModal = false;
  }

  /**
   * Selecciona una categoría en el modal.
   * Ahora confirma automáticamente la selección y cierra el modal.
   * 
   * @param {Category} category - Categoría seleccionada
   * @returns {void}
   */
  selectCategory(category: Category): void {
    this.selectedCategory = category;
    // Confirmación automática
    this.uploadForm.patchValue({ categoryId: category.id });
    this.closeCategoriesModal();
  }

  /**
   * Confirma la selección de la categoría.
   * Actualiza el formulario con el ID de la categoría seleccionada y cierra el modal.
   * 
   * @returns {void}
   */
  confirmCategorySelection(): void {
    if (this.selectedCategory) {
      this.uploadForm.patchValue({ categoryId: this.selectedCategory.id });
      this.closeCategoriesModal();
    }
  }
}

