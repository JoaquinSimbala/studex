import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

interface SellerProject {
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
  createdAt: string;
  updatedAt: string;
  category: {
    id: number;
    nombre: string;
    icono: string;
    colorHex: string;
  };
  mainImage: {
    fileUrl: string;
    fileName: string;
  } | null;
  stats: {
    totalImages: number;
    totalFiles: number;
    totalRatings: number;
  };
}

interface ProjectImage {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
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

interface ProjectStats {
  total: number;
  published: number;
  totalViews: number;
  totalDownloads: number;
}

@Component({
  selector: 'app-seller-projects',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-studex-50 to-studex-100 py-8">
      <div class="max-w-7xl mx-auto px-4">
        
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-4xl font-bold text-studex-900 mb-2">📚 Mis Proyectos</h1>
            <p class="text-studex-600">Gestiona y visualiza todos tus proyectos publicados</p>
          </div>
          <button (click)="goBack()" 
                  class="px-6 py-3 bg-studex-600 text-white font-semibold rounded-lg hover:bg-studex-700 transition-colors">
            ← Volver al Panel
          </button>
        </div>

        <!-- Loading -->
        <div *ngIf="isLoading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-studex-600"></div>
          <p class="mt-4 text-studex-600">Cargando proyectos...</p>
        </div>

        <!-- Error -->
        <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h3 class="text-red-800 font-semibold mb-2">Error cargando proyectos</h3>
          <p class="text-red-600">{{ error }}</p>
          <button (click)="loadProjects()" 
                  class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Reintentar
          </button>
        </div>

        <!-- No projects -->
        <div *ngIf="!isLoading && !error && projects.length === 0" 
             class="text-center py-16">
          <div class="text-6xl mb-4">📝</div>
          <h3 class="text-2xl font-bold text-studex-900 mb-2">No tienes proyectos aún</h3>
          <p class="text-studex-600 mb-6">¡Comienza subiendo tu primer proyecto!</p>
          <button (click)="navigateToUpload()"
                  class="px-8 py-3 bg-studex-600 text-white font-semibold rounded-lg hover:bg-studex-700 transition-colors">
            Subir Proyecto
          </button>
        </div>

        <!-- Projects Grid -->
        <div *ngIf="!isLoading && !error && projects.length > 0">
          <!-- Stats -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-xl shadow-lg p-6 text-center">
              <div class="text-3xl font-bold text-studex-600">{{ projects.length }}</div>
              <div class="text-sm text-studex-500">Total Proyectos</div>
            </div>
            <div class="bg-white rounded-xl shadow-lg p-6 text-center">
              <div class="text-3xl font-bold text-green-600">{{ getPublishedCount() }}</div>
              <div class="text-sm text-studex-500">Publicados</div>
            </div>
            <div class="bg-white rounded-xl shadow-lg p-6 text-center">
              <div class="text-3xl font-bold text-blue-600">{{ getTotalViews() }}</div>
              <div class="text-sm text-studex-500">Vistas Totales</div>
            </div>
            <div class="bg-white rounded-xl shadow-lg p-6 text-center">
              <div class="text-3xl font-bold text-purple-600">{{ getTotalDownloads() }}</div>
              <div class="text-sm text-studex-500">Descargas</div>
            </div>
          </div>

          <!-- Projects List -->
          <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <div *ngFor="let project of projects" 
                 class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                 (click)="viewProject(project.id)">
              
              <!-- Image -->
              <div class="h-48 bg-studex-100 relative overflow-hidden">
                <img *ngIf="project.mainImage" 
                     [src]="project.mainImage.fileUrl" 
                     [alt]="project.title"
                     class="w-full h-full object-cover">
                <div *ngIf="!project.mainImage" 
                     class="w-full h-full flex items-center justify-center">
                  <span class="text-4xl">📄</span>
                </div>
                
                <!-- Status Badge -->
                <div class="absolute top-3 right-3">
                  <span [class]="getStatusBadgeClass(project.status)"
                        class="px-2 py-1 rounded-full text-xs font-semibold">
                    {{ getStatusText(project.status) }}
                  </span>
                </div>

                <!-- Featured Badge -->
                <div *ngIf="project.featured" 
                     class="absolute top-3 left-3 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                  ⭐ Destacado
                </div>
              </div>

              <!-- Content -->
              <div class="p-6">
                <h3 class="text-xl font-bold text-studex-900 mb-2 line-clamp-2">
                  {{ project.title }}
                </h3>
                <p class="text-studex-600 text-sm mb-4 line-clamp-3">
                  {{ project.description }}
                </p>

                <!-- Category -->
                <div class="flex items-center mb-3">
                  <span class="text-lg mr-2">{{ project.category.icono }}</span>
                  <span class="text-sm text-studex-500">{{ project.category.nombre }}</span>
                </div>

                <!-- Meta Info -->
                <div class="flex items-center justify-between text-sm text-studex-500 mb-4">
                  <div class="flex items-center space-x-4">
                    <span>👁️ {{ project.views }}</span>
                    <span>📥 {{ project.downloads }}</span>
                  </div>
                  <span class="font-semibold text-studex-700">S/ {{ project.price }}</span>
                </div>

                <!-- Files Info -->
                <div class="flex items-center justify-between text-xs text-studex-500">
                  <div class="flex space-x-3">
                    <span *ngIf="project.stats.totalImages > 0">
                      📸 {{ project.stats.totalImages }} imagen(es)
                    </span>
                    <span *ngIf="project.stats.totalFiles > 0">
                      📄 {{ project.stats.totalFiles }} archivo(s)
                    </span>
                  </div>
                  <span>{{ formatDate(project.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class SellerProjectsComponent implements OnInit {
  currentUser: User | null = null;
  projects: SellerProject[] = [];
  stats: ProjectStats = {
    total: 0,
    published: 0,
    totalViews: 0,
    totalDownloads: 0
  };
  isLoading = true;
  error: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private apiService: ApiService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadUserAndProjects();
  }

  private async loadUserAndProjects(): Promise<void> {
    this.authService.isInitialized$.subscribe(initialized => {
      if (initialized) {
        this.authService.currentUser$.subscribe(user => {
          this.currentUser = user;
          if (user) {
            this.loadProjects();
          } else {
            this.router.navigate(['/login']);
          }
        });
      }
    });
  }

  async loadProjects(): Promise<void> {
    if (!this.currentUser) return;

    this.isLoading = true;
    this.error = null;

    try {
      const response = await this.apiService.getMyProjects(Number(this.currentUser.id)).toPromise();
      
      if (response?.success && response.data) {
        this.projects = (response.data as any).projects || [];
        this.stats = (response.data as any).stats || this.calculateStats();
        console.log('📚 Proyectos del vendedor cargados:', this.projects.length);
      } else {
        throw new Error(response?.message || 'Error cargando proyectos');
      }
    } catch (error: any) {
      console.error('❌ Error cargando proyectos:', error);
      this.error = error?.error?.message || error?.message || 'Error cargando los proyectos';
    } finally {
      this.isLoading = false;
    }
  }

  getPublishedCount(): number {
    return this.projects.filter(p => p.status === 'PUBLICADO' || p.status === 'DESTACADO').length;
  }

  getTotalViews(): number {
    return this.projects.reduce((total, project) => total + project.views, 0);
  }

  getTotalDownloads(): number {
    return this.projects.reduce((total, project) => total + project.downloads, 0);
  }

  getStatusBadgeClass(status: string): string {
    const classes = {
      'BORRADOR': 'bg-gray-500 text-white',
      'REVISION': 'bg-yellow-500 text-white',
      'PUBLICADO': 'bg-green-500 text-white',
      'DESTACADO': 'bg-blue-500 text-white',
      'RECHAZADO': 'bg-red-500 text-white'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-500 text-white';
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

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  calculateStats(): ProjectStats {
    return {
      total: this.projects.length,
      published: this.projects.filter(p => p.status === 'PUBLICADO' || p.status === 'DESTACADO').length,
      totalViews: this.projects.reduce((sum, p) => sum + p.views, 0),
      totalDownloads: this.projects.reduce((sum, p) => sum + p.downloads, 0)
    };
  }

  viewProject(projectId: number): void {
    this.router.navigate(['/vendedor/proyecto', projectId]);
  }

  navigateToUpload(): void {
    this.router.navigate(['/vendedor/subir-proyecto']);
  }

  goBack(): void {
    this.router.navigate(['/vender']);
  }
}