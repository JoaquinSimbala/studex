import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService, User } from '../../services/auth.service';
import { Navbar } from '../../components/navbar/navbar';
import { ProjectCardComponent, ProjectCard } from '../../components/project-card/project-card';

interface FilterOptions {
  type: string;
  category: string;
  university: string;
  materia: string;
  minPrice: number | null;
  maxPrice: number | null;
  orderBy: string;
}

interface ProjectStats {
  total: number;
  universities: number;
  categories: number;
}

interface Category {
  id: number;
  nombre: string;
  descripcion?: string;
  icono?: string;
  colorHex: string;
}

@Component({
  selector: 'app-explore',
  imports: [CommonModule, FormsModule, RouterModule, Navbar, ProjectCardComponent],
  templateUrl: './explore.html',
  styleUrl: './explore.scss'
})
export class ExploreComponent implements OnInit {
  currentUser: User | null = null;
  projects: ProjectCard[] = [];
  stats: ProjectStats = {
    total: 0,
    universities: 0,
    categories: 0
  };
  
  isLoading = true;
  error: string | null = null;
  searchQuery = '';
  
  // Paginación
  currentPage = 1;
  pageSize = 12;
  hasMoreProjects = true;
  isLoadingMore = false;
  
  // Filtros
  filters: FilterOptions = {
    type: '',
    category: '',
    university: '',
    materia: '',
    minPrice: null,
    maxPrice: null,
    orderBy: 'newest'
  };

  // Opciones para los dropdowns
  projectTypes = [
    { value: '', label: 'Todos' },
    { value: 'SOFTWARE', label: 'Software' },
    { value: 'INVESTIGACION', label: 'Investigación' },
    { value: 'PROYECTO_FINAL', label: 'Proyecto Final' },
    { value: 'TEXTO_ARGUMENTATIVO', label: 'Ensayo' },
    { value: 'PRESENTACION', label: 'Presentación' },
    { value: 'ANALISIS_CASO', label: 'Análisis de Caso' },
    { value: 'OTRO', label: 'Otro' }
  ];

  categories: Category[] = [];
  categoriesOptions = [{ value: '', label: 'Todas las categorías' }];

  orderOptions = [
    { value: 'newest', label: 'Más recientes' },
    { value: 'oldest', label: 'Más antiguos' },
    { value: 'price_asc', label: 'Precio: menor a mayor' },
    { value: 'price_desc', label: 'Precio: mayor a menor' },
    { value: 'rating', label: 'Mejor calificados' },
    { value: 'popular', label: 'Más populares' }
  ];

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadCategories();
    
    // Verificar si hay parámetros de consulta para pre-filtrar
    this.route.queryParams.subscribe(params => {
      // Reiniciar paginación cuando cambian los parámetros
      this.currentPage = 1;
      this.hasMoreProjects = true;
      
      if (params['category']) {
        this.filters.category = params['category'];
        console.log('📂 Categoría pre-seleccionada:', params['category']);
      }
      if (params['q']) {
        this.searchQuery = params['q'];
        console.log('🔍 Búsqueda pre-cargada:', params['q']);
      }
      this.loadProjects();
    });
  }

  /**
   * Carga las categorías desde la API
   */
  async loadCategories(): Promise<void> {
    try {
      const response = await this.apiService.get('/projects/categories').toPromise();
      
      if (response?.success && response.data) {
        this.categories = response.data as Category[];
        this.categoriesOptions = [
          { value: '', label: 'Todas las categorías' },
          ...this.categories.map(cat => ({ value: cat.nombre, label: cat.nombre }))
        ];
        console.log('✅ Categorías cargadas:', this.categories.length);
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
      // Fallback a categorías básicas
      this.categoriesOptions = [
        { value: '', label: 'Todas las categorías' },
        { value: 'Software', label: 'Software' },
        { value: 'Investigación', label: 'Investigación' },
        { value: 'Ingeniería', label: 'Ingeniería' }
      ];
    }
  }

  /**
   * Carga los proyectos según los filtros actuales
   */
  async loadProjects(): Promise<void> {
    try {
      // Solo mostrar el loading principal si es la primera página
      if (this.currentPage === 1) {
        this.isLoading = true;
      }
      this.error = null;

      // Construir parámetros de consulta
      const queryParams: any = {};
      
      if (this.searchQuery) queryParams.search = this.searchQuery;
      if (this.filters.type) queryParams.type = this.filters.type;
      if (this.filters.category) queryParams.category = this.filters.category;
      if (this.filters.university) queryParams.university = this.filters.university;
      if (this.filters.materia) queryParams.career = this.filters.materia;
      if (this.filters.minPrice) queryParams.minPrice = this.filters.minPrice;
      if (this.filters.maxPrice) queryParams.maxPrice = this.filters.maxPrice;
      queryParams.orderBy = this.filters.orderBy;
      queryParams.limit = this.pageSize;
      queryParams.page = this.currentPage;

      // Llamar a la API
      const response = await this.apiService.get('/projects/explore', queryParams).toPromise();
      
      if (response?.success) {
        const newProjects = (response.data || []) as ProjectCard[];
        
        if (this.currentPage === 1) {
          // Primera carga o después de filtros
          this.projects = newProjects;
        } else {
          // Carga más proyectos (concatenar)
          this.projects = [...this.projects, ...newProjects];
        }
        
        // Verificar si hay más proyectos
        this.hasMoreProjects = newProjects.length === this.pageSize;
        
        if ((response as any).stats) {
          this.stats = (response as any).stats;
        }
        console.log('✅ Proyectos cargados:', newProjects.length, 'Total:', this.projects.length);
      } else {
        throw new Error(response?.message || 'Error al cargar proyectos');
      }

    } catch (error) {
      console.error('Error cargando proyectos:', error);
      this.error = 'Error al cargar los proyectos. Inténtalo de nuevo.';
      // Fallback a datos mock en caso de error solo si es la primera página
      if (this.currentPage === 1) {
        this.loadMockData();
      }
    } finally {
      if (this.currentPage === 1) {
        this.isLoading = false;
      }
    }
  }

  /**
   * Aplica los filtros seleccionados
   */
  applyFilters(): void {
    // Reiniciar paginación al aplicar filtros
    this.currentPage = 1;
    this.hasMoreProjects = true;
    this.loadProjects();
  }

  /**
   * Carga más proyectos (paginación)
   */
  async loadMoreProjects(): Promise<void> {
    if (!this.hasMoreProjects || this.isLoadingMore) {
      return;
    }

    try {
      this.isLoadingMore = true;
      this.currentPage++;
      await this.loadProjects();
    } catch (error) {
      console.error('Error cargando más proyectos:', error);
      // Revertir la página si hay error
      this.currentPage--;
    } finally {
      this.isLoadingMore = false;
    }
  }

  /**
   * Datos mock como fallback
   */
  private loadMockData(): void {
    this.projects = [
      {
        id: 1,
        title: 'Sistema de Gestión de Biblioteca Universitaria',
        description: 'Sistema completo de gestión de biblioteca universitaria desarrollado en Python con Django.',
        price: 120,
        type: 'SOFTWARE',
        university: 'Universidad Nacional de Ingeniería (UNI)',
        category: 'Software',
        year: 2024,
        rating: 4.8,
        views: 256,
        mainImage: {
          fileUrl: 'https://via.placeholder.com/400x300/10B981/ffffff?text=Sistema+Biblioteca',
          fileName: 'sistema-biblioteca.jpg'
        },
        isFavorite: false,
        seller: {
          id: 1,
          name: 'Carlos Mendoza Silva',
          avatar: 'https://ui-avatars.com/api/?name=Carlos+Mendoza&background=10B981&color=ffffff&size=40',
          rating: 4.9,
          salesCount: 23
        },
        featured: true
      }
    ];
    
    this.stats = {
      total: this.projects.length,
      universities: 1,
      categories: 1
    };
  }

  /**
   * Maneja la búsqueda
   */
  onSearch(): void {
    this.applyFilters();
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters(): void {
    this.filters = {
      type: '',
      category: '',
      university: '',
      materia: '',
      minPrice: null,
      maxPrice: null,
      orderBy: 'newest'
    };
    this.searchQuery = '';
    this.loadProjects();
  }

  /**
   * Maneja el click en una tarjeta de proyecto
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
   * Maneja el click en favorito
   */
  handleFavoriteClick(project: ProjectCard): void {
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    
    // TODO: Implementar lógica de favoritos
    project.isFavorite = !project.isFavorite;
    console.log('Toggle favorite:', project.id, project.isFavorite);
  }

  /**
   * Track by function para ngFor
   */
  trackByProjectId(index: number, project: ProjectCard): number {
    return project.id;
  }

  /**
   * Obtiene la etiqueta del tipo de proyecto
   */
  getProjectTypeLabel(type: string): string {
    const typeObj = this.projectTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  }
}