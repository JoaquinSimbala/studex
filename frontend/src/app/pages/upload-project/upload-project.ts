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
import { AuthService, User } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { BackButtonComponent } from '../../components/back-button/back-button.component';

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
    private notificationService: NotificationService
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
            console.log('Usuario no autenticado, redirigiendo a login');
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
          console.log('Categorías cargadas:', this.categories.length);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
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
          console.log('Tipos de proyecto cargados:', this.projectTypes.length);
          
          // Si ya hay un tipo seleccionado en el formulario, encontrarlo
          const currentTipo = this.uploadForm.get('tipo')?.value;
          if (currentTipo) {
            this.selectedProjectType = this.projectTypes.find(type => type.value === currentTipo) || null;
          }
        }
      },
      error: (error) => {
        console.error('Error cargando tipos de proyecto:', error);
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
      console.log('Valor directo del campo tags:', tagsInput);
      console.log('Tipo del valor tags:', typeof tagsInput);
      
      const tagsArray = tagsInput
        .split(',')
        .map((tag: string) => tag.trim().toLowerCase())
        .filter((tag: string) => tag.length > 0);
      
      formData.append('tags', JSON.stringify(tagsArray));
      console.log('Tags procesados final:', tagsArray);
      
      // Agregar archivos del proyecto
      this.selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      
      // Agregar imágenes
      this.selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      console.log('Enviando proyecto con archivos...');

      this.http.post<any>('http://localhost:3000/api/projects/upload-with-files', formData).subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Proyecto creado:', response.data);
            
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
          console.error('Error subiendo proyecto:', error);
          
          // Notificación elegante de error
          this.notificationService.showError(
            '❌ Error al subir proyecto',
            'Hubo un problema al subir tu proyecto. Por favor, verifica tu conexión e intenta nuevamente.'
          );
          
          this.isSubmitting = false;
        }
      });
    } else {
      console.log('Formulario inválido o faltan archivos');
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
   * Obtiene el icono emoji de una categoría.
   * Retorna un icono por defecto si la categoría no tiene icono definido.
   * 
   * @param {Category} categoria - Categoría de la cual obtener el icono
   * @returns {string} Emoji representativo de la categoría (default: 📁)
   */
  getCategoryIcon(categoria: Category): string {
    return categoria.icono || '📁';
  }

  /**
   * ⚠️ MÉTODO NO UTILIZADO - Marcado para revisión
   * 
   * Retorna estilos CSS para aplicar a elementos de categoría.
   * Este método fue creado pero no se está usando en el template HTML.
   * 
   * @deprecated No se utiliza actualmente en la UI
   * @param {Category} categoria - Categoría de la cual obtener estilos
   * @returns {any} Objeto con propiedades CSS
   */
  /* CÓDIGO NO UTILIZADO - COMENTADO PARA REFERENCIA
  getCategoryStyle(categoria: Category): any {
    return {
      'border-color': categoria.colorHex,
      'color': categoria.colorHex
    };
  }
  */

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
   * Selecciona temporalmente un tipo de proyecto en el modal.
   * La selección no se aplica al formulario hasta que el usuario confirme.
   * 
   * @param {ProjectType} type - Tipo de proyecto seleccionado
   * @returns {void}
   */
  selectProjectType(type: ProjectType): void {
    this.selectedProjectType = type;
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
   * Obtiene el emoji representativo para un tipo de proyecto específico.
   * Cada tipo de proyecto tiene un icono único que lo identifica visualmente.
   * 
   * @param {ProjectType} type - Tipo de proyecto
   * @returns {string} Emoji correspondiente al tipo (default: 📄)
   */
  getProjectTypeIcon(type: ProjectType): string {
    const icons: { [key: string]: string } = {
      'MANUAL_GUIA': '📖',
      'TUTORIAL_CURSO': '🎓',
      'DOCUMENTACION': '📋',
      'PLANTILLA_TEMPLATE': '📝',
      'SISTEMA_APLICACION': '💻',
      'CODIGO_FUENTE': '⚡',
      'BASE_DATOS': '🗄️',
      'API_SERVICIO': '🔌',
      'PLAN_NEGOCIO': '💼',
      'ANALISIS_CASO': '📊',
      'INVESTIGACION_ESTUDIO': '🔬',
      'ANALISIS_MERCADO': '📈',
      'DISEÑO_GRAFICO': '🎨',
      'PRESENTACION': '🖼️',
      'VIDEO_AUDIO': '🎥',
      'MATERIAL_VISUAL': '📱',
      'HOJA_CALCULO': '📊',
      'FORMULARIO_FORMATO': '📄',
      'OTRO': '❓'
    };
    return icons[type.value] || '📄';
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
      'OTRO': 'Otros tipos de contenido no clasificados en las categorías anteriores'
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
   * Selecciona temporalmente una categoría en el modal.
   * La selección no se aplica al formulario hasta que el usuario confirme.
   * 
   * @param {Category} category - Categoría seleccionada
   * @returns {void}
   */
  selectCategory(category: Category): void {
    this.selectedCategory = category;
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

