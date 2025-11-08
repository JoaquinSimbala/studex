import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-studex-50 to-studex-100 flex items-center justify-center p-4">
      <div class="studex-card p-8 text-center max-w-md">
        <div class="mb-6">
          <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-studex-500 mx-auto"></div>
        </div>
        <h2 class="font-display text-2xl font-bold text-studex-900 mb-2">
          {{ loading ? 'Procesando autenticación...' : 'Redirigiendo...' }}
        </h2>
        <p class="text-studex-600">
          Por favor espera un momento
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private logger: LoggerService
  ) {}

  async ngOnInit(): Promise<void> {
    // Obtener el token de la URL
    this.route.queryParams.subscribe(async params => {
      const token = params['token'];
      const error = params['error'];

      if (error) {
        // Manejar error de autenticación
        this.handleError(error);
        return;
      }

      if (token) {
        try {
          this.logger.log('Token OAuth recibido');
          
          // Guardar el token y obtener datos del usuario
          // IMPORTANTE: Usar el mismo nombre que el AuthService ('studex_token')
          localStorage.setItem('studex_token', token);
          
          // Verificar el token con el backend
          const isValid = await this.authService.verifyToken();
          
          if (isValid) {
            const user = this.authService.getCurrentUser();
            this.logger.success('Usuario autenticado con Google OAuth');
            
            this.notificationService.showSuccess(
              '¡Bienvenido!',
              `Hola ${user?.firstName}, has iniciado sesión con Google correctamente.`
            );
            
            // Redirigir al home
            this.router.navigate(['/']);
          } else {
            this.logger.error('Token OAuth inválido según el backend');
            throw new Error('Token inválido');
          }
        } catch (error) {
          this.logger.error('Error procesando token OAuth', error);
          
          // Limpiar token inválido
          localStorage.removeItem('studex_token');
          
          this.notificationService.showError(
            'Error de autenticación',
            'No se pudo completar el inicio de sesión. Por favor, intenta nuevamente.'
          );
          this.router.navigate(['/login']);
        }
      } else {
        // No hay token ni error
        this.notificationService.showError(
          'Error',
          'No se recibió información de autenticación.'
        );
        this.router.navigate(['/login']);
      }
      
      this.loading = false;
    });
  }

  private handleError(error: string): void {
    let message = 'Ocurrió un error durante la autenticación.';
    
    if (error === 'auth_failed') {
      message = 'No se pudo autenticar con Google. Por favor, intenta nuevamente.';
    } else if (error === 'server_error') {
      message = 'Error del servidor. Por favor, intenta más tarde.';
    }
    
    this.notificationService.showError('Error de autenticación', message);
    this.router.navigate(['/login']);
  }
}
