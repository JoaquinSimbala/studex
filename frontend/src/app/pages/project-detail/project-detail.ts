import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { PurchaseService, PurchaseRequest } from '../../services/purchase.service';
import { CartService } from '../../services/cart.service';
import { PurchaseModalComponent, ProjectSummary } from '../../components/purchase-modal/purchase-modal.component';
import { LoggerService } from '../../services/logger.service';

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

interface ProjectImage {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isMain: boolean;
  order: number;
}

interface ProjectFile {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  description: string;
  order: number;
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PurchaseModalComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-studex-50 to-studex-100 py-8">
      <div class="max-w-6xl mx-auto px-4">
        
        <!-- Loading -->
        <div *ngIf="isLoading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-studex-600"></div>
          <p class="mt-4 text-studex-600">Cargando proyecto...</p>
        </div>

        <!-- Error -->
        <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h3 class="text-red-800 font-semibold mb-2">Error cargando proyecto</h3>
          <p class="text-red-600">{{ error }}</p>
          <button (click)="goBack()" 
                  class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Volver
          </button>
        </div>

        <!-- Project Detail -->
        <div *ngIf="!isLoading && !error && project">
          
          <!-- Header -->
          <div class="flex items-center justify-between mb-8">
            <button (click)="goBack()" 
                    class="flex items-center justify-center w-10 h-10 text-studex-600 hover:bg-studex-100 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            
            <div class="flex items-center space-x-3">
              <!-- Botón de agregar/remover del carrito -->
              <button *ngIf="shouldShowCartButton()" 
                      (click)="addToCart()"
                      [disabled]="isAddingToCart"
                      [class]="isInCart ? 
                        'px-6 py-3 bg-white border-2 border-red-500 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-all' :
                        'px-6 py-3 bg-white border-2 border-studex-600 text-studex-600 rounded-lg font-semibold hover:bg-studex-50 transition-all'">
                <span *ngIf="isAddingToCart">Procesando...</span>
                <span *ngIf="!isAddingToCart">{{ isInCart ? 'Remover del carrito' : 'Agregar al carrito' }}</span>
              </button>

              <!-- Botón de compra (solo vista pública) -->
              <button *ngIf="showPurchasePrompt()" 
                      (click)="purchaseProject()"
                      class="px-6 py-3 bg-white border-2 border-studex-600 text-studex-600 rounded-lg font-semibold hover:bg-studex-50 transition-all">
                Comprar por S/ {{ project.price }}
              </button>
              
              <!-- Mensaje de login requerido -->
              <button *ngIf="showLoginPrompt()" 
                      (click)="router.navigate(['/login'])"
                      class="px-6 py-3 bg-white border-2 border-studex-600 text-studex-600 rounded-lg font-semibold hover:bg-studex-50 transition-all">
                Iniciar Sesión para Comprar
              </button>
              
              <!-- Estado de acceso concedido -->
              <div *ngIf="hasAccess && isPublicView" 
                   class="px-4 py-2 bg-green-100 text-green-800 rounded-xl font-semibold text-sm border border-green-300">
                ✅ Tienes acceso a este proyecto
              </div>
              
              <!-- Badge de estado (solo para propietarios) -->
              <span *ngIf="isOwnerView"
                    [class]="getStatusBadgeClass(project.status)"
                    class="px-4 py-2 rounded-full text-2xl font-semibold shadow-md">
                {{ getStatusIcon(project.status) }}
              </span>
            </div>
          </div>

          <!-- Main Content -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Left Column - Images -->
            <div class="lg:col-span-2">
              <!-- Main Image -->
              <div class="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                <div class="relative h-80 bg-studex-100">
                  <!-- Image Container with Zoom and Pan -->
                  <div *ngIf="selectedImage" 
                       class="w-full h-full overflow-hidden relative"
                       [class.cursor-move]="imageZoom > 1"
                       [class.cursor-zoom-in]="imageZoom === 1"
                       (mousedown)="onImageMouseDown($event)"
                       (mousemove)="onImageMouseMove($event)"
                       (mouseup)="onImageMouseUp()"
                       (mouseleave)="onImageMouseUp()"
                       (wheel)="onImageWheel($event)">
                    <img [src]="selectedImage.fileUrl" 
                         [alt]="selectedImage.fileName"
                         [style.transform]="'scale(' + imageZoom + ') translate(' + (imagePosition.x / imageZoom) + 'px, ' + (imagePosition.y / imageZoom) + 'px)'"
                         class="w-full h-full object-contain select-none"
                         [class.transition-transform]="!isDragging"
                         [class.duration-200]="!isDragging"
                         draggable="false">
                  </div>
                  
                  <!-- Placeholder cuando no hay imagen -->
                  <div *ngIf="!selectedImage && project.images.length === 0" 
                       class="w-full h-full flex items-center justify-center">
                    <span class="text-6xl text-studex-300">📄</span>
                  </div>
                  
                  <!-- Zoom Controls -->
                  <div *ngIf="selectedImage" class="absolute top-4 right-4 flex flex-col gap-2 bg-white bg-opacity-90 rounded-lg p-2 shadow-lg">
                    <button (click)="zoomIn()"
                            [disabled]="imageZoom >= maxZoom"
                            class="w-8 h-8 flex items-center justify-center rounded hover:bg-studex-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Acercar">
                      <svg class="w-5 h-5 text-studex-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"></path>
                      </svg>
                    </button>
                    
                    <button (click)="resetZoom()"
                            [disabled]="imageZoom === 1"
                            class="w-8 h-8 flex items-center justify-center rounded hover:bg-studex-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-studex-600"
                            title="Restablecer">
                      {{ (imageZoom * 100).toFixed(0) }}%
                    </button>
                    
                    <button (click)="zoomOut()"
                            [disabled]="imageZoom <= minZoom"
                            class="w-8 h-8 flex items-center justify-center rounded hover:bg-studex-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Alejar">
                      <svg class="w-5 h-5 text-studex-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Image Gallery -->
              <div *ngIf="project.images.length > 0" class="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h3 class="text-lg font-semibold text-studex-900 mb-4">📸 Imágenes ({{ project.images.length }})</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div *ngFor="let image of project.images" 
                       class="relative group cursor-pointer"
                       (click)="selectImage(image)">
                    <img [src]="image.fileUrl" 
                         [alt]="image.fileName"
                         class="w-full h-24 object-cover rounded-lg border-2 border-transparent hover:border-studex-500 transition-colors"
                         [class.border-studex-500]="selectedImage?.id === image.id">
                    
                    <!-- Download Button -->
                    <button (click)="downloadFile(image.fileUrl, image.fileName, $event, image.id)"
                            class="absolute top-1 right-1 w-6 h-6 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            [class]="canDownloadFile() ? 'bg-black bg-opacity-50 text-white hover:bg-opacity-75' : 'bg-red-500 text-white cursor-not-allowed'"
                            [disabled]="!canDownloadFile()">
                      {{ canDownloadFile() ? '⬇' : '🔒' }}
                    </button>
                    
                    <!-- File Info -->
                    <div class="mt-1 text-xs text-studex-500 text-center truncate">
                      {{ image.fileName }}
                    </div>
                    <div class="text-xs text-studex-400 text-center">
                      {{ formatFileSize(image.fileSize) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Files Section -->
              <div *ngIf="project.files.length > 0" class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-lg font-semibold text-studex-900 mb-4">📄 Archivos ({{ project.files.length }})</h3>
                <div class="space-y-3">
                  <div *ngFor="let file of project.files" 
                       class="flex items-center justify-between p-4 border border-studex-200 rounded-lg hover:bg-studex-50 transition-colors">
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 bg-studex-100 rounded-lg flex items-center justify-center">
                        <span class="text-lg">{{ getFileIcon(file.mimeType) }}</span>
                      </div>
                      <div>
                        <p class="font-medium text-studex-800">{{ file.fileName }}</p>
                        <p class="text-sm text-studex-500">{{ formatFileSize(file.fileSize) }} • {{ getFileTypeText(file.mimeType) }}</p>
                        <p *ngIf="file.description" class="text-xs text-studex-400">{{ file.description }}</p>
                      </div>
                    </div>
                    <button (click)="downloadFile(file.fileUrl, file.fileName, undefined, file.id)"
                            [disabled]="downloadingFiles.has(file.id) || !canDownloadFile()"
                            [class]="
                              downloadingFiles.has(file.id) ? 
                                'px-4 py-2 bg-gray-400 text-white text-sm font-medium rounded-lg cursor-not-allowed flex items-center space-x-2' :
                              !canDownloadFile() ?
                                'px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg cursor-not-allowed flex items-center space-x-2' :
                                'px-4 py-2 bg-studex-600 text-white text-sm font-medium rounded-lg hover:bg-studex-700 transition-colors flex items-center space-x-2'">
                      <span *ngIf="!downloadingFiles.has(file.id) && canDownloadFile()">📥</span>
                      <span *ngIf="!downloadingFiles.has(file.id) && !canDownloadFile()">🔒</span>
                      <span *ngIf="downloadingFiles.has(file.id)" class="animate-spin">⏳</span>
                      <span>{{ 
                        downloadingFiles.has(file.id) ? 'Descargando...' : 
                        !canDownloadFile() ? 'Bloqueado' : 
                        'Descargar' 
                      }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column - Project Info -->
            <div class="lg:col-span-1">
              <!-- Project Info -->
              <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h1 class="text-2xl font-bold text-studex-900 mb-4">{{ project.title }}</h1>
                
                <div class="space-y-4">
                  <!-- Price -->
                  <div class="flex items-center justify-between">
                    <span class="text-studex-600">Precio:</span>
                    <span class="text-2xl font-bold text-studex-900">S/ {{ project.price }}</span>
                  </div>

                  <!-- Category -->
                  <div class="flex items-center justify-between">
                    <span class="text-studex-600">Categoría:</span>
                    <span class="font-medium text-right">{{ project.category.nombre }}</span>
                  </div>

                  <!-- Type -->
                  <div class="flex items-center justify-between">
                    <span class="text-studex-600">Tipo:</span>
                    <span class="font-medium">{{ getProjectTypeText(project.type) }}</span>
                  </div>

                  <!-- University -->
                  <div class="flex items-center justify-between">
                    <span class="text-studex-600">Universidad:</span>
                    <span class="font-medium text-right">{{ project.university }}</span>
                  </div>

                  <!-- Subject -->
                  <div class="flex items-center justify-between">
                    <span class="text-studex-600">Materia:</span>
                    <span class="font-medium">{{ project.subject }}</span>
                  </div>

                  <!-- Year -->
                  <div class="flex items-center justify-between">
                    <span class="text-studex-600">Año:</span>
                    <span class="font-medium">{{ project.year }}</span>
                  </div>
                </div>
              </div>

              <!-- Stats -->
              <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h3 class="text-lg font-semibold text-studex-900 mb-4">📊 Estadísticas</h3>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-studex-600">👁️ Vistas:</span>
                    <span class="font-bold">{{ project.views }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-studex-600">📥 Descargas:</span>
                    <span class="font-bold">{{ project.downloads }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-studex-600">📅 Publicado:</span>
                    <span class="font-medium">{{ formatDate(project.createdAt) }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-studex-600">🔄 Actualizado:</span>
                    <span class="font-medium">{{ formatDate(project.updatedAt) }}</span>
                  </div>
                </div>
              </div>

              <!-- Tags -->
              <div *ngIf="project.tags.length > 0" class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-lg font-semibold text-studex-900 mb-4">🏷️ Tags</h3>
                <div class="flex flex-wrap gap-2">
                  <span *ngFor="let tag of project.tags" 
                        class="px-3 py-1 bg-studex-100 text-studex-700 text-sm rounded-full">
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="bg-white rounded-xl shadow-lg p-6 mt-6">
            <h3 class="text-lg font-semibold text-studex-900 mb-4">📝 Descripción</h3>
            <p class="text-studex-700 leading-relaxed whitespace-pre-wrap">{{ project.description }}</p>
          </div>

          <!-- Access Information Panel (solo vista pública) -->
          <div *ngIf="isPublicView" class="mt-6 rounded-xl shadow-lg p-6"
               [class]="hasAccess ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'">
            
            <!-- Usuario con acceso -->
            <div *ngIf="hasAccess" class="text-center">
              <div class="text-4xl mb-3" [class]="justUnlocked ? 'animate-bounce' : ''">
                {{ justUnlocked ? '🎉' : '✅' }}
              </div>
              <h3 class="text-lg font-semibold mb-2" 
                  [class]="justUnlocked ? 'text-blue-800 animate-pulse' : 'text-green-800'">
                {{ justUnlocked ? '¡Contenido Desbloqueado!' : '¡Tienes acceso completo!' }}
              </h3>
              <p [class]="justUnlocked ? 'text-blue-700 font-medium' : 'text-green-700'">
                {{ justUnlocked ? '¡Compra realizada con éxito! Ya puedes descargar todos los archivos.' : 'Puedes descargar todos los archivos de este proyecto.' }}
              </p>
              <div *ngIf="justUnlocked" class="mt-3 px-4 py-2 bg-blue-100 border border-blue-300 rounded-lg">
                <p class="text-sm text-blue-800">✨ El acceso a los archivos se ha activado inmediatamente</p>
              </div>
            </div>

            <!-- Usuario sin acceso - Necesita comprar -->
            <div *ngIf="!hasAccess && currentUser" class="text-center">
              <div class="text-4xl mb-3">🔒</div>
              <h3 class="text-lg font-semibold text-orange-800 mb-2">Proyecto Protegido</h3>
              <p class="text-orange-700 mb-4">Para acceder a los archivos de este proyecto, necesitas comprarlo.</p>
              <div class="bg-white rounded-lg p-4 mb-4 border border-orange-300">
                <div class="flex items-center justify-between">
                  <span class="text-lg font-semibold text-studex-900">Precio:</span>
                  <span class="text-2xl font-bold text-studex-600">S/ {{ project.price }}</span>
                </div>
              </div>
              
              <!-- Botones de acción -->
              <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <!-- Botón de carrito -->
                <button *ngIf="shouldShowCartButton()" 
                        (click)="addToCart()"
                        [disabled]="isAddingToCart"
                        [class]="isInCart ? 
                          'px-6 py-3 bg-white border-2 border-red-500 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-all' :
                          'px-6 py-3 bg-white border-2 border-studex-600 text-studex-600 rounded-lg font-semibold hover:bg-studex-50 transition-all'">
                  <span *ngIf="isAddingToCart">Procesando...</span>
                  <span *ngIf="!isAddingToCart">{{ isInCart ? 'Remover del carrito' : 'Agregar al carrito' }}</span>
                </button>
                
                <!-- Botón de compra directa -->
                <button (click)="purchaseProject()"
                        class="px-6 py-3 bg-white border-2 border-studex-600 text-studex-600 rounded-lg font-semibold hover:bg-studex-50 transition-all">
                  Comprar Ahora
                </button>
              </div>
              
              <!-- Información del carrito -->
              <div *ngIf="isInCart" class="mt-3 px-4 py-2 bg-blue-100 border border-blue-300 rounded-lg">
                <p class="text-sm text-blue-800">
                  ✅ Este proyecto está en tu carrito. 
                  <a routerLink="/carrito" class="underline font-medium hover:text-blue-900">Ver carrito</a>
                </p>
              </div>
            </div>

            <!-- Usuario no autenticado -->
            <div *ngIf="!currentUser" class="text-center">
              <div class="text-4xl mb-3">🔐</div>
              <h3 class="text-lg font-semibold text-orange-800 mb-2">Inicia Sesión</h3>
              <p class="text-orange-700 mb-4">Debes iniciar sesión para comprar y acceder a este proyecto.</p>
              <button (click)="router.navigate(['/login'])"
                      class="px-6 py-3 bg-white border-2 border-studex-600 text-studex-600 rounded-lg font-semibold hover:bg-studex-50 transition-all">
                Iniciar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Purchase Modal -->
    <app-purchase-modal
      [isOpen]="showPurchaseModal"
      [project]="projectSummary"
      (closed)="onPurchaseModalClosed()"
      (purchaseCompleted)="onPurchaseCompleted()">
    </app-purchase-modal>
  `,
  styles: [`
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .cursor-zoom-in {
      cursor: zoom-in;
    }
    .cursor-move {
      cursor: move;
    }
  `]
})
export class ProjectDetailComponent implements OnInit {
  projectId: number = 0;
  project: ProjectDetail | null = null;
  selectedImage: ProjectImage | null = null;
  isLoading = true;
  error: string | null = null;
  downloadingFiles: Set<number> = new Set(); // Track downloading files
  
  // Zoom and pan controls
  imageZoom = 1;
  imagePosition = { x: 0, y: 0 };
  isDragging = false;
  dragStart = { x: 0, y: 0 };
  minZoom = 1;
  maxZoom = 3;
  
  // Control de permisos y vista
  isOwnerView = false; // Si es vista del propietario
  isPublicView = false; // Si es vista pública
  hasAccess = false; // Si el usuario tiene acceso a los archivos
  userHasPurchased = false; // Si el usuario compró el proyecto
  currentUser: User | null = null;
  justUnlocked = false; // Si se acaba de desbloquear el contenido

  // Modal de compra
  showPurchaseModal = false;
  projectSummary: ProjectSummary | null = null;

  // Estado del carrito
  isInCart = false;
  isAddingToCart = false;

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private purchaseService: PurchaseService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    // Determinar tipo de vista basado en la ruta
    const currentUrl = this.router.url;
    this.isOwnerView = currentUrl.includes('/vendedor/proyecto/');
    this.isPublicView = !this.isOwnerView;
    
    // Obtener usuario actual
    this.authService.currentUser$.subscribe((user: User | null) => {
      this.currentUser = user;
      if (this.project) {
        this.checkAccess(); // Reevaluar acceso cuando cambie el usuario
      }
    });

    // Suscribirse a cambios en las compras del usuario
    this.purchaseService.userPurchases$.subscribe(userPurchases => {
      if (this.project) {
        const wasPurchased = userPurchases.projectIds.includes(this.project.id);
        
        // Si ya está marcado como "recién desbloqueado", no sobrescribir el estado
        // hasta que pase el período de gracia
        if (this.justUnlocked && this.hasAccess) {
          this.logger.debug('Manteniendo estado optimista durante período de gracia');
          return;
        }
        
        this.userHasPurchased = wasPurchased;
        this.checkAccess();
      }
    });

    // Suscribirse a cambios en el carrito
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
      } else {
        this.error = 'ID de proyecto inválido';
      }
    });
  }

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
        
        // Determinar permisos de acceso
        this.checkAccess();
        
        // Verificar si está en el carrito
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

  checkAccess(): void {
    this.logger.debug('Verificando acceso al proyecto');

    if (!this.project || !this.currentUser) {
      this.hasAccess = false;
      this.cdr.detectChanges();
      return;
    }

    // Si es el propietario del proyecto
    if (this.isOwnerView && this.project.seller.id === parseInt(this.currentUser.id)) {
      this.hasAccess = true;
      this.cdr.detectChanges();
      return;
    }

    // Si es vista pública, verificar si ha comprado el proyecto
    if (this.isPublicView) {
      const backendSaysHasPurchased = this.purchaseService.hasUserPurchased(this.project.id);
      
      // Si está en período de gracia (justUnlocked), mantener el estado optimista
      if (this.justUnlocked && this.hasAccess) {
        this.logger.debug('Período de gracia activo - manteniendo acceso');
        this.cdr.detectChanges();
        return;
      }
      
      // En caso normal, usar la verificación del backend
      this.userHasPurchased = backendSaysHasPurchased;
      this.hasAccess = this.userHasPurchased;
      
      this.logger.debug('Verificación de compra completada', { hasAccess: this.hasAccess });
      this.cdr.detectChanges();
      return;
    }

    this.hasAccess = false;
    this.cdr.detectChanges();
  }

  selectImage(image: ProjectImage): void {
    this.selectedImage = image;
    // Reset zoom and position when changing images
    this.resetZoom();
  }

  // Image Zoom and Pan Methods
  zoomIn(): void {
    if (this.imageZoom < this.maxZoom) {
      this.imageZoom = Math.min(this.imageZoom + 0.25, this.maxZoom);
      this.constrainImagePosition();
    }
  }

  zoomOut(): void {
    if (this.imageZoom > this.minZoom) {
      this.imageZoom = Math.max(this.imageZoom - 0.25, this.minZoom);
      // Reset position when zooming out to 1x
      if (this.imageZoom === this.minZoom) {
        this.imagePosition = { x: 0, y: 0 };
      } else {
        this.constrainImagePosition();
      }
    }
  }

  resetZoom(): void {
    this.imageZoom = 1;
    this.imagePosition = { x: 0, y: 0 };
  }

  /**
   * Calcula y aplica límites al desplazamiento de la imagen
   * para evitar que se salga del contenedor visible
   */
  constrainImagePosition(): void {
    if (this.imageZoom <= 1) {
      this.imagePosition = { x: 0, y: 0 };
      return;
    }

    // Calcular el área visible del contenedor (320px de altura)
    const containerWidth = 800; // Aproximado del contenedor
    const containerHeight = 320; // h-80 = 320px
    
    // Cuando hacemos zoom, la imagen se expande en todos los lados
    // Por ejemplo, con zoom 2x, la imagen es el doble de grande
    // Entonces hay "containerWidth * (zoom - 1) / 2" de contenido extra en cada lado
    
    // El límite debe permitir mover la imagen hasta que los bordes sean visibles
    // La fórmula correcta es: podemos mover (tamaño_ampliado - tamaño_contenedor) / 2
    const scaledWidth = containerWidth * this.imageZoom;
    const scaledHeight = containerHeight * this.imageZoom;
    
    // Cuánto podemos mover en cada dirección para ver todos los bordes
    const maxOffsetX = (scaledWidth - containerWidth) / 2;
    const maxOffsetY = (scaledHeight - containerHeight) / 2;
    
    // Aplicar límites - ahora sí llegarás a los bordes de la imagen
    this.imagePosition.x = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.imagePosition.x));
    this.imagePosition.y = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.imagePosition.y));
  }

  onImageWheel(event: WheelEvent): void {
    event.preventDefault();
    
    // Zoom in/out based on wheel direction
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

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

  onImageMouseMove(event: MouseEvent): void {
    if (this.isDragging && this.imageZoom > 1) {
      // Calcular nueva posición
      const newX = event.clientX - this.dragStart.x;
      const newY = event.clientY - this.dragStart.y;
      
      // Aplicar con restricciones
      this.imagePosition = { x: newX, y: newY };
      this.constrainImagePosition();
    }
  }

  onImageMouseUp(): void {
    this.isDragging = false;
  }

  async downloadFile(fileUrl: string, fileName: string, event?: Event, fileId?: number): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    // Verificar permisos de descarga
    if (!this.canDownloadFile()) {
      if (this.showLoginPrompt()) {
        this.notificationService.showWarning('Debes iniciar sesión para descargar archivos', 'Acceso requerido');
        this.router.navigate(['/login']);
      } else if (this.showPurchasePrompt()) {
        this.notificationService.showWarning('Debes comprar este proyecto para descargar los archivos', 'Compra requerida');
      }
      return;
    }

    // Prevenir múltiples descargas del mismo archivo
    if (fileId && this.downloadingFiles.has(fileId)) {
      this.notificationService.showWarning('El archivo ya se está descargando', 'Descarga en progreso');
      return;
    }

    if (fileId) {
      this.downloadingFiles.add(fileId);
    }

    try {
      this.notificationService.showInfo('Iniciando descarga...', 'Descarga');
      
      // Si tenemos fileId, registrar la descarga en el backend
      if (fileId && this.projectId) {
        try {
          const response = await this.apiService.downloadProjectFile(this.projectId, fileId).toPromise();
          if (response?.success) {
            this.logger.debug('Descarga registrada en estadísticas');
          }
        } catch (error) {
          this.logger.warn('Error registrando descarga en estadísticas');
          // Continuar con la descarga aunque falle el registro
        }
      }
      
      // Realizar petición HTTP para obtener el archivo con headers apropiados
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

      // Obtener información del content-type del response
      const contentType = response.headers.get('content-type') || '';
      this.logger.debug('Descargando archivo', { fileName, contentType });

      // Obtener el blob del archivo
      const blob = await response.blob();
      
      // Crear blob con el tipo MIME correcto si está disponible
      const finalBlob = contentType ? new Blob([blob], { type: contentType }) : blob;
      
      // Crear URL del blob
      const blobUrl = window.URL.createObjectURL(finalBlob);
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName; // Usar el nombre original del archivo
      link.style.display = 'none';
      
      // Agregar al DOM, hacer click y remover
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL del blob después de un momento
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);

      this.notificationService.showSuccess(`✅ ${fileName} descargado correctamente`, 'Descarga completada');
      
    } catch (error: any) {
      this.logger.error('Error descargando archivo', error);
      const errorMsg = error?.message || 'Error desconocido al descargar el archivo';
      this.notificationService.showError(`Error: ${errorMsg}`, 'Error en descarga');
    } finally {
      // Remover del set de archivos descargándose
      if (fileId) {
        this.downloadingFiles.delete(fileId);
      }
    }
  }

  getStatusBadgeClass(status: string): string {
    // Todos los badges tienen el mismo estilo para que destaque el emoji
    return 'bg-studex-100 text-studex-800';
  }

  getStatusIcon(status: string): string {
    const icons = {
      'BORRADOR': '📝',
      'REVISION': '🔍',
      'PUBLICADO': '✅',
      'DESTACADO': '⭐',
      'RECHAZADO': '❌'
    };
    return icons[status as keyof typeof icons] || '📄';
  }

  getStatusText(status: string): string {
    const statusTexts = {
      'BORRADOR': 'Borrador',
      'REVISION': 'En Revisión',
      'PUBLICADO': 'Publicado',
      'DESTACADO': 'Destacado',
      'RECHAZADO': 'Rechazado'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getProjectTypeText(type: string): string {
    const typeTexts = {
      'INVESTIGACION': 'Investigación',
      'PROYECTO_FINAL': 'Proyecto Final',
      'SOFTWARE': 'Software',
      'TEXTO_ARGUMENTATIVO': 'Texto Argumentativo',
      'PRESENTACION': 'Presentación',
      'ANALISIS_CASO': 'Análisis de Caso',
      'OTRO': 'Otro'
    };
    return typeTexts[type as keyof typeof typeTexts] || type;
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return '📦';
    if (mimeType.includes('javascript') || mimeType.includes('text')) return '💻';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    return '📄';
  }

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

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

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

  isDownloading(fileId: number): boolean {
    return this.downloadingFiles.has(fileId);
  }

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

    // Verificar si ya está en progreso
    if (this.purchaseService.isPurchasePending(this.project.id)) {
      this.notificationService.showWarning('La compra ya está en proceso', 'Compra en progreso');
      return;
    }

    // Preparar datos del proyecto para el modal
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

    // Abrir modal de compra
    this.showPurchaseModal = true;
  }

  onPurchaseModalClosed(): void {
    this.showPurchaseModal = false;
    this.projectSummary = null;
  }

  onPurchaseCompleted(): void {
    this.logger.log('Compra completada, actualizando estado');
    
    // Ejecutar dentro de NgZone para asegurar detección de cambios
    this.ngZone.run(() => {
      // Cerrar modal inmediatamente
      this.showPurchaseModal = false;
      this.projectSummary = null;
      
      // Actualizar estado inmediatamente (optimistic update)
      this.userHasPurchased = true;
      this.hasAccess = true;
      this.justUnlocked = true; // Activar indicador visual
      
      // Forzar detección de cambios para que la UI se actualice inmediatamente
      this.cdr.detectChanges();
      
      this.logger.debug('Estado actualizado después de compra');
    });
    
    // Mostrar feedback visual inmediato
    this.notificationService.showSuccess(
      '¡Contenido desbloqueado! Ya puedes descargar todos los archivos.',
      'Acceso Completo'
    );
    
    // Quitar el indicador "justUnlocked" después de 5 segundos
    // Y ENTONCES permitir que el backend actualice el estado
    setTimeout(() => {
      this.ngZone.run(() => {
        this.justUnlocked = false;
        this.cdr.detectChanges();
        
        // Ahora sí, sincronizar con el estado real del backend
        this.logger.debug('Período de gracia terminado, sincronizando con backend');
        this.purchaseService.refreshUserPurchases().then(() => {
          // Re-verificar acceso basado en datos reales del backend
          this.checkAccess();
          this.cdr.detectChanges();
        });
      });
    }, 5000);
    
    // Forzar actualización del PurchaseService en el background
    // pero SIN afectar el estado local durante el período de gracia
    setTimeout(async () => {
      this.logger.debug('Sincronizando con backend en background');
      try {
        // Forzar recarga de compras desde el backend (pero no afecta UI por el filtro en la suscripción)
        await this.purchaseService.refreshUserPurchases();
      } catch (error) {
        this.logger.error('Error sincronizando con backend', error);
      }
    }, 1000);
  }

  canDownloadFile(): boolean {
    return this.hasAccess;
  }

  showPurchasePrompt(): boolean {
    return this.isPublicView && !this.hasAccess && this.currentUser !== null;
  }

  showLoginPrompt(): boolean {
    return this.isPublicView && !this.currentUser;
  }

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

    // Verificar si el usuario es el propietario
    if (this.isOwnerView || this.project.seller.id === parseInt(this.currentUser.id)) {
      this.notificationService.showWarning('No puedes agregar tu propio proyecto al carrito', 'Acción no permitida');
      return;
    }

    // Verificar si ya ha comprado el proyecto
    if (this.userHasPurchased || this.hasAccess) {
      this.notificationService.showInfo('Ya tienes acceso a este proyecto', 'Ya comprado');
      return;
    }

    this.isAddingToCart = true;

    try {
      if (this.isInCart) {
        // Remover del carrito
        await this.cartService.removeFromCart(this.project.id).toPromise();
        this.notificationService.showSuccess('Removido del carrito', 'Éxito');
      } else {
        // Agregar al carrito
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

  shouldShowCartButton(): boolean {
    return this.isPublicView && !!this.currentUser && !this.hasAccess && !this.userHasPurchased;
  }

  goBack(): void {
    // Usar la funcionalidad nativa del navegador para volver atrás
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Si no hay historial, ir al home como fallback
      this.router.navigate(['/']);
    }
  }
}