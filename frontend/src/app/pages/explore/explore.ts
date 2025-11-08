import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService, User } from '../../services/auth.service';
import { SearchHistoryService } from '../../services/search-history.service';
import { Navbar } from '../../components/navbar/navbar';
import { ProjectCardComponent, ProjectCard } from '../../components/project-card/project-card';

/**
 * Interfaz para opciones de filtrado de proyectos
 * 
 * @description
 * Define todos los criterios de filtrado disponibles en la página de exploración.
 * Se utiliza para construir los query params que se envían a la API.
 */
interface FilterOptions {
  /** Tipo de proyecto (SOFTWARE, INVESTIGACION, PROYECTO_FINAL, etc.) */
  type: string;
  /** Categoría del proyecto (Software, Investigación, Ingeniería, etc.) */
  category: string;
  /** Universidad del proyecto (texto libre) */
  university: string;
  /** Materia o carrera relacionada al proyecto */
  materia: string;
  /** Precio mínimo del proyecto (null = sin límite) */
  minPrice: number | null;
  /** Precio máximo del proyecto (null = sin límite) */
  maxPrice: number | null;
  /** Criterio de ordenamiento (newest, oldest, price_asc, price_desc, rating, popular) */
  orderBy: string;
}

/**
 * Interfaz para estadísticas de proyectos
 * 
 * @description
 * Contiene las estadísticas generales mostradas en el hero section.
 * Se actualiza con cada respuesta de la API.
 */
interface ProjectStats {
  /** Total de proyectos que cumplen los criterios actuales */
  total: number;
  /** Número de universidades representadas */
  universities: number;
  /** Número de categorías disponibles */
  categories: number;
}

/**
 * Interfaz para categorías desde la base de datos
 * 
 * @description
 * Define la estructura de las categorías obtenidas desde el backend.
 * Se utiliza para poblar el dropdown de filtros de categoría.
 */
interface Category {
  /** Identificador único de la categoría */
  id: number;
  /** Nombre de la categoría */
  nombre: string;
  /** Descripción opcional de la categoría */
  descripcion?: string;
  /** Emoji o icono de la categoría */
  icono?: string;
  /** Color hexadecimal de la categoría */
  colorHex: string;
}

/**
 * Componente de la página de exploración de proyectos de STUDEX
 * 
 * @description
 * Gestiona la página principal de exploración donde los usuarios pueden:
 * - Buscar proyectos por texto libre
 * - Filtrar por tipo, categoría, universidad, materia y precio
 * - Ordenar resultados por diferentes criterios
 * - Ver estadísticas generales de la plataforma
 * - Navegar mediante paginación infinita (Load More)
 * 
 * El componente se integra con:
 * - ApiService para obtener proyectos y categorías
 * - AuthService para obtener el usuario actual
 * - ProjectCardComponent para mostrar cada proyecto
 * - ActivatedRoute para pre-filtrar desde parámetros de URL
 * 
 * @example
 * ```html
 * <!-- Navegación directa -->
 * <a routerLink="/explorar">Explorar</a>
 * 
 * <!-- Con parámetros de búsqueda -->
 * <a [routerLink]="['/explorar']" [queryParams]="{q: 'tesis', category: 'Software'}">Buscar</a>
 * ```
 */
@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Navbar, ProjectCardComponent],
  templateUrl: './explore.html',
  styleUrl: './explore.scss'
})
export class ExploreComponent implements OnInit {
  
  /**
   * Usuario actualmente autenticado en la plataforma
   * 
   * @description
   * Se obtiene del AuthService al inicializar el componente.
   * Null si el usuario no está autenticado.
   */
  currentUser: User | null = null;

  /**
   * Array de proyectos mostrados en la página
   * 
   * @description
   * Se carga desde la API con loadProjects().
   * Se concatena con nuevos proyectos al cargar más (paginación).
   */
  projects: ProjectCard[] = [];

  /**
   * Estadísticas generales de la plataforma
   * 
   * @description
   * Se muestra en el hero section con tres métricas:
   * - Total de proyectos encontrados
   * - Número de universidades
   * - Número de categorías
   */
  stats: ProjectStats = {
    total: 0,
    universities: 0,
    categories: 0
  };
  
  /**
   * Indica si se están cargando los proyectos inicialmente
   * 
   * @description
   * True durante la primera carga de proyectos.
   * False al completar o cuando se usa paginación (Load More).
   */
  isLoading = true;

