import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

interface SellerStatus {
  userId: number;
  isVendedor: boolean;
  vendedorVerificado: boolean;
  calificacionVendedor: number;
  totalVentas: number;
  totalProyectos: number;
  proyectosActivos: number;
}

@Component({
  selector: 'app-seller-verification',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-studex-50 to-studex-100 py-8">
      <div class="max-w-4xl mx-auto px-4">
        
        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex justify-center items-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-studex-600"></div>
        </div>

        <!-- Not Seller - Conversion Form -->
        <div *ngIf="!isLoading && !sellerStatus?.isVendedor" 
            class="bg-white rounded-2xl shadow-xl overflow-hidden">
            
            <div class="bg-gradient-to-r from-studex-600 to-studex-700 px-8 py-6">
            <h1 class="text-3xl font-bold text-white mb-2">¡Conviértete en Vendedor!</h1>
            <p class="text-studex-100">Comparte tus proyectos universitarios y genera ingresos</p>
          </div>

          <div class="p-8">
            <div class="grid md:grid-cols-2 gap-8">
              <!-- Benefits -->
              <div>
                <h2 class="text-2xl font-bold text-studex-900 mb-6">Beneficios de ser vendedor</h2>
                <div class="space-y-4">
                  <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 bg-studex-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span class="text-studex-600 font-bold">💰</span>
                    </div>
                    <div>
                      <h3 class="font-semibold text-studex-800">Genera ingresos</h3>
                      <p class="text-studex-600 text-sm">Monetiza tus proyectos universitarios y trabajos académicos</p>
                    </div>
                  </div>
                  
                  <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 bg-studex-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span class="text-studex-600 font-bold">📚</span>
                    </div>
                    <div>
                      <h3 class="font-semibold text-studex-800">Ayuda a otros estudiantes</h3>
                      <p class="text-studex-600 text-sm">Comparte tu conocimiento y ayuda a la comunidad estudiantil</p>
                    </div>
                  </div>
                  
                  <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 bg-studex-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span class="text-studex-600 font-bold">⭐</span>
                    </div>
                    <div>
                      <h3 class="font-semibold text-studex-800">Construye tu reputación</h3>
                      <p class="text-studex-600 text-sm">Desarrolla tu portafolio y gana reconocimiento académico</p>
                    </div>
                  </div>
                  
                  <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 bg-studex-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span class="text-studex-600 font-bold">🎯</span>
                    </div>
                    <div>
                      <h3 class="font-semibold text-studex-800">Flexibilidad total</h3>
                      <p class="text-studex-600 text-sm">Sube contenido cuando quieras, a tu propio ritmo</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Conversion Form -->
              <div>
                <h2 class="text-2xl font-bold text-studex-900 mb-6">Comenzar como vendedor</h2>
                <form (ngSubmit)="convertToSeller()" class="space-y-6">
                  <div>
                    <label class="block text-sm font-medium text-studex-700 mb-2">
                      ¿Por qué quieres ser vendedor?
                    </label>
                    <textarea
                      [(ngModel)]="conversionForm.motivacion"
                      name="motivacion"
                      rows="4"
                      class="w-full px-4 py-3 border border-studex-200 rounded-lg focus:ring-2 focus:ring-studex-500 focus:border-transparent resize-none"
                      placeholder="Cuéntanos tus motivaciones para compartir tus proyectos..."
                      required>
                    </textarea>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-studex-700 mb-2">
                      Experiencia académica (opcional)
                    </label>
                    <input
                      type="text"
                      [(ngModel)]="conversionForm.experiencia"
                      name="experiencia"
                      class="w-full px-4 py-3 border border-studex-200 rounded-lg focus:ring-2 focus:ring-studex-500 focus:border-transparent"
                      placeholder="Ej: Estudiante de 8vo ciclo de Ingeniería">
                  </div>

                  <div class="bg-studex-50 p-4 rounded-lg">
                    <div class="flex items-start space-x-3">
                      <input type="checkbox" [(ngModel)]="conversionForm.acceptTerms" name="acceptTerms" required
                             class="mt-1 h-4 w-4 text-studex-600 focus:ring-studex-500 border-studex-300 rounded">
                      <div class="text-sm">
                        <label class="font-medium text-studex-700">
                          Acepto los términos y condiciones
                        </label>
                        <p class="text-studex-600">
                          Al convertirme en vendedor, acepto las políticas de STUDEX y me comprometo a subir contenido original y de calidad.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    [disabled]="isConverting || !conversionForm.acceptTerms"
                    class="w-full bg-gradient-to-r from-studex-600 to-studex-700 text-white font-bold py-4 px-6 rounded-lg hover:from-studex-700 hover:to-studex-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span *ngIf="!isConverting">🚀 Convertirme en vendedor</span>
                    <span *ngIf="isConverting" class="flex items-center justify-center">
                      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Procesando...
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <!-- Already Seller - Dashboard -->
        <div *ngIf="!isLoading && sellerStatus?.isVendedor" 
             class="space-y-8">
          
          <!-- Header -->
          <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div class="bg-gradient-to-r from-studex-600 to-studex-700 px-8 py-6">
              <div class="flex items-center justify-between">
                <div>
                  <h1 class="text-3xl font-bold text-white mb-2">Panel de Vendedor</h1>
                  <p class="text-studex-100">Gestiona tus proyectos y ventas</p>
                </div>
                <div class="text-right">
                  <div class="flex items-center space-x-2 text-white">
                    <span class="text-2xl">⭐</span>
                    <span class="text-2xl font-bold">{{ sellerStatus?.calificacionVendedor?.toFixed(1) || '0.0' }}</span>
                  </div>
                  <p class="text-studex-100 text-sm">Calificación</p>
                </div>
              </div>
            </div>

            <!-- Stats -->
            <div class="p-8">
              <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div class="text-center">
                  <div class="text-3xl font-bold text-studex-600">{{ sellerStatus?.totalProyectos || 0 }}</div>
                  <div class="text-sm text-studex-500">Proyectos subidos</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-studex-600">{{ sellerStatus?.proyectosActivos || 0 }}</div>
                  <div class="text-sm text-studex-500">Proyectos activos</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-studex-600">{{ sellerStatus?.totalVentas || 0 }}</div>
                  <div class="text-sm text-studex-500">Ventas realizadas</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-studex-600">
                    <span *ngIf="sellerStatus?.vendedorVerificado" class="text-green-600">✓</span>
                    <span *ngIf="!sellerStatus?.vendedorVerificado" class="text-yellow-600">⏳</span>
                  </div>
                  <div class="text-sm text-studex-500">
                    {{ sellerStatus?.vendedorVerificado ? 'Verificado' : 'Pendiente' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="grid md:grid-cols-3 gap-6">
            <button
              (click)="navigateToUploadProject()"
              class="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-200 text-left group">
              <div class="flex items-center space-x-4">
                <div class="w-16 h-16 bg-studex-100 rounded-xl flex items-center justify-center group-hover:bg-studex-200 transition-colors">
                  <span class="text-2xl">📁</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-studex-900">Subir nuevo proyecto</h3>
                  <p class="text-studex-600">Agrega un nuevo proyecto con archivos e imágenes</p>
                </div>
              </div>
            </button>

            <button
              (click)="navigateToMyProjects()"
              class="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-200 text-left group">
              <div class="flex items-center space-x-4">
                <div class="w-16 h-16 bg-studex-100 rounded-xl flex items-center justify-center group-hover:bg-studex-200 transition-colors">
                  <span class="text-2xl">📚</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-studex-900">Mis proyectos</h3>
                  <p class="text-studex-600">Gestiona y edita tus proyectos publicados</p>
                </div>
              </div>
            </button>

            <button
              (click)="goHome()"
              class="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-200 text-left group">
              <div class="flex items-center space-x-4">
                <div class="w-16 h-16 bg-studex-100 rounded-xl flex items-center justify-center group-hover:bg-studex-200 transition-colors">
                  <span class="text-2xl">🏠</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-studex-900">Regresar al Inicio</h3>
                  <p class="text-studex-600">Volver a la página principal de STUDEX</p>
                </div>
              </div>
            </button>
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
export class SellerVerificationComponent implements OnInit {
  currentUser: User | null = null;
  sellerStatus: SellerStatus | null = null;
  isLoading = true;
  isConverting = false;

  conversionForm = {
    motivacion: '',
    experiencia: '',
    acceptTerms: false
  };

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserAndSellerStatus();
  }

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
      console.error('Error cargando datos del usuario:', error);
      this.notificationService.showError('Error cargando información del usuario', 'Error');
    } finally {
      this.isLoading = false;
    }
  }

  private async checkSellerStatus(userId: number): Promise<void> {
    try {
      const response = await this.apiService.get(`/seller/status/${userId}`).toPromise();
      
      if (response?.success) {
        this.sellerStatus = response.data as SellerStatus;
        console.log('Estado de vendedor:', this.sellerStatus);
      }
    } catch (error) {
      console.error('Error verificando estado de vendedor:', error);
    }
  }

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
      console.error('Error convirtiendo a vendedor:', error);
      this.notificationService.showError(
        error?.error?.message || 'Error al convertir a vendedor. Inténtalo de nuevo.',
        'Error'
      );
    } finally {
      this.isConverting = false;
    }
  }

  navigateToUploadProject(): void {
    this.router.navigate(['/vendedor/subir-proyecto']);
  }

  navigateToMyProjects(): void {
    this.router.navigate(['/vendedor/mis-proyectos']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}