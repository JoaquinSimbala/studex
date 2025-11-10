import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { PurchaseService, PurchaseRequest } from '../../services/purchase.service';
import { CartService } from '../../services/cart.service';
import { CommentService, ProjectComment } from '../../services/comment.service';
import { PurchaseModalComponent, ProjectSummary } from '../../components/purchase-modal/purchase-modal.component';
import { LoggerService } from '../../services/logger.service';

// ============================================
// INTERFACES
// ============================================

/**
 * Interfaz que define la estructura completa de un proyecto con todos sus detalles.
 */
interface ProjectDetail {
  id: number;
  title: string;
  description: string;
  price: number;
  type: string;
  university: string;
  subject: string;
  year: number;
  status: string;
  views: number;
  downloads: number;
  featured: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  category: {
    id: number;
    nombre: string;
    icono: string;
    colorHex: string;
  };
  seller: {
    id: number;
    name: string;
    university: string;
    rating: number;
    verified: boolean;
  };
  images: ProjectImage[];
  files: ProjectFile[];
}

/**
 * Interfaz para las imágenes asociadas a un proyecto.
 */
interface ProjectImage {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isMain: boolean;
  order: number;
}

/**
 * Interfaz para los archivos descargables de un proyecto.
 */
interface ProjectFile {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  description: string;
  order: number;
}

// ============================================
// COMPONENT
// ============================================

/**
 * Componente para mostrar los detalles completos de un proyecto.
 * 
 * Funcionalidades:
 * - Visualización detallada de proyectos
 * - Zoom y paneo en imágenes
 * - Descarga de archivos (con control de acceso)
 * - Compra de proyectos
 * - Gestión de carrito
 * - Control de permisos y acceso
 * 
 * @component
 */
@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PurchaseModalComponent],
  templateUrl: './project-detail.html',
  styleUrls: ['./project-detail.scss']
})
export class ProjectDetailComponent implements OnInit {
  
  // ============================================
  // PROPERTIES
  // ============================================
  
  projectId: number = 0;
  project: ProjectDetail | null = null;
  selectedImage: ProjectImage | null = null;
  isLoading = true;
  error: string | null = null;
  downloadingFiles: Set<number> = new Set();
  
  // ----------------------------------------
  // Zoom and Pan Controls
  // ----------------------------------------
  
  imageZoom = 1;
  imagePosition = { x: 0, y: 0 };
  isDragging = false;
  dragStart = { x: 0, y: 0 };
  minZoom = 1;
  maxZoom = 3;
  
  // ----------------------------------------
  // Access Control
  // ----------------------------------------
  
  isOwnerView = false;
  isPublicView = false;
  hasAccess = false;
  userHasPurchased = false;
  currentUser: User | null = null;
  justUnlocked = false;

  // ----------------------------------------
  // Purchase & Cart
  // ----------------------------------------
  
  showPurchaseModal = false;
  projectSummary: ProjectSummary | null = null;
  isInCart = false;
  isAddingToCart = false;

  // ----------------------------------------
  // Comments
  // ----------------------------------------
  
  comments: ProjectComment[] = [];
  newCommentContent: string = '';
  isLoadingComments = false;
  isSubmittingComment = false;

  // ============================================
  // CONSTRUCTOR
  // ============================================
  
  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private purchaseService: PurchaseService,
    private cartService: CartService,
    private commentService: CommentService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private logger: LoggerService,
    private sanitizer: DomSanitizer
  ) {}

  // ============================================
  // LIFECYCLE HOOKS
  // ============================================
  
  /**
   * Inicializa el componente, determina el tipo de vista y carga el proyecto.
   */
  ngOnInit(): void {
    const currentUrl = this.router.url;
    this.isOwnerView = currentUrl.includes('/vendedor/proyecto/');
    this.isPublicView = !this.isOwnerView;
    
    this.authService.currentUser$.subscribe((user: User | null) => {
      this.currentUser = user;
      if (this.project) {
        this.checkAccess();
      }
    });

    this.purchaseService.userPurchases$.subscribe(userPurchases => {
      if (this.project) {
        const wasPurchased = userPurchases.projectIds.includes(this.project.id);
        
        if (this.justUnlocked && this.hasAccess) {
          this.logger.debug('Manteniendo estado optimista durante período de gracia');
          return;
        }
        
        this.userHasPurchased = wasPurchased;
        this.checkAccess();
      }
    });

    this.cartService.cart$.subscribe(cartItems => {
      if (this.project) {
        this.isInCart = cartItems.some(item => item.proyecto.id === this.project!.id);
        this.cdr.detectChanges();
      }
    });

    this.route.params.subscribe(params => {
      this.projectId = parseInt(params['id']);
      if (this.projectId) {
        this.loadProject();
        this.loadComments();
      } else {
        this.error = 'ID de proyecto inválido';
      }
    });
  }

  // ============================================
  // PROJECT LOADING
  // ============================================
  
  /**
   * Carga los detalles del proyecto desde el API.
   */
  async loadProject(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await this.apiService.getProjectDetails(this.projectId).toPromise();
      
      if (response?.success && response.data) {
        this.project = response.data as ProjectDetail;
        if (this.project && this.project.images.length > 0) {
          this.selectedImage = this.project.images.find(img => img.isMain) || this.project.images[0];
        }
        
        this.checkAccess();
        this.isInCart = this.cartService.isInCart(this.project.id);
        
        this.logger.debug('Proyecto cargado');
      } else {
        throw new Error(response?.message || 'Error cargando proyecto');
      }
    } catch (error: any) {
      this.logger.error('Error cargando proyecto', error);
      this.error = error?.error?.message || error?.message || 'Error cargando el proyecto';
    } finally {
      this.isLoading = false;
    }
  }

  // ============================================
  // ACCESS CONTROL
  // ============================================
  
  /**
   * Verifica los permisos de acceso del usuario actual al proyecto.
   */
  checkAccess(): void {
    this.logger.debug('Verificando acceso al proyecto');

    if (!this.project || !this.currentUser) {
      this.hasAccess = false;
      this.cdr.detectChanges();
      return;
    }

    if (this.isOwnerView && this.project.seller.id === parseInt(this.currentUser.id)) {
      this.hasAccess = true;
      this.cdr.detectChanges();
      return;
    }

    if (this.isPublicView) {
      const backendSaysHasPurchased = this.purchaseService.hasUserPurchased(this.project.id);
      
      if (this.justUnlocked && this.hasAccess) {
        this.logger.debug('Período de gracia activo - manteniendo acceso');
        this.cdr.detectChanges();
        return;
      }
      
      this.userHasPurchased = backendSaysHasPurchased;
      this.hasAccess = this.userHasPurchased;
      
      this.logger.debug('Verificación de compra completada', { hasAccess: this.hasAccess });
      this.cdr.detectChanges();
      return;
    }

    this.hasAccess = false;
    this.cdr.detectChanges();
  }

  /**
   * Determina si el usuario puede descargar archivos.
   */
  canDownloadFile(): boolean {
    return this.hasAccess;
  }

  /**
   * Determina si se debe mostrar el botón de compra.
   */
  showPurchasePrompt(): boolean {
    return this.isPublicView && !this.hasAccess && this.currentUser !== null;
  }

  /**
   * Determina si se debe mostrar el mensaje de login.
   */
  showLoginPrompt(): boolean {
    return this.isPublicView && !this.currentUser;
  }

  /**
   * Determina si se debe mostrar el botón de carrito.
   */
  shouldShowCartButton(): boolean {
    return this.isPublicView && !!this.currentUser && !this.hasAccess && !this.userHasPurchased;
  }

  // ============================================
  // IMAGE MANAGEMENT
  // ============================================
  
  /**
   * Selecciona una imagen para mostrar en el visor principal.
   */
  selectImage(image: ProjectImage): void {
    this.selectedImage = image;
    this.resetZoom();
  }

  // ============================================
  // ZOOM & PAN
  // ============================================
  
  /**
   * Aumenta el zoom de la imagen.
   */
  zoomIn(): void {
    if (this.imageZoom < this.maxZoom) {
      this.imageZoom = Math.min(this.imageZoom + 0.25, this.maxZoom);
      this.constrainImagePosition();
    }
  }

  /**
   * Reduce el zoom de la imagen.
   */
  zoomOut(): void {
    if (this.imageZoom > this.minZoom) {
      this.imageZoom = Math.max(this.imageZoom - 0.25, this.minZoom);
      if (this.imageZoom === this.minZoom) {
        this.imagePosition = { x: 0, y: 0 };
      } else {
        this.constrainImagePosition();
      }
    }
  }

  /**
   * Restaura el zoom a su valor original.
   */
  resetZoom(): void {
    this.imageZoom = 1;
    this.imagePosition = { x: 0, y: 0 };
  }

  /**
   * Calcula y aplica límites al desplazamiento de la imagen.
   */
  constrainImagePosition(): void {
    if (this.imageZoom <= 1) {
      this.imagePosition = { x: 0, y: 0 };
      return;
    }

    const containerWidth = 800;
    const containerHeight = 320;
    
    const scaledWidth = containerWidth * this.imageZoom;
    const scaledHeight = containerHeight * this.imageZoom;
    
    const maxOffsetX = (scaledWidth - containerWidth) / 2;
    const maxOffsetY = (scaledHeight - containerHeight) / 2;
    
    this.imagePosition.x = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.imagePosition.x));
    this.imagePosition.y = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.imagePosition.y));
  }

  /**
   * Maneja el evento de rueda del mouse para zoom.
   */
  onImageWheel(event: WheelEvent): void {
    event.preventDefault();
    
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  /**
   * Inicia el arrastre de la imagen.
   */
  onImageMouseDown(event: MouseEvent): void {
    if (this.imageZoom > 1) {
      this.isDragging = true;
      this.dragStart = {
        x: event.clientX - this.imagePosition.x,
        y: event.clientY - this.imagePosition.y
      };
      event.preventDefault();
    }
  }

  /**
   * Actualiza la posición de la imagen durante el arrastre.
   */
  onImageMouseMove(event: MouseEvent): void {
    if (this.isDragging && this.imageZoom > 1) {
      const newX = event.clientX - this.dragStart.x;
      const newY = event.clientY - this.dragStart.y;
      
      this.imagePosition = { x: newX, y: newY };
      this.constrainImagePosition();
    }
  }

  /**
   * Finaliza el arrastre de la imagen.
   */
  onImageMouseUp(): void {
    this.isDragging = false;
  }

  // ============================================
  // FILE DOWNLOAD
  // ============================================
  
  /**
   * Descarga un archivo del proyecto.
   */
  async downloadFile(fileUrl: string, fileName: string, event?: Event, fileId?: number): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    if (!this.canDownloadFile()) {
      if (this.showLoginPrompt()) {
        this.notificationService.showWarning('Debes iniciar sesión para descargar archivos', 'Acceso requerido');
        this.router.navigate(['/login']);
      } else if (this.showPurchasePrompt()) {
        this.notificationService.showWarning('Debes comprar este proyecto para descargar los archivos', 'Compra requerida');
      }
      return;
    }

    if (fileId && this.downloadingFiles.has(fileId)) {
      this.notificationService.showWarning('El archivo ya se está descargando', 'Descarga en progreso');
      return;
    }

    if (fileId) {
      this.downloadingFiles.add(fileId);
    }

    try {
      this.notificationService.showInfo('Iniciando descarga...', 'Descarga');
      
      if (fileId && this.projectId) {
        try {
          const response = await this.apiService.downloadProjectFile(this.projectId, fileId).toPromise();
          if (response?.success) {
            this.logger.debug('Descarga registrada en estadísticas');
          }
        } catch (error) {
          this.logger.warn('Error registrando descarga en estadísticas');
        }
      }
      
      const response = await fetch(fileUrl, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      this.logger.debug('Descargando archivo', { fileName, contentType });

      const blob = await response.blob();
      const finalBlob = contentType ? new Blob([blob], { type: contentType }) : blob;
      const blobUrl = window.URL.createObjectURL(finalBlob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);

      this.notificationService.showSuccess(`${fileName} descargado correctamente`, 'Descarga completada');
      
    } catch (error: any) {
      this.logger.error('Error descargando archivo', error);
      const errorMsg = error?.message || 'Error desconocido al descargar el archivo';
      this.notificationService.showError(`Error: ${errorMsg}`, 'Error en descarga');
    } finally {
      if (fileId) {
        this.downloadingFiles.delete(fileId);
      }
    }
  }

  // ============================================
  // PURCHASE & CART
  // ============================================
  
  /**
   * Inicia el proceso de compra del proyecto.
   */
  async purchaseProject(): Promise<void> {
    if (!this.currentUser) {
      this.notificationService.showError('Debes iniciar sesión para comprar', 'Error');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.project) {
      this.notificationService.showError('Proyecto no encontrado', 'Error');
      return;
    }

    if (this.purchaseService.isPurchasePending(this.project.id)) {
      this.notificationService.showWarning('La compra ya está en proceso', 'Compra en progreso');
      return;
    }

    this.projectSummary = {
      id: this.project.id,
      title: this.project.title,
      price: this.project.price,
      seller: {
        name: this.project.seller.name,
        avatar: this.project.seller.verified ? 'avatar-url' : undefined
      },
      mainImage: this.project.images.find(img => img.isMain) || this.project.images[0]
    };

    this.showPurchaseModal = true;
  }

  /**
   * Maneja el cierre del modal de compra.
   */
  onPurchaseModalClosed(): void {
    this.showPurchaseModal = false;
    this.projectSummary = null;
  }

  /**
   * Maneja la finalización exitosa de una compra.
   */
  onPurchaseCompleted(): void {
    this.logger.log('Compra completada, actualizando estado');
    
    this.ngZone.run(() => {
      this.showPurchaseModal = false;
      this.projectSummary = null;
      
      this.userHasPurchased = true;
      this.hasAccess = true;
      this.justUnlocked = true;
      
      this.cdr.detectChanges();
      
      this.logger.debug('Estado actualizado después de compra');
    });
    
    this.notificationService.showSuccess(
      '¡Contenido desbloqueado! Ya puedes descargar todos los archivos.',
      'Acceso Completo'
    );
    
    setTimeout(() => {
      this.ngZone.run(() => {
        this.justUnlocked = false;
        this.cdr.detectChanges();
        
        this.logger.debug('Período de gracia terminado, sincronizando con backend');
        this.purchaseService.refreshUserPurchases().then(() => {
          this.checkAccess();
          this.cdr.detectChanges();
        });
      });
    }, 5000);
    
    setTimeout(async () => {
      this.logger.debug('Sincronizando con backend en background');
      try {
        await this.purchaseService.refreshUserPurchases();
      } catch (error) {
        this.logger.error('Error sincronizando con backend', error);
      }
    }, 1000);
  }

  /**
   * Agrega o remueve el proyecto del carrito.
   */
  async addToCart(): Promise<void> {
    if (!this.currentUser) {
      this.notificationService.showWarning('Inicia sesión para agregar al carrito', 'Acceso requerido');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.project) {
      this.notificationService.showError('Proyecto no encontrado', 'Error');
      return;
    }

    if (this.isOwnerView || this.project.seller.id === parseInt(this.currentUser.id)) {
      this.notificationService.showWarning('No puedes agregar tu propio proyecto al carrito', 'Acción no permitida');
      return;
    }

    if (this.userHasPurchased || this.hasAccess) {
      this.notificationService.showInfo('Ya tienes acceso a este proyecto', 'Ya comprado');
      return;
    }

    this.isAddingToCart = true;

    try {
      if (this.isInCart) {
        await this.cartService.removeFromCart(this.project.id).toPromise();
        this.notificationService.showSuccess('Removido del carrito', 'Éxito');
      } else {
        await this.cartService.addToCart(this.project.id).toPromise();
        this.notificationService.showSuccess('Agregado al carrito', 'Éxito');
      }
    } catch (error: any) {
      this.logger.error('Error con el carrito', error);
      const errorMsg = error?.error?.message || error?.message || 'Error al actualizar el carrito';
      this.notificationService.showError(errorMsg, 'Error');
    } finally {
      this.isAddingToCart = false;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================
  
  /**
   * Obtiene la clase CSS para el badge de estado.
   */
  getStatusBadgeClass(status: string): string {
    return 'bg-studex-100 text-studex-800';
  }

  /**
   * Obtiene el icono SVG correspondiente al estado del proyecto.
   */
  getStatusIcon(status: string): SafeHtml {
    const icons: { [key: string]: string } = {
      'BORRADOR': `<svg class="w-6 h-6 inline-block text-studex-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
      </svg>`,
      'REVISION': `<svg class="w-6 h-6 inline-block text-studex-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>`,
      'PUBLICADO': `<svg class="w-6 h-6 inline-block text-studex-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>`,
      'DESTACADO': `<svg class="w-6 h-6 inline-block text-studex-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
      </svg>`,
      'RECHAZADO': `<svg class="w-6 h-6 inline-block text-studex-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>`
    };
    const iconHtml = icons[status] || `<svg class="w-6 h-6 inline-block text-studex-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
    </svg>`;
    
    return this.sanitizer.bypassSecurityTrustHtml(iconHtml);
  }

  /**
   * Obtiene el texto del estado del proyecto.
   */
  getStatusText(status: string): string {
    const statusTexts: { [key: string]: string } = {
      'BORRADOR': 'Borrador',
      'REVISION': 'En Revisión',
      'PUBLICADO': 'Publicado',
      'DESTACADO': 'Destacado',
      'RECHAZADO': 'Rechazado'
    };
    return statusTexts[status] || status;
  }

  /**
   * Obtiene el texto del tipo de proyecto.
   */
  getProjectTypeText(type: string): string {
    const typeTexts: { [key: string]: string } = {
      // Documentación y guías
      'MANUAL_GUIA': 'Manual/Guía',
      'TUTORIAL_CURSO': 'Tutorial/Curso',
      'DOCUMENTACION': 'Documentación',
      'PLANTILLA_TEMPLATE': 'Plantilla/Template',
      
      // Desarrollo y tecnología
      'SISTEMA_APLICACION': 'Sistema/Aplicación',
      'CODIGO_FUENTE': 'Código Fuente',
      'BASE_DATOS': 'Base de Datos',
      'API_SERVICIO': 'API/Servicio',
      
      // Análisis y negocio
      'PLAN_NEGOCIO': 'Plan de Negocio',
      'ANALISIS_CASO': 'Análisis de Caso',
      'INVESTIGACION_ESTUDIO': 'Investigación/Estudio',
      'ANALISIS_MERCADO': 'Análisis de Mercado',
      
      // Diseño y multimedia
      'DISEÑO_GRAFICO': 'Diseño Gráfico',
      'PRESENTACION': 'Presentación',
      'VIDEO_AUDIO': 'Video/Audio',
      'MATERIAL_VISUAL': 'Material Visual',
      
      // Otros formatos
      'HOJA_CALCULO': 'Hoja de Cálculo',
      'FORMULARIO_FORMATO': 'Formulario/Formato',
      'OTRO': 'Otro'
    };
    return typeTexts[type] || type;
  }

  /**
   * Obtiene el icono SVG correspondiente al tipo MIME del archivo.
   */
  getFileIcon(mimeType: string): SafeHtml {
    let iconHtml = '';
    
    // PDF
    if (mimeType.includes('pdf')) {
      iconHtml = `<svg class="w-6 h-6 text-studex-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>`;
    }
    // Word
    else if (mimeType.includes('word') || mimeType.includes('document')) {
      iconHtml = `<svg class="w-6 h-6 text-studex-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>`;
    }
    // ZIP/RAR
    else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) {
      iconHtml = `<svg class="w-6 h-6 text-studex-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
      </svg>`;
    }
    // JavaScript/Code
    else if (mimeType.includes('javascript') || mimeType.includes('text')) {
      iconHtml = `<svg class="w-6 h-6 text-studex-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
      </svg>`;
    }
    // Excel
    else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      iconHtml = `<svg class="w-6 h-6 text-studex-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>
      </svg>`;
    }
    // PowerPoint
    else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      iconHtml = `<svg class="w-6 h-6 text-studex-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/>
      </svg>`;
    }
    // Archivo genérico
    else {
      iconHtml = `<svg class="w-6 h-6 text-studex-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>`;
    }
    
    return this.sanitizer.bypassSecurityTrustHtml(iconHtml);
  }

  /**
   * Obtiene el texto del tipo de archivo.
   */
  getFileTypeText(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word')) return 'Word';
    if (mimeType.includes('zip')) return 'ZIP';
    if (mimeType.includes('rar')) return 'RAR';
    if (mimeType.includes('javascript')) return 'JavaScript';
    if (mimeType.includes('excel')) return 'Excel';
    if (mimeType.includes('powerpoint')) return 'PowerPoint';
    return 'Archivo';
  }

  /**
   * Formatea el tamaño del archivo en bytes a unidades legibles.
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Formatea una fecha a formato legible en español.
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Verifica si un archivo está siendo descargado.
   */
  isDownloading(fileId: number): boolean {
    return this.downloadingFiles.has(fileId);
  }

  /**
   * Navega hacia atrás en el historial del navegador.
   */
  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  // ============================================
  // COMMENTS
  // ============================================
  
  /**
   * Carga los comentarios del proyecto.
   */
  async loadComments(): Promise<void> {
    this.isLoadingComments = true;

    try {
      const response = await this.commentService.getComments(this.projectId).toPromise();
      
      if (response?.success && Array.isArray(response.data)) {
        this.comments = response.data as ProjectComment[];
        this.logger.debug(`${this.comments.length} comentarios cargados`);
      }
    } catch (error: any) {
      this.logger.error('Error cargando comentarios', error);
    } finally {
      this.isLoadingComments = false;
    }
  }

  /**
   * Envía un nuevo comentario.
   */
  async submitComment(): Promise<void> {
    if (!this.currentUser) {
      this.notificationService.showWarning('Debes iniciar sesión para comentar', 'Acceso requerido');
      this.router.navigate(['/login']);
      return;
    }

    const content = this.newCommentContent.trim();

    if (content.length < 3) {
      this.notificationService.showWarning('El comentario debe tener al menos 3 caracteres', 'Comentario muy corto');
      return;
    }

    if (content.length > 1000) {
      this.notificationService.showWarning('El comentario no puede exceder 1000 caracteres', 'Comentario muy largo');
      return;
    }

    this.isSubmittingComment = true;

    try {
      const response = await this.commentService.createComment(this.projectId, content).toPromise();
      
      if (response?.success && response.data) {
        this.comments.unshift(response.data as ProjectComment);
        this.newCommentContent = '';
        this.notificationService.showSuccess('Comentario publicado', 'Éxito');
        this.logger.debug('Comentario creado exitosamente');
      }
    } catch (error: any) {
      this.logger.error('Error creando comentario', error);
      const errorMsg = error?.error?.message || error?.message || 'Error al publicar comentario';
      this.notificationService.showError(errorMsg, 'Error');
    } finally {
      this.isSubmittingComment = false;
    }
  }

  /**
   * Elimina un comentario.
   */
  async deleteComment(commentId: number): Promise<void> {
    if (!confirm('¿Estás seguro de eliminar este comentario?')) {
      return;
    }

    try {
      const response = await this.commentService.deleteComment(commentId).toPromise();
      
      if (response?.success) {
        this.comments = this.comments.filter(c => c.id !== commentId);
        this.notificationService.showSuccess('Comentario eliminado', 'Éxito');
        this.logger.debug('Comentario eliminado exitosamente');
      }
    } catch (error: any) {
      this.logger.error('Error eliminando comentario', error);
      const errorMsg = error?.error?.message || error?.message || 'Error al eliminar comentario';
      this.notificationService.showError(errorMsg, 'Error');
    }
  }

  /**
   * Verifica si el usuario puede eliminar un comentario.
   */
  canDeleteComment(comment: ProjectComment): boolean {
    if (!this.currentUser) return false;
    
    // El autor puede eliminar su propio comentario
    if (comment.usuarioId === parseInt(this.currentUser.id)) return true;
    
    // Los admins pueden eliminar cualquier comentario
    if (this.currentUser.userType === 'ADMINISTRADOR') return true;
    
    return false;
  }

  /**
   * Formatea una fecha relativa (ej: "hace 2 horas").
   */
  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Hace unos segundos';
    if (diffMin < 60) return `Hace ${diffMin} min${diffMin > 1 ? 's' : ''}`;
    if (diffHour < 24) return `Hace ${diffHour} hora${diffHour > 1 ? 's' : ''}`;
    if (diffDay < 7) return `Hace ${diffDay} día${diffDay > 1 ? 's' : ''}`;
    
    return this.formatDate(dateString);
  }
}
