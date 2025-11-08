import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';
import { ProjectCardComponent, ProjectCard } from '../../components/project-card/project-card';
import { BackButtonComponent } from '../../components/back-button/back-button.component';

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
  standalone: true,
  imports: [CommonModule, FormsModule, ProjectCardComponent, BackButtonComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-studex-50 to-studex-100 py-8">
      <div class="max-w-7xl mx-auto px-4">
        
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-4xl font-bold text-studex-900 mb-2">📚 Mis Proyectos</h1>
            <p class="text-studex-600">Gestiona y visualiza todos tus proyectos publicados</p>
          </div>
          <app-back-button></app-back-button>
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
              <div class="text-3xl font-bold text-studex-accent-400">{{ getPublishedCount() }}</div>
              <div class="text-sm text-studex-500">Publicados</div>
            </div>
            <div class="bg-white rounded-xl shadow-lg p-6 text-center">
              <div class="text-3xl font-bold text-studex-600">{{ getTotalViews() }}</div>
              <div class="text-sm text-studex-500">Vistas Totales</div>
            </div>
            <div class="bg-white rounded-xl shadow-lg p-6 text-center">
              <div class="text-3xl font-bold text-studex-accent-400">{{ getTotalDownloads() }}</div>
              <div class="text-sm text-studex-500">Descargas</div>
            </div>
          </div>

          <!-- Projects List -->
          <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <app-project-card
              *ngFor="let project of projects; let i = index"
              [project]="transformToProjectCard(project)"
              [showOwnerActions]="true"
              [animationDelay]="i * 0.05"
              class="slide-in-up"
              [style.animation-delay]="(i * 0.05) + 's'">
            </app-project-card>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
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
    private notificationService: NotificationService,
    private logger: LoggerService
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
        this.logger.debug('Proyectos del vendedor cargados', this.projects.length);
      } else {
        throw new Error(response?.message || 'Error cargando proyectos');
      }
    } catch (error: any) {
      this.logger.error('Error cargando proyectos', error);
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

  calculateStats(): ProjectStats {
    return {
      total: this.projects.length,
      published: this.projects.filter(p => p.status === 'PUBLICADO' || p.status === 'DESTACADO').length,
      totalViews: this.projects.reduce((sum, p) => sum + p.views, 0),
      totalDownloads: this.projects.reduce((sum, p) => sum + p.downloads, 0)
    };
  }

  /**
   * Transforma SellerProject a ProjectCard para usar con ProjectCardComponent
   */
  transformToProjectCard(project: SellerProject): ProjectCard {
    return {
      id: project.id,
      title: project.title,
      description: project.description,
      price: project.price,
      type: project.type,
      university: project.university,
      category: project.category.nombre,
      year: project.year,
      rating: 0, // Los proyectos propios no muestran rating
      views: project.views,
      downloads: project.downloads,
      mainImage: project.mainImage,
      isFavorite: false, // Los proyectos propios no tienen favorito
      status: project.status,
      featured: project.featured,
      seller: {
        id: this.currentUser ? parseInt(this.currentUser.id) : 0,
        name: this.currentUser ? `${this.currentUser.firstName} ${this.currentUser.lastName}` : 'Tú',
        rating: 0,
        salesCount: 0
      }
    };
  }

  navigateToUpload(): void {
    this.router.navigate(['/vendedor/subir-proyecto']);
  }

}