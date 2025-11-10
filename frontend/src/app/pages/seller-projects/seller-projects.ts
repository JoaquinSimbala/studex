/**
 * @fileoverview Componente para la gestión y visualización de proyectos del vendedor.
 * Permite visualizar estadísticas, gestionar y administrar proyectos publicados.
 * 
 * @author STUDEX Team
 * @version 1.0.1
 * @since 2025-11-10
 */

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

/**
 * Interfaz que define la estructura de un proyecto del vendedor.
 * @interface SellerProject
 */
interface SellerProject {
  /** ID único del proyecto */
  id: number;
  /** Título del proyecto */
  title: string;
  /** Descripción del proyecto */
  description: string;
  /** Precio del proyecto en soles */
  price: number;
  /** Tipo de proyecto (tesis, código, informe, etc.) */
  type: string;
  /** Universidad de origen */
  university: string;
  /** Materia o curso asociado */
  subject: string;
  /** Año de realización */
  year: number;
  /** Estado del proyecto (PUBLICADO, DESTACADO, etc.) */
  status: string;
  /** Número de vistas del proyecto */
  views: number;
  /** Número de descargas del proyecto */
  downloads: number;
  /** Indica si el proyecto está destacado */
  featured: boolean;
  /** Fecha de creación */
  createdAt: string;
  /** Fecha de última actualización */
  updatedAt: string;
  /** Categoría del proyecto */
  category: {
    id: number;
    nombre: string;
    icono: string;
    colorHex: string;
  };
  /** Imagen principal del proyecto */
  mainImage: {
    fileUrl: string;
    fileName: string;
  } | null;
  /** Estadísticas del proyecto */
  stats: {
    totalImages: number;
    totalFiles: number;
    totalRatings: number;
  };
}

/**
 * Interfaz para las estadísticas globales de proyectos.
 * @interface ProjectStats
 */
interface ProjectStats {
  /** Total de proyectos */
  total: number;
  /** Total de proyectos publicados */
  published: number;
  /** Total de vistas acumuladas */
  totalViews: number;
  /** Total de descargas acumuladas */
  totalDownloads: number;
}

/**
 * Componente principal para la gestión de proyectos del vendedor.
 * 
 * Funcionalidades principales:
 * - Visualización de todos los proyectos del vendedor
 * - Estadísticas en tiempo real (total, publicados, vistas, descargas)
 * - Navegación a la página de subida de proyectos
 * - Gestión de estados de carga y error
 * - Transformación de datos para compatibilidad con ProjectCardComponent
 * 
 * @class SellerProjectsComponent
 * @implements {OnInit}
 */

@Component({
  selector: 'app-seller-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, ProjectCardComponent, BackButtonComponent],
  templateUrl: './seller-projects.html',
  styleUrls: ['./seller-projects.scss']
})
export class SellerProjectsComponent implements OnInit {
  
  // ========================================
  // PROPIEDADES DEL COMPONENTE
  // ========================================
  
  /** Usuario autenticado actualmente */
  currentUser: User | null = null;
  
  /** Lista de proyectos del vendedor */
  projects: SellerProject[] = [];
  
  /** Estadísticas globales de los proyectos */
  stats: ProjectStats = {
    total: 0,
    published: 0,
    totalViews: 0,
    totalDownloads: 0
  };
  
  /** Indica si se están cargando los datos */
  isLoading = true;
  
  /** Mensaje de error si ocurre algún problema */
  error: string | null = null;

  // ========================================
  // CONSTRUCTOR E INICIALIZACIÓN
  // ========================================

  /**
   * Constructor del componente.
   * Inicializa los servicios necesarios para la gestión de proyectos.
   * 
   * @param {Router} router - Servicio de navegación entre rutas
   * @param {ActivatedRoute} route - Ruta activa actual
   * @param {AuthService} authService - Servicio de autenticación
   * @param {ApiService} apiService - Servicio de llamadas a la API
   * @param {NotificationService} notificationService - Servicio de notificaciones
   * @param {LoggerService} logger - Servicio de logging
   */
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private logger: LoggerService
  ) {}

  /**
   * Hook de inicialización del componente.
   * Carga el usuario y sus proyectos al iniciar.
   * 
   * @returns {void}
   */
  ngOnInit(): void {
    this.loadUserAndProjects();
  }

  // ========================================
  // MÉTODOS DE CARGA DE DATOS
  // ========================================

  /**
   * Carga el usuario autenticado y sus proyectos.
   * Redirige al login si no hay usuario autenticado.
   * 
   * @private
   * @returns {Promise<void>}
   */
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

  /**
   * Carga todos los proyectos del vendedor desde la API.
   * Actualiza las estadísticas automáticamente.
   * 
   * @returns {Promise<void>}
   */
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

  // ========================================
  // MÉTODOS DE CÁLCULO DE ESTADÍSTICAS
  // ========================================

  /**
   * Calcula el número total de proyectos publicados.
   * 
   * @returns {number} Cantidad de proyectos con estado PUBLICADO o DESTACADO
   */
  getPublishedCount(): number {
    return this.projects.filter(p => p.status === 'PUBLICADO' || p.status === 'DESTACADO').length;
  }

  /**
   * Calcula el total de vistas de todos los proyectos.
   * 
   * @returns {number} Suma de vistas de todos los proyectos
   */
  getTotalViews(): number {
    return this.projects.reduce((total, project) => total + project.views, 0);
  }

  /**
   * Calcula el total de descargas de todos los proyectos.
   * 
   * @returns {number} Suma de descargas de todos los proyectos
   */
  getTotalDownloads(): number {
    return this.projects.reduce((total, project) => total + project.downloads, 0);
  }

  /**
   * Calcula las estadísticas completas de los proyectos.
   * Se usa como fallback si la API no devuelve estadísticas.
   * 
   * @returns {ProjectStats} Objeto con todas las estadísticas calculadas
   */
  calculateStats(): ProjectStats {
    return {
      total: this.projects.length,
      published: this.projects.filter(p => p.status === 'PUBLICADO' || p.status === 'DESTACADO').length,
      totalViews: this.projects.reduce((sum, p) => sum + p.views, 0),
      totalDownloads: this.projects.reduce((sum, p) => sum + p.downloads, 0)
    };
  }

  // ========================================
  // MÉTODOS DE TRANSFORMACIÓN
  // ========================================

  /**
   * Transforma un SellerProject a ProjectCard para usar con ProjectCardComponent.
   * Adapta la estructura de datos para compatibilidad con el componente de tarjeta.
   * 
   * @param {SellerProject} project - Proyecto del vendedor a transformar
   * @returns {ProjectCard} Proyecto transformado en formato ProjectCard
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

  // ========================================
  // MÉTODOS DE NAVEGACIÓN
  // ========================================

  /**
   * Navega a la página de subida de proyectos.
   * 
   * @returns {void}
   */
  navigateToUpload(): void {
    this.router.navigate(['/vendedor/subir-proyecto']);
  }

}