import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';
import { BackButtonComponent } from '../../components/back-button/back-button.component';

/**
 * Interface que define el estado y estadísticas de un vendedor en el sistema.
 * 
 * @interface SellerStatus
 * @property {number} userId - Identificador único del usuario vendedor
 * @property {boolean} isVendedor - Indica si el usuario tiene rol de vendedor activo
 * @property {boolean} vendedorVerificado - Indica si el vendedor ha sido verificado por el sistema
 * @property {number | null} calificacionVendedor - Calificación promedio del vendedor (0-5) o null si no tiene calificaciones
 * @property {number} totalVentas - Número total de ventas realizadas por el vendedor
 * @property {number} totalProyectos - Cantidad total de proyectos publicados por el vendedor
 * @property {number} proyectosActivos - Cantidad de proyectos actualmente activos/disponibles
 */
interface SellerStatus {
  userId: number;
  isVendedor: boolean;
  vendedorVerificado: boolean;
  calificacionVendedor: number | null;
  totalVentas: number;
  totalProyectos: number;
  proyectosActivos: number;
}

/**
 * Componente de verificación y conversión de vendedores en STUDEX.
 * 
 * Este componente maneja dos estados principales:
 * 1. Formulario de conversión para usuarios que desean convertirse en vendedores
 * 2. Dashboard de vendedor para usuarios que ya son vendedores activos
 * 
 * Características:
 * - Verificación del estado de vendedor del usuario actual
 * - Formulario de solicitud para convertirse en vendedor
 * - Panel de estadísticas y gestión para vendedores activos
 * - Navegación a funcionalidades de vendedor (subir proyectos, gestionar proyectos)
 * 
 * @component
 * @selector app-seller-verification
 * @standalone Componente standalone de Angular 18
 */
@Component({
  selector: 'app-seller-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonComponent],
  templateUrl: './seller-verification.html',
  styleUrl: './seller-verification.scss'
})
export class SellerVerificationComponent implements OnInit {
  /**
   * Usuario actualmente autenticado en el sistema.
   * 
   * NOTA: Esta propiedad NO se usa actualmente en el template,
   * pero se mantiene para futuras mejoras como:
   * - Mostrar información personalizada del usuario
   * - Validaciones adicionales basadas en datos del usuario
   * - Tracking de actividad del usuario
   * 
   * @type {any | null}
   * @unused En template, pero disponible para lógica futura
   */
  currentUser: any | null = null;

  /**
   * Estado y estadísticas completas del vendedor actual.
   * Contiene información sobre ventas, proyectos, calificación y verificación.
   * 
   * @type {SellerStatus | null}
   * @default null
   */
  sellerStatus: SellerStatus | null = null;

  /**
   * Indicador de estado de carga inicial de datos.
   * Se usa para mostrar un spinner mientras se obtiene información del servidor.
   * 
   * @type {boolean}
   * @default true
   */
  isLoading = true;

  /**
   * Indicador de proceso de conversión a vendedor en curso.
   * Previene múltiples envíos del formulario y muestra estado de procesamiento.
   * 
   * @type {boolean}
   * @default false
   */
  isConverting = false;

  /**
   * Datos del formulario de conversión a vendedor.
   * Contiene la información que el usuario proporciona al solicitar convertirse en vendedor.
   * 
   * @type {Object}
   * @property {string} motivacion - Razones del usuario para convertirse en vendedor (requerido)
   * @property {string} experiencia - Experiencia académica del usuario (opcional)
   * @property {boolean} acceptTerms - Aceptación de términos y condiciones (requerido)
   */
  conversionForm = {
    motivacion: '',
    experiencia: '',
    acceptTerms: false
  };

  /**
   * Constructor del componente.
   * Inyecta los servicios necesarios para la funcionalidad del componente.
   * 
   * @param {AuthService} authService - Servicio de autenticación para obtener usuario actual
   * @param {ApiService} apiService - Servicio HTTP para comunicación con el backend
   * @param {NotificationService} notificationService - Servicio para mostrar notificaciones al usuario
   * @param {Router} router - Servicio de navegación de Angular
   * @param {LoggerService} logger - Servicio de logging
   */
  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private router: Router,
    private logger: LoggerService
  ) {}

  /**
   * Hook del ciclo de vida de Angular que se ejecuta al inicializar el componente.
   * Inicia la carga de datos del usuario y su estado de vendedor.
   * 
   * @returns {void}
   */
  ngOnInit(): void {
    this.loadUserAndSellerStatus();
  }

  /**
   * Carga los datos del usuario autenticado y su estado de vendedor.
   * Espera a que el servicio de autenticación esté inicializado antes de obtener datos.
   * Si no hay usuario autenticado, redirige a la página de login.
   * 
   * Flujo:
   * 1. Espera inicialización de AuthService
   * 2. Obtiene usuario actual del observable
   * 3. Si existe usuario, verifica su estado de vendedor
   * 4. Si no existe usuario, redirige a login
   * 
   * @private
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Si hay problemas al cargar datos del usuario
   */
  private async loadUserAndSellerStatus(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Obtener usuario actual solo después de que AuthService esté inicializado
      this.authService.isInitialized$.subscribe(initialized => {
        if (initialized) {
          this.authService.currentUser$.subscribe(async user => {
            this.currentUser = user;
            
            if (user) {
              await this.checkSellerStatus(parseInt(user.id));
            } else {
              // Si no hay usuario, redirigir al login
              this.router.navigate(['/login']);
            }
          });
        }
      });
    } catch (error) {
      this.logger.error('Error cargando datos del usuario', error);
      this.notificationService.showError('Error cargando información del usuario', 'Error');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Verifica el estado de vendedor de un usuario específico.
   * Consulta al backend para obtener estadísticas y estado de verificación del vendedor.
   * 
   * @private
   * @async
   * @param {number} userId - ID del usuario a verificar
   * @returns {Promise<void>}
   * @throws {Error} Si hay problemas al consultar el estado del vendedor
   */
  private async checkSellerStatus(userId: number): Promise<void> {
    try {
      const response = await this.apiService.get(`/seller/status/${userId}`).toPromise();
      
      if (response?.success) {
        this.sellerStatus = response.data as SellerStatus;
        this.logger.debug('Estado de vendedor verificado');
      }
    } catch (error) {
      this.logger.error('Error verificando estado de vendedor', error);
    }
  }

  /**
   * Convierte al usuario actual en vendedor.
   * Envía la solicitud de conversión al backend con los datos del formulario.
   * Recarga la página después de una conversión exitosa para actualizar el estado.
   * 
   * Validaciones:
   * - Verifica que exista un usuario autenticado
   * - Verifica que se hayan aceptado los términos y condiciones
   * 
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Si hay problemas al procesar la conversión
   */
  async convertToSeller(): Promise<void> {
    if (!this.currentUser || !this.conversionForm.acceptTerms) {
      return;
    }

    this.isConverting = true;

    try {
      const response = await this.apiService.post('/seller/become-seller', {
        userId: this.currentUser.id,
        motivacion: this.conversionForm.motivacion,
        experiencia: this.conversionForm.experiencia
      }).toPromise();

      if (response?.success) {
        this.notificationService.showSuccess('¡Felicitaciones! Ahora eres vendedor en STUDEX', 'Éxito');
        
        // Recargar usuario actual
        window.location.reload(); // Temporal hasta implementar refreshUserData
        
        // Recargar estado de vendedor
        await this.checkSellerStatus(parseInt(this.currentUser.id));
      }
    } catch (error: any) {
      this.logger.error('Error convirtiendo a vendedor', error);
      this.notificationService.showError(
        error?.error?.message || 'Error al convertir a vendedor. Inténtalo de nuevo.',
        'Error'
      );
    } finally {
      this.isConverting = false;
    }
  }

  /**
   * Navega a la página de subir proyecto.
   * Solo disponible para usuarios que ya son vendedores activos.
   * 
   * @returns {void}
   */
  navigateToUploadProject(): void {
    this.router.navigate(['/vendedor/subir-proyecto']);
  }

  /**
   * Navega a la página de gestión de proyectos del vendedor.
   * Muestra todos los proyectos publicados por el vendedor actual.
   * 
   * @returns {void}
   */
  navigateToMyProjects(): void {
    this.router.navigate(['/vendedor/mis-proyectos']);
  }

  /**
   * Navega a la página principal de STUDEX.
   * Función de navegación rápida desde el dashboard de vendedor.
   * 
   * @returns {void}
   */
  goHome(): void {
    this.router.navigate(['/']);
  }
}