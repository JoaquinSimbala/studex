import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { CartService } from '../../services/cart.service';
import { LoggerService } from '../../services/logger.service';
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
  styleUrls: ['./navbar.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class Navbar implements OnInit, OnDestroy {

  // Referencia al componente de notificaciones
  @ViewChild(NotificationsDropdownComponent) notificationsDropdown?: NotificationsDropdownComponent;

  // Usuario actual
  currentUser: User | null = null;
  
  // Estados de UI
  showUserMenu = false;
  showMobileMenu = false;
  showMobileSearch = false;
  showSearchResults = false;
  showCart = false;
  showCategoriesModal = false;
  isClosingCategories = false;

  // Búsqueda
  searchQuery = '';
  searchResults: SearchResult[] = [];
  private searchSubject = new Subject<string>();

  // Categorías
  modalCategories: Category[] = [];
  loadingCategories = false;

  // Carrito
  cartItemsCount = 0;

  // Timeout para el menú de usuario
  private userMenuTimeout: any = null;

  // Subscripciones
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router,
    private notificationService: NotificationService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private logger: LoggerService
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
      this.logger.debug('Datos de usuario cargados');
    } catch (error) {
      this.logger.error('Error cargando datos del usuario', error);
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
      this.logger.error('Error en búsqueda', error);
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
   * Toggle del menú de usuario (para móvil)
   */
  toggleUserMenu(event?: Event): void {
    // Prevenir propagación
    if (event) {
      event.stopPropagation();
    }
    
    // En móvil (< 640px), solo toggle con click
    if (window.innerWidth < 640) {
      this.showUserMenu = !this.showUserMenu;
      this.closeOtherMenus('user');
      // Cerrar notificaciones en móvil
      this.closeNotifications();
      this.logger.debug('Menú de usuario móvil', this.showUserMenu ? 'abierto' : 'cerrado');
      return;
    }
    
    // En desktop, también toggle con click
    this.showUserMenu = !this.showUserMenu;
    this.closeOtherMenus('user');
    this.logger.debug('Menú de usuario', this.showUserMenu ? 'abierto' : 'cerrado');
  }

  /**
   * Muestra el menú de usuario al pasar el mouse (desktop)
   */
  showUserMenuOnHover(): void {
    // Solo en desktop y tablets (ancho >= 640px)
    if (window.innerWidth >= 640) {
      // Cancelar cualquier timeout pendiente
      if (this.userMenuTimeout) {
        clearTimeout(this.userMenuTimeout);
        this.userMenuTimeout = null;
      }
      this.showUserMenu = true;
      this.closeOtherMenus('user');
    }
  }

  /**
   * Oculta el menú de usuario cuando el mouse sale (desktop)
   */
  hideUserMenuOnLeave(): void {
    // Solo en desktop y tablets
    if (window.innerWidth >= 640) {
      // Cancelar timeout anterior si existe
      if (this.userMenuTimeout) {
        clearTimeout(this.userMenuTimeout);
      }
      
      // Pequeño delay para permitir mover el mouse al dropdown
      this.userMenuTimeout = setTimeout(() => {
        if (window.innerWidth >= 640) {
          this.showUserMenu = false;
        }
        this.userMenuTimeout = null;
      }, 200);
    }
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
    // Cerrar notificaciones en móvil
    if (window.innerWidth < 640) {
      this.closeNotifications();
    }
  }

  /**
   * Toggle de búsqueda móvil
   */
  toggleMobileSearch(): void {
    this.showMobileSearch = !this.showMobileSearch;
    // Cerrar notificaciones en móvil
    if (window.innerWidth < 640) {
      this.closeNotifications();
    }
  }

  /**
   * Cierra otros menús
   */
  private closeOtherMenus(except?: string): void {
    if (except !== 'user') this.showUserMenu = false;
    if (except !== 'cart') this.showCart = false;
    if (except !== 'mobile') this.showMobileMenu = false;
    if (except !== 'search') this.showSearchResults = false;
    if (except !== 'categories') {
      if (this.showCategoriesModal) {
        this.closeCategoriesModal();
      }
    }
  }

  /**
   * Cierra todos los menús
   */
  private closeAllMenus(): void {
    this.closeOtherMenus();
  }

  /**
   * Cierra otros menús móviles (llamado desde el componente de notificaciones)
   */
  closeOtherMobileMenus(): void {
    this.showMobileMenu = false;
    this.showMobileSearch = false;
    this.showUserMenu = false;
  }

  /**
   * Cierra las notificaciones cuando se abren otros menús
   */
  private closeNotifications(): void {
    if (this.notificationsDropdown) {
      this.notificationsDropdown.close();
    }
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
    const categoriesSidebar = document.getElementById('categories-sidebar');
    
    // No cerrar si el clic fue dentro del navbar o del sidebar de categorías
    if (navbar && !navbar.contains(event.target) && 
        (!categoriesSidebar || !categoriesSidebar.contains(event.target))) {
      // No cerrar el sidebar de categorías si está abierto, solo los dropdowns
      if (this.showCategoriesModal) {
        this.showUserMenu = false;
        this.showSearchResults = false;
      } else {
        this.closeAllMenus();
      }
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
  openCategoriesModal(event?: Event): void {
    // Prevenir propagación del evento
    if (event) {
      event.stopPropagation();
    }
    
    this.closeOtherMenus('categories'); // Cerrar otros menús pero no el de categorías
    this.isClosingCategories = false;
    this.showCategoriesModal = true;
    
    // Cerrar el menú móvil si está abierto
    this.showMobileMenu = false;
    
    this.cdr.detectChanges();
    this.loadCategoriesForModal();
    this.logger.debug('Modal de categorías abierto');
  }

  /**
   * Cierra el modal de categorías
   */
  closeCategoriesModal(event?: Event): void {
    // Prevenir propagación del evento
    if (event) {
      event.stopPropagation();
    }
    
    this.isClosingCategories = true;
    this.cdr.detectChanges();
    
    // Esperar a que termine la animación antes de ocultar
    setTimeout(() => {
      this.showCategoriesModal = false;
      this.isClosingCategories = false;
      this.cdr.detectChanges();
      this.logger.debug('Modal de categorías cerrado');
    }, 300); // Mismo tiempo que la duración de la animación
  }

  /**
   * Carga las categorías para el modal
   */
  async loadCategoriesForModal(): Promise<void> {
    try {
      this.loadingCategories = true;
      this.cdr.detectChanges();
      
      const response = await this.apiService.get('/projects/categories').toPromise();
      
      if (response?.success && response.data) {
        this.modalCategories = response.data as Category[];
      } else {
        // Si no hay respuesta exitosa, dejar el array vacío
        this.modalCategories = [];
      }
    } catch (error) {
      this.logger.error('Error cargando categorías', error);
      // En caso de error, dejar el array vacío para mostrar el estado vacío
      this.modalCategories = [];
    } finally {
      this.loadingCategories = false;
      this.cdr.detectChanges();
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
   * Sanitiza el HTML del icono de categoría para renderizar SVG de forma segura
   */
  getSafeHtml(html: string | undefined): SafeHtml {
    if (!html) {
      const defaultIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';
      return this.sanitizer.bypassSecurityTrustHtml(defaultIcon);
    }
    return this.sanitizer.bypassSecurityTrustHtml(html);
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
