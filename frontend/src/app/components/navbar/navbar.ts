import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { CartService } from '../../services/cart.service';
import { NotificationsDropdownComponent } from '../notifications-dropdown/notifications-dropdown.component';

interface SearchResult {
  id: number;
  title: string;
  price: number;
  university: string;
  category: string;
  image?: string;
}

interface Category {
  id: number;
  nombre: string;
  descripcion?: string;
  icono?: string;
  colorHex: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NotificationsDropdownComponent],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class Navbar implements OnInit, OnDestroy {

  // Usuario actual
  currentUser: User | null = null;
  
  // Estados de UI
  showUserMenu = false;
  showMobileMenu = false;
  showMobileSearch = false;
  showSearchResults = false;
  showCart = false;
  showCategoriesModal = false;

  // Búsqueda
  searchQuery = '';
  searchResults: SearchResult[] = [];
  private searchSubject = new Subject<string>();

  // Categorías
  modalCategories: Category[] = [];
  loadingCategories = false;

  // Carrito
  cartItemsCount = 0;

  // Subscripciones
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router,
    private notificationService: NotificationService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Inicializa el componente
   */
  private initializeComponent(): void {
    // Suscribirse al usuario actual
    const userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadUserData();
      }
      // Forzar detección de cambios para actualizar la imagen inmediatamente
      this.cdr.detectChanges();
    });
    this.subscriptions.push(userSub);

    // Suscribirse al contador del carrito
    const cartSub = this.cartService.cartCount$.subscribe(count => {
      this.cartItemsCount = count;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(cartSub);
  }

  /**
   * Configura el debounce para la búsqueda
   */
  private setupSearchDebounce(): void {
    const searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query.trim().length > 2) {
        this.performSearch(query);
      } else {
        this.searchResults = [];
        this.showSearchResults = false;
      }
    });
    this.subscriptions.push(searchSub);
  }

  /**
   * Carga datos del usuario (carrito, etc.)
   */
  private async loadUserData(): Promise<void> {
    if (!this.currentUser) return;

    try {
      // El contador del carrito se maneja automáticamente via CartService subscription
      console.log('👤 Datos de usuario cargados');
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
    }
  }

  /**
   * Maneja la entrada de texto en la búsqueda
   */
  onSearchInput(event: any): void {
    const query = event.target.value;
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  /**
   * Realiza la búsqueda
   */
  async performSearch(query: string): Promise<void> {
    try {
      const response = await this.apiService.searchProjects(query, { limit: 5 }).toPromise();
      if (response?.success && response.data) {
        this.searchResults = response.data;
        this.showSearchResults = true;
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
      // Mock data para desarrollo
      this.searchResults = [
        {
          id: 1,
          title: 'Sistema de Gestión de Ventas con PHP y MySQL',
          price: 45,
          university: 'UPC',
          category: 'Software',
          image: '/assets/images/project1.jpg'
        },
        {
          id: 2,
          title: 'Análisis de Mercado - Marketing Digital',
          price: 30,
          university: 'PUCP',
          category: 'Investigación',
          image: '/assets/images/project2.jpg'
        }
      ].filter(p => p.title.toLowerCase().includes(query.toLowerCase()));
      this.showSearchResults = this.searchResults.length > 0;
    }
  }

  /**
   * Ejecuta la búsqueda
   */
  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/explorar'], { 
        queryParams: { q: this.searchQuery.trim() }
      });
      this.showSearchResults = false;
      this.closeMobileMenu();
    }
  }

  /**
   * Selecciona un resultado de búsqueda
   */
  selectSearchResult(result: SearchResult): void {
    this.router.navigate(['/proyecto', result.id]);
    this.showSearchResults = false;
    this.searchQuery = '';
  }

  /**
   * Toggle del menú de usuario
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.closeOtherMenus('user');
  }

  /**
   * Toggle del carrito
   */
  toggleCart(): void {
    this.router.navigate(['/carrito']);
    this.closeOtherMenus('cart');
  }

  /**
   * Toggle del menú móvil
   */
  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    this.closeOtherMenus('mobile');
  }

  /**
   * Toggle de búsqueda móvil
   */
  toggleMobileSearch(): void {
    this.showMobileSearch = !this.showMobileSearch;
  }

  /**
   * Cierra otros menús
   */
  private closeOtherMenus(except?: string): void {
    if (except !== 'user') this.showUserMenu = false;
    if (except !== 'cart') this.showCart = false;
    if (except !== 'mobile') this.showMobileMenu = false;
    if (except !== 'search') this.showSearchResults = false;
    if (except !== 'categories') this.showCategoriesModal = false;
  }

  /**
   * Cierra todos los menús
   */
  private closeAllMenus(): void {
    this.closeOtherMenus();
  }

  /**
   * Cierra el menú móvil
   */
  private closeMobileMenu(): void {
    this.showMobileMenu = false;
    this.showMobileSearch = false;
  }

  /**
   * Cierra sesión
   */
  logout(): void {
    const userName = this.currentUser?.firstName || 'Usuario';
    this.authService.logout();
    this.closeAllMenus();
    
    this.notificationService.showSuccess(
      'Sesión cerrada',
      `¡Hasta luego ${userName}! Has cerrado sesión correctamente.`
    );
  }

  /**
   * Cierra menús al hacer click fuera
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: any): void {
    const navbar = document.querySelector('nav');
    if (navbar && !navbar.contains(event.target)) {
      this.closeAllMenus();
    }
  }

  /**
   * Maneja tecla Escape para cerrar menús
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    this.closeAllMenus();
  }

  /**
   * Abre el modal de categorías
   */
  openCategoriesModal(): void {
    console.log('🔍 Abriendo modal de categorías...');
    this.closeAllMenus(); // Cerrar otros menús abiertos primero
    this.showCategoriesModal = true;
    this.cdr.detectChanges(); // Forzar detección de cambios
    console.log('📖 showCategoriesModal:', this.showCategoriesModal);
    this.loadCategoriesForModal();
  }

  /**
   * Cierra el modal de categorías
   */
  closeCategoriesModal(): void {
    this.showCategoriesModal = false;
  }

  /**
   * Carga las categorías para el modal
   */
  async loadCategoriesForModal(): Promise<void> {
    try {
      this.loadingCategories = true;
      
      const response = await this.apiService.get('/projects/categories').toPromise();
      
      if (response?.success && response.data) {
        this.modalCategories = response.data as Category[];
        console.log('✅ Categorías cargadas para modal:', this.modalCategories.length);
      } else {
        throw new Error('No se pudieron cargar las categorías');
      }
    } catch (error) {
      console.error('Error cargando categorías para modal:', error);
      // Fallback a categorías básicas
      this.modalCategories = [
        {
          id: 1,
          nombre: 'Software',
          descripcion: 'Aplicaciones, sistemas y desarrollo de software',
          icono: '💻',
          colorHex: '#3B82F6'
        },
        {
          id: 2,
          nombre: 'Investigación',
          descripcion: 'Tesis, investigaciones y trabajos académicos',
          icono: '🔬',
          colorHex: '#10B981'
        },
        {
          id: 3,
          nombre: 'Ingeniería',
          descripcion: 'Proyectos de ingeniería y ciencias aplicadas',
          icono: '⚙️',
          colorHex: '#F59E0B'
        },
        {
          id: 4,
          nombre: 'Marketing',
          descripcion: 'Estrategias de marketing y publicidad',
          icono: '📈',
          colorHex: '#EF4444'
        }
      ];
    } finally {
      this.loadingCategories = false;
    }
  }

  /**
   * Selecciona una categoría y navega a explorar con filtro aplicado
   */
  selectCategory(category: Category): void {
    this.closeCategoriesModal();
    
    // Navegar a explorar con la categoría seleccionada como query parameter
    this.router.navigate(['/explorar'], {
      queryParams: { category: category.nombre }
    });
  }

  /**
   * Obtiene la URL de imagen de perfil con fallback
   */
  getProfileImageUrl(): string {
    if (this.currentUser?.profileImage) {
      return this.currentUser.profileImage;
    }
    if (this.currentUser) {
      return `https://ui-avatars.com/api/?name=${this.currentUser.firstName}+${this.currentUser.lastName}&background=10B981&color=fff&size=128`;
    }
    return 'https://ui-avatars.com/api/?name=Usuario&background=10B981&color=fff&size=128';
  }

  /**
   * Detecta cambio de tamaño de ventana
   */
  @HostListener('window:resize', ['$event'])
  onWindowResize(event: any): void {
    // Cerrar menú móvil en pantallas grandes
    if (window.innerWidth >= 768) {
      this.closeMobileMenu();
    }
  }
}