  /**
   * Mensaje de error si falla la carga de proyectos
   * 
   * @description
   * Null si no hay errores.
   * String con el mensaje de error si falla la petición a la API.
   */
  error: string | null = null;

  /**
   * Texto de búsqueda ingresado por el usuario
   * 
   * @description
   * Se vincula con [(ngModel)] en el input de búsqueda.
   * Se puede pre-cargar desde queryParams 'q'.
   */
  searchQuery = '';
  
  /**
   * Número de página actual para paginación
   * 
   * @description
   * Inicia en 1 y se incrementa al hacer "Load More".
   * Se reinicia a 1 al aplicar filtros o cambiar búsqueda.
   */
  currentPage = 1;

  /**
   * Número de proyectos a cargar por página
   * 
   * @description
   * Define el tamaño del lote en cada petición a la API.
   * Valor fijo de 12 proyectos por página.
   */
  pageSize = 12;

  /**
   * Indica si hay más proyectos disponibles para cargar
   * 
   * @description
   * True si la última respuesta de la API devolvió pageSize proyectos.
   * False si devolvió menos, indicando que no hay más páginas.
   * Se usa para mostrar/ocultar el botón "Load More".
   */
  hasMoreProjects = true;

  /**
   * Indica si se están cargando más proyectos (paginación)
   * 
   * @description
   * True durante la petición de "Load More".
   * Controla el spinner en el botón de paginación.
   */
  isLoadingMore = false;
  
  /**
   * Objeto con todos los filtros aplicados actualmente
   * 
   * @description
   * Se sincronizan con los inputs del template mediante [(ngModel)].
   * Al cambiar cualquier filtro, se llama a applyFilters().
   */
  filters: FilterOptions = {
    type: '',
    category: '',
    university: '',
    materia: '',
    minPrice: null,
    maxPrice: null,
    orderBy: 'newest'
  };

  /**
   * Array de opciones para el dropdown de tipo de proyecto
   * 
   * @description
   * Se carga dinámicamente desde la API mediante loadProjectTypes().
   * Contiene todos los tipos de proyecto disponibles en la base de datos.
   * Se usa con *ngFor en el template.
   */
  projectTypes: Array<{ value: string; label: string }> = [
    { value: '', label: 'Todos' }
  ];

  /**
   * Array de categorías cargadas desde la base de datos
   * 
   * @description
   * Se obtiene de la API mediante loadCategories().
   * Se usa para poblar categoriesOptions.
   */
  categories: Category[] = [];

  /**
   * Array de opciones para el dropdown de categorías
   * 
   * @description
   * Inicia con "Todas las categorías" y se complementa con las
   * categorías obtenidas de la API.
   */
  categoriesOptions = [{ value: '', label: 'Todas las categorías' }];

  /**
   * Array de opciones para el dropdown de ordenamiento
   * 
   * @description
   * Define los criterios disponibles para ordenar los resultados.
   * Los valores corresponden con la lógica implementada en el backend.
   * Estos valores son estándar y no requieren cargarse desde la API.
   */
  orderOptions = [
    { value: 'newest', label: 'Más recientes' },
    { value: 'oldest', label: 'Más antiguos' },
    { value: 'price_asc', label: 'Precio: menor a mayor' },
    { value: 'price_desc', label: 'Precio: mayor a menor' },
    { value: 'rating', label: 'Mejor calificados' },
    { value: 'popular', label: 'Más populares' }
  ];

  /**
   * Constructor del componente ExploreComponent
   * 
   * @param apiService - Servicio para realizar peticiones HTTP a la API
   * @param authService - Servicio de autenticación de usuarios
   * @param router - Router de Angular para navegación
   * @param route - ActivatedRoute para acceder a queryParams
   * @param searchHistoryService - Servicio para gestionar historial de búsquedas
   */
  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private searchHistoryService: SearchHistoryService
  ) {}

  /**
   * Hook de ciclo de vida que se ejecuta al inicializar el componente
   * 
   * @description
   * Realiza las siguientes operaciones en orden:
   * 1. Obtiene el usuario actual del AuthService
   * 2. Carga los tipos de proyecto desde la API
   * 3. Carga las categorías desde la API
   * 4. Suscribe a queryParams para detectar navegación con parámetros
   * 5. Pre-carga filtros si hay parámetros en la URL (q, category, etc.)
   * 6. Carga los proyectos según los filtros aplicados
   * 
   * La suscripción a queryParams permite que el componente reaccione
   * a cambios en la URL, facilitando la navegación desde otras páginas
   * con búsquedas o filtros pre-aplicados.
   */
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadProjectTypes();
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
        
        // Guardar búsqueda en historial si está autenticado
        if (this.currentUser && params['q'].trim()) {
          this.searchHistoryService.saveSearch(params['q'].trim()).subscribe();
        }
      }
      this.loadProjects();
    });
  }

  /**
   * Carga los tipos de proyecto disponibles desde la API
   * 
   * @description
   * Obtiene todos los tipos de proyecto desde el endpoint /projects/types.
   * Los tipos vienen organizados por categorías desde el backend.
   * 
   * Si la petición es exitosa, transforma los tipos a formato
   * { value, label } para poblar el dropdown de filtros.
   * 
   * Si falla, mantiene solo la opción "Todos" para no romper
   * la experiencia del usuario.
   * 
   * @private
   * @async
   * @returns Promise<void>
   */
  async loadProjectTypes(): Promise<void> {
    try {
      console.log('📋 Cargando tipos de proyecto desde API...');
      const response = await this.apiService.get('/projects/types').toPromise();
      
      if (response?.success && response.data && Array.isArray(response.data)) {
        // Transformar los tipos de proyecto al formato esperado
        const types = (response.data as any[]).map((type: any) => ({
          value: type.value,
          label: type.label
        }));
        
        this.projectTypes = [
          { value: '', label: 'Todos' },
          ...types
        ];
        
        console.log('✅ Tipos de proyecto cargados:', this.projectTypes.length - 1); // -1 para no contar "Todos"
      }
    } catch (error) {
      console.error('❌ Error cargando tipos de proyecto:', error);
      // Mantener solo "Todos" si falla la carga
      this.projectTypes = [{ value: '', label: 'Todos' }];
    }
  }

  /**
   * Carga las categorías disponibles desde la API
   * 
   * @description
   * Obtiene todas las categorías de la base de datos mediante
   * el endpoint /projects/categories.
   * 
   * Si la petición es exitosa, transforma las categorías a formato
   * { value, label } para poblar el dropdown de filtros.
   * 
   * Si falla, usa categorías básicas como fallback para no romper
   * la experiencia del usuario.
   * 
   * @private
   * @async
   * @returns Promise<void>
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
   * Carga los proyectos desde la API según los filtros actuales
   * 
   * @description
   * Función principal de carga de proyectos que:
   * 1. Construye los query params desde searchQuery y filters
   * 2. Incluye parámetros de paginación (page, limit)
   * 3. Realiza la petición HTTP a /projects/explore
   * 4. Transforma la respuesta en formato ProjectCard[]
   * 5. Maneja paginación (concatena o reemplaza proyectos)
   * 6. Actualiza estadísticas si vienen en la respuesta
   * 7. Controla hasMoreProjects para el botón "Load More"
   * 
   * Si falla la petición y es la primera página, carga datos mock
   * como fallback para desarrollo.
   * 
   * Controla los estados de carga mediante isLoading (primera página)
   * e isLoadingMore (páginas siguientes).
   * 
   * @private
   * @async
   * @returns Promise<void>
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
   * Aplica los filtros seleccionados y recarga los proyectos
   * 
   * @description
   * Se llama automáticamente cuando el usuario cambia cualquier filtro:
   * - Select de tipo, categoría u ordenamiento (evento change)
   * - Inputs de universidad, materia o precio (evento keyup)
   * 
   * Reinicia la paginación a página 1 y resetea hasMoreProjects.
   * Luego llama a loadProjects() para obtener los resultados filtrados.
   */
  applyFilters(): void {
    // Reiniciar paginación al aplicar filtros
    this.currentPage = 1;
    this.hasMoreProjects = true;
    this.loadProjects();
  }

  /**
   * Carga la siguiente página de proyectos (paginación)
   * 
   * @description
   * Se activa al hacer clic en el botón "Cargar Más Proyectos".
   * 
   * Verifica que:
   * - Haya más proyectos disponibles (hasMoreProjects)
   * - No se esté cargando actualmente (isLoadingMore)
   * 
   * Incrementa currentPage y llama a loadProjects() para concatenar
   * nuevos proyectos al array existente.
   * 
   * Si falla la petición, revierte el incremento de página.
   * 
   * @async
   * @returns Promise<void>
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

  // ========================================
  // ⚠️ MÉTODO DE FALLBACK - Solo para desarrollo
  // ========================================
  // Este método proporciona datos mock cuando falla la API.
  // No debería usarse en producción. Se mantiene solo como
  // medida de seguridad durante el desarrollo.
  //
  /**
   * Carga datos mock como fallback cuando falla la API
   * 
   * @description
   * ⚠️ SOLO PARA DESARROLLO - No usar en producción
   * 
   * Proporciona un proyecto de ejemplo cuando la petición a la API falla.
   * Esto evita que la página quede completamente vacía durante el desarrollo
   * si el backend no está disponible.
   * 
   * En producción, debería mostrarse el estado de error sin datos mock.
   * 
   * @private
   * @deprecated Solo para desarrollo
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
   * Ejecuta la búsqueda aplicando los filtros actuales
   * 
   * @description
   * Se activa al:
   * - Presionar Enter en el input de búsqueda
   * - Hacer clic en el botón de búsqueda del hero section
   * 
   * Internamente llama a applyFilters() que reinicia la paginación
   * y recarga los proyectos con el término de búsqueda actual.
   * 
   * También guarda la búsqueda en el historial si el usuario está autenticado.
   */
  onSearch(): void {
    // Guardar en historial si está autenticado y hay texto de búsqueda
    if (this.currentUser && this.searchQuery && this.searchQuery.trim()) {
      this.searchHistoryService.saveSearch(this.searchQuery.trim()).subscribe();
    }
    
    this.applyFilters();
  }

  /**
   * Limpia todos los filtros y búsqueda, reseteando a estado inicial
   * 
   * @description
   * Se activa al hacer clic en el botón "Limpiar Filtros".
   * 
   * Resetea:
   * - Todos los campos de filters a valores por defecto
   * - searchQuery a string vacío
   * - orderBy a 'newest' (más recientes)
   * 
   * Luego recarga los proyectos sin filtros aplicados,
   * mostrando todos los proyectos disponibles ordenados por fecha.
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

  // ========================================
  // ❌ MÉTODOS NO UTILIZADOS - Comentados
  // ========================================
  // ProjectCardComponent ahora maneja toda la navegación y favoritos internamente.
  // Estos métodos eran duplicados e innecesarios, ya que el componente hijo
  // gestiona estos eventos de forma independiente.
  //
  // viewProject(project: ProjectCard): void {
  //   if (this.currentUser && project.seller.id === parseInt(this.currentUser.id)) {
  //     this.router.navigate(['/vendedor/proyecto', project.id]);
  //   } else {
  //     this.router.navigate(['/proyecto', project.id]);
  //   }
  // }
  //
  // handleFavoriteClick(project: ProjectCard): void {
  //   if (!this.currentUser) {
  //     this.router.navigate(['/login']);
  //     return;
  //   }
  //   project.isFavorite = !project.isFavorite;
  //   console.log('Toggle favorite:', project.id, project.isFavorite);
  // }

  /**
   * Función trackBy para optimizar el renderizado de la lista de proyectos
   * 
   * @description
   * Angular usa esta función para determinar qué elementos de la lista han cambiado,
   * mejorando el rendimiento al re-renderizar solo los elementos modificados.
   * 
   * Esencial para listas grandes con paginación, evita re-renderizar todos
   * los proyectos al cargar más páginas.
   * 
   * @param index - Índice del elemento en el array
   * @param project - Objeto del proyecto
   * @returns ID único del proyecto para tracking
   */
  trackByProjectId(index: number, project: ProjectCard): number {
    return project.id;
  }

  // ========================================
  // ❌ MÉTODO NO UTILIZADO EN EL TEMPLATE
  // ========================================
  // Este método no se usa en explore.html ni en ningún componente hijo.
  // El tipo de proyecto se muestra directamente o se formatea en ProjectCardComponent.
  //
  // getProjectTypeLabel(type: string): string {
  //   const typeObj = this.projectTypes.find(t => t.value === type);
  //   return typeObj ? typeObj.label : type;
  // }
}