import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

interface Category {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string;
  colorHex: string;
}

interface ProjectType {
  value: string;
  label: string;
  category: string;
}

@Component({
  selector: 'app-upload-project',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './upload-project.component.html',
  styleUrls: ['./upload-project.component.css']
})
export class UploadProjectComponent implements OnInit {
  
  uploadForm: FormGroup;
  categories: Category[] = [];
  projectTypes: ProjectType[] = [];
  selectedProjectType: ProjectType | null = null;
  showProjectTypesModal = false;
  isLoading = false;
  isSubmitting = false;
  currentUser: User | null = null;
  
  // Archivos
  selectedFiles: File[] = [];
  selectedImages: File[] = [];
  imagePreviewUrls: string[] = [];
  filesRequired = false;
  
  // Stepper
  currentStep = 1;
  maxSteps = 3;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.uploadForm = this.fb.group({
      // Información básica
      titulo: ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', [Validators.required, Validators.minLength(20)]],
      precio: ['', [Validators.required, Validators.min(1)]],
      tipo: ['', [Validators.required]], // Agregar campo tipo
      categoryId: ['', [Validators.required]],
      university: ['', [Validators.required]],
      subject: ['', [Validators.required]],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2030)]],
      tags: [''] // Agregar tags al FormGroup
    });
  }

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

    this.loadCategories();
    this.loadProjectTypes();
  }

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

  // Navegación entre pasos
  nextStep(): void {
    if (this.currentStep < this.maxSteps) {
      if (this.currentStep === 1 && this.isStep1Valid()) {
        this.currentStep++;
      } else if (this.currentStep === 2 && this.isStep2Valid()) {
        this.currentStep++;
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  isStep1Valid(): boolean {
    const step1Controls = ['titulo', 'descripcion', 'precio', 'categoryId', 'university', 'subject', 'year'];
    return step1Controls.every(control => this.uploadForm.get(control)?.valid);
  }

  isStep2Valid(): boolean {
    return this.selectedFiles.length > 0 || this.selectedImages.length > 0;
  }

  // Manejo de archivos
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

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.filesRequired = this.selectedFiles.length === 0 && this.selectedImages.length === 0;
  }

  removeImage(index: number): void {
    this.selectedImages.splice(index, 1);
    this.imagePreviewUrls.splice(index, 1);
  }

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  resetForm(): void {
    this.uploadForm.reset();
    this.selectedFiles = [];
    this.selectedImages = [];
    this.imagePreviewUrls = [];
    this.filesRequired = false;
    this.currentStep = 1;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  getCategoryIcon(categoria: Category): string {
    return categoria.icono || '📁';
  }

  getCategoryStyle(categoria: Category): any {
    return {
      'border-color': categoria.colorHex,
      'color': categoria.colorHex
    };
  }

  goBack(): void {
    this.router.navigate(['/vender']);
  }

  // Getters para validación en template
  get titulo() { return this.uploadForm.get('titulo'); }
  get descripcion() { return this.uploadForm.get('descripcion'); }
  get precio() { return this.uploadForm.get('precio'); }
  get tipo() { return this.uploadForm.get('tipo'); }
  get categoryId() { return this.uploadForm.get('categoryId'); }
  get university() { return this.uploadForm.get('university'); }
  get subject() { return this.uploadForm.get('subject'); }
  get year() { return this.uploadForm.get('year'); }

  // Métodos para el modal de tipos de proyecto
  openProjectTypesModal(): void {
    this.showProjectTypesModal = true;
  }

  closeProjectTypesModal(): void {
    this.showProjectTypesModal = false;
  }

  selectProjectType(type: ProjectType): void {
    this.selectedProjectType = type;
  }

  confirmProjectTypeSelection(): void {
    if (this.selectedProjectType) {
      this.uploadForm.patchValue({ tipo: this.selectedProjectType.value });
      this.closeProjectTypesModal();
    }
  }

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
}