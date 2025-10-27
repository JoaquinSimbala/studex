import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { FavoritesService } from '../../services/favorites.service';
import { Navbar } from '../../components/navbar/navbar';
import { ProjectCardComponent, ProjectCard } from '../../components/project-card/project-card';

// Usar la interfaz ProjectCard del componente

interface QuickFilter {
  id: string;
  name: string;
  type: string;
  icon?: string;
}

interface CategoryDB {
  id: number;
  nombre: string;
  descripcion?: string;
  icono?: string;
  colorHex: string;
  ordenDisplay?: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Navbar, ProjectCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {

  // Usuario actual
  currentUser: User | null = null;

  // Estado de búsqueda
  searchQuery = '';

  // Proyectos destacados
  featuredProjects: ProjectCard[] = [];
  isLoading = false;

  // Categorías populares desde la BD
  popularCategories: CategoryDB[] = [];
  loadingCategories = false;

  // Inyectar FavoritesService
  private favoritesService = inject(FavoritesService);

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  /**
   * Inicializa el componente
   */
  private async initializeComponent(): Promise<void> {
    // Suscribirse al usuario actual
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Cargar favoritos primero para sincronizar estados
    if (this.authService.isAuthenticated()) {
      await this.favoritesService.loadFavorites().toPromise();
    }

    // Cargar categorías populares y proyectos destacados
    await Promise.all([
      this.loadPopularCategories(),
      this.loadFeaturedProjects()
    ]);
  }

  /**
   * Carga las categorías populares desde la BD
   */
  private async loadPopularCategories(): Promise<void> {
    this.loadingCategories = true;
    
    try {
      console.log('🔄 Cargando categorías populares desde API...');
      const response = await this.apiService.get('/projects/categories').toPromise();

      if (response?.success && response.data) {
        // Ordenar por ordenDisplay y tomar las primeras 5
        const allCategories = response.data as CategoryDB[];
        this.popularCategories = allCategories
          .sort((a, b) => (a.ordenDisplay || 999) - (b.ordenDisplay || 999))
          .slice(0, 5);
        
        console.log('✅ Categorías populares cargadas:', this.popularCategories.length);
        console.log('📂 Categorías:', this.popularCategories);
      } else {
        console.warn('⚠️ No se pudieron cargar categorías desde la API');
        this.popularCategories = [];
      }
    } catch (error) {
      console.error('❌ Error cargando categorías populares:', error);
      this.popularCategories = [];
    } finally {
      this.loadingCategories = false;
    }
  }

  /**
   * Carga los proyectos destacados
   */
  private async loadFeaturedProjects(): Promise<void> {
    this.isLoading = true;
    
    try {
      console.log('🔄 Cargando proyectos destacados desde API...');
      const response = await this.apiService.getFeaturedProjects(6).toPromise();

      console.log('📡 Respuesta de API:', response);

      if (response?.success && response.data) {
        this.featuredProjects = response.data.map((projectData: any) => this.transformProjectData(projectData));
        console.log('✅ Proyectos destacados cargados desde BD:', this.featuredProjects.length);
        console.log('📚 Proyectos transformados:', this.featuredProjects);
      } else {
        console.warn('⚠️ Respuesta de API vacía o incorrecta, usando datos mock');
        this.featuredProjects = this.getMockProjects();
      }
    } catch (error) {
      console.error('❌ Error cargando proyectos destacados:', error);
      // Datos mock para desarrollo si falla la API
      this.featuredProjects = this.getMockProjects();
      console.log('🔄 Usando datos mock como fallback');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Función trackBy para optimizar renderizado de lista de proyectos
   */
  trackByProjectId(index: number, project: ProjectCard): number {
    return project.id;
  }

  /**
   * Transforma los datos del proyecto desde la API
   */
  private transformProjectData(projectData: any): ProjectCard {
    return {
      id: projectData.id,
      title: projectData.title,
      description: projectData.description,
      price: Number(projectData.price),
      type: projectData.type,
      university: projectData.university,
      category: projectData.category?.nombre || projectData.subject || 'General',
      year: projectData.year,
      rating: projectData.averageRating || 4.5,
      views: projectData.views || 0,
      mainImage: projectData.mainImage || (projectData.images?.[0] ? { fileUrl: projectData.images[0].fileUrl, fileName: projectData.images[0].fileName } : null),
      isFavorite: this.authService.isAuthenticated() ? this.favoritesService.isFavorite(projectData.id) : false, // Sincronizar con estado real de favoritos
      seller: {
        id: projectData.seller.id,
        name: projectData.seller.name || `${projectData.seller.nombre || ''} ${projectData.seller.apellidos || ''}`.trim(),
        avatar: projectData.seller.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(projectData.seller.name || 'Usuario')}&background=007bff&color=ffffff&size=40`,
        rating: Number(projectData.seller.rating || projectData.seller.calificacionVendedor || 4.0),
        salesCount: projectData.seller.salesCount || projectData.seller.totalVentas || 0
      }
    };
  }

  /**
   * Obtiene datos mock para desarrollo
   */
  private getMockProjects(): ProjectCard[] {
    return [
      {
        id: 1,
        title: 'Sistema de Gestión de Inventarios con Laravel y Vue.js',
        description: 'Sistema completo de gestión de inventarios para empresas medianas, desarrollado con Laravel como backend y Vue.js para el frontend. Incluye módulos de ventas, compras, reportes y dashboard administrativo con gráficos interactivos.',
        price: 89,
        type: 'SOFTWARE',
        university: 'Universidad Nacional de Ingeniería (UNI)',
        category: 'Software',
        year: 2024,
        rating: 4.9,
        views: 156,
        mainImage: {
          fileUrl: 'https://via.placeholder.com/400x300/10B981/ffffff?text=Dashboard+Inventarios',
          fileName: 'dashboard-inventarios.jpg'
        },
        isFavorite: false,
        seller: {
          id: 1,
          name: 'Carlos Mendoza Silva',
          avatar: 'https://ui-avatars.com/api/?name=Carlos+Mendoza&background=10B981&color=ffffff&size=40',
          rating: 4.9,
          salesCount: 23
        }
      },
      {
        id: 2,
        title: 'Análisis de Mercado - Marketing Digital para Startups',
        description: 'Investigación completa sobre estrategias de marketing digital para startups peruanas. Este estudio analiza las tendencias actuales del mercado digital en Perú y proporciona un marco estratégico para empresas emergentes.',
        price: 45,
        type: 'INVESTIGACION',
        university: 'Pontificia Universidad Católica del Perú (PUCP)',
        category: 'Investigación',
        year: 2024,
        rating: 4.7,
        views: 89,
        mainImage: {
          fileUrl: 'https://via.placeholder.com/400x300/3B82F6/ffffff?text=Marketing+Research',
          fileName: 'marketing-research.jpg'
        },
        isFavorite: false,
        seller: {
          id: 2,
          name: 'María González Vargas',
          avatar: 'https://ui-avatars.com/api/?name=Maria+Gonzalez&background=3B82F6&color=ffffff&size=40',
          rating: 4.7,
          salesCount: 18
        }
      },
      {
        id: 3,
        title: 'Aplicación Móvil de Delivery con React Native',
        description: 'Aplicación móvil completa para servicio de delivery de comida, desarrollada con React Native. El sistema incluye tres aplicaciones: clientes, restaurantes y repartidores, todas conectadas a un backend robusto con geolocalización en tiempo real.',
        price: 120,
        type: 'SOFTWARE',
        university: 'Universidad de Lima',
        category: 'Software',
        year: 2024,
        rating: 4.8,
        views: 234,
        mainImage: {
          fileUrl: 'https://via.placeholder.com/400x300/8B5CF6/ffffff?text=Delivery+App',
          fileName: 'delivery-app.jpg'
        },
        isFavorite: false,
        seller: {
          id: 3,
          name: 'Diego Ramírez Castillo',
          avatar: 'https://ui-avatars.com/api/?name=Diego+Ramirez&background=8B5CF6&color=ffffff&size=40',
          rating: 4.8,
          salesCount: 31
        }
      }
    ];
  }

  /**
   * Maneja la búsqueda desde el home
   */
  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/explorar'], { 
        queryParams: { q: this.searchQuery.trim() }
      });
    }
  }

  /**
   * Maneja click en búsquedas populares
   */
  onPopularSearch(searchTerm: string): void {
    this.router.navigate(['/explorar'], { 
      queryParams: { q: searchTerm }
    });
  }

  /**
   * Aplica un filtro rápido
   */
  applyQuickFilter(filter: QuickFilter): void {
    this.router.navigate(['/explorar'], { 
      queryParams: { [filter.type]: filter.id }
    });
  }

  /**
   * Navega a explorar con la categoría seleccionada
   */
  selectPopularCategory(category: CategoryDB): void {
    this.router.navigate(['/explorar'], { 
      queryParams: { category: category.nombre }
    });
  }

  /**
   * Ver detalles de un proyecto
   */
  viewProject(project: ProjectCard): void {
    // Si el usuario actual es el propietario del proyecto, navegar a vista de vendedor
    if (this.currentUser && project.seller.id === parseInt(this.currentUser.id)) {
      this.router.navigate(['/vendedor/proyecto', project.id]);
    } else {
      // Vista pública para otros usuarios
      this.router.navigate(['/proyecto', project.id]);
    }
  }

  /**
   * Manejar click de favorito desde ProjectCard
   */
  handleFavoriteClick(project: ProjectCard): void {
    if (!this.currentUser) {
      // Si no hay usuario, redirigir al login
      this.router.navigate(['/login']);
      return;
    }

    // El ProjectCardComponent ya maneja la lógica internamente
    // Solo necesitamos actualizar el estado local del proyecto
    // La sincronización con el backend la maneja el ProjectCardComponent
    console.log('Favorito toggled para proyecto:', project.id);
  }

  /**
   * Ver todos los proyectos
   */
  viewAllProjects(): void {
    this.router.navigate(['/explorar']);
  }

  /**
   * Cargar más proyectos
   */
  loadMoreProjects(): void {
    this.router.navigate(['/explorar']);
  }

  /**
   * Obtiene la etiqueta del tipo de proyecto
   */
  getProjectTypeLabel(type: string): string {
    const typeLabels: { [key: string]: string } = {
      'SOFTWARE': 'Software',
      'INVESTIGACION': 'Investigación',
      'PROYECTO_FINAL': 'Proyecto Final',
      'TEXTO_ARGUMENTATIVO': 'Ensayo',
      'PRESENTACION': 'Presentación',
      'ANALISIS_CASO': 'Análisis de Caso',
      'OTRO': 'Otro'
    };
    return typeLabels[type] || type;
  }

  /**
   * Maneja errores de carga de imágenes
   */
  onImageError(event: any): void {
    console.log('Error cargando imagen, usando placeholder');
    event.target.src = 'https://via.placeholder.com/400x300/e5e7eb/6b7280?text=Sin+Imagen';
  }
}
