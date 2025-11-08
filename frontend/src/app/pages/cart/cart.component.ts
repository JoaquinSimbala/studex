import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService, CartItem } from '../../services/cart.service';
import { PurchaseService } from '../../services/purchase.service';
import { NotificationService } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {

  private cartService = inject(CartService);
  private purchaseService = inject(PurchaseService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private logger = inject(LoggerService);

  cartItems: CartItem[] = [];
  totalPrice: number = 0;
  isLoading: boolean = true;
  isProcessingPurchase: boolean = false;

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.isLoading = true;
    this.cartService.loadCart().subscribe({
      next: (cartData) => {
        this.cartItems = cartData.items;
        this.totalPrice = cartData.total;
        this.isLoading = false;
      },
      error: (error) => {
        this.logger.error('Error cargando carrito', error);
        this.notificationService.showError('Error', 'Error al cargar el carrito');
        this.isLoading = false;
      }
    });
  }

  removeFromCart(projectId: number): void {
    this.cartService.removeFromCart(projectId).subscribe({
      next: () => {
        this.notificationService.showSuccess('Éxito', 'Proyecto removido del carrito');
      },
      error: (error) => {
        this.logger.error('Error removiendo del carrito', error);
        this.notificationService.showError('Error', 'Error al remover del carrito');
      }
    });
  }

  clearCart(): void {
    if (confirm('¿Estás seguro de que quieres vaciar todo el carrito?')) {
      this.cartService.clearCart().subscribe({
        next: () => {
          this.notificationService.showSuccess('Éxito', 'Carrito vaciado');
        },
        error: (error) => {
          this.logger.error('Error vaciando carrito', error);
          this.notificationService.showError('Error', 'Error al vaciar el carrito');
        }
      });
    }
  }

  async purchaseCart(): Promise<void> {
    if (this.cartItems.length === 0) {
      this.notificationService.showWarning('Advertencia', 'El carrito está vacío');
      return;
    }

    // Mostrar modal de selección de método de pago
    const paymentMethod = await this.selectPaymentMethod();
    if (!paymentMethod) {
      return; // Usuario canceló la selección
    }

    this.isProcessingPurchase = true;
    
    try {
      // Preparar datos para compra de carrito
      const projects = this.cartItems.map(item => ({
        projectId: item.proyecto.id,
        amount: item.proyecto.precio
      }));

      // Usar el nuevo método de compra de carrito
      const result = await this.purchaseService.purchaseFromCart(projects, paymentMethod);
      
      if (result.success) {
        this.notificationService.showSuccess('Éxito', '¡Compra del carrito realizada exitosamente!');
        // Limpiar carrito después de compra exitosa
        this.cartService.clearCart().subscribe();
        this.router.navigate(['/perfil']);
      } else {
        throw new Error(result.error || 'Error procesando la compra del carrito');
      }
      
    } catch (error: any) {
      this.logger.error('Error en compra de carrito', error);
      this.notificationService.showError('Error', error.message || 'Error al procesar la compra del carrito');
    } finally {
      this.isProcessingPurchase = false;
    }
  }

  /**
   * Mostrar modal para seleccionar método de pago
   */
  private selectPaymentMethod(): Promise<'YAPE' | 'PLIN' | 'BANCARIO' | null> {
    return new Promise((resolve) => {
      // Crear modal simple para selección de método de pago
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold mb-4">Selecciona el método de pago</h3>
          <div class="space-y-3">
            <button class="payment-option w-full p-3 border rounded-lg hover:bg-gray-50 text-left" data-method="YAPE">
              💚 YAPE
            </button>
            <button class="payment-option w-full p-3 border rounded-lg hover:bg-gray-50 text-left" data-method="PLIN">
              💜 PLIN
            </button>
            <button class="payment-option w-full p-3 border rounded-lg hover:bg-gray-50 text-left" data-method="BANCARIO">
              🏦 Transferencia Bancaria
            </button>
          </div>
          <div class="flex justify-end mt-6 space-x-3">
            <button class="cancel-btn px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
          </div>
        </div>
      `;

      // Agregar event listeners
      const paymentOptions = modal.querySelectorAll('.payment-option');
      const cancelBtn = modal.querySelector('.cancel-btn');

      paymentOptions.forEach(option => {
        option.addEventListener('click', () => {
          const method = option.getAttribute('data-method') as 'YAPE' | 'PLIN' | 'BANCARIO';
          document.body.removeChild(modal);
          resolve(method);
        });
      });

      cancelBtn?.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(null);
      });

      // Cerrar al hacer click fuera del modal
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(null);
        }
      });

      document.body.appendChild(modal);
    });
  }

  viewProject(projectId: number): void {
    this.router.navigate(['/project', projectId]);
  }

  goToExplore(): void {
    this.router.navigate(['/explore']);
  }

  getImageUrl(imageUrl: string): string {
    if (!imageUrl) return '/assets/images/default-project.jpg';
    if (imageUrl.includes('cloudinary')) return imageUrl;
    return `${environment.apiUrl}${imageUrl}`;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  }

  formatAddedDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  getProjectYear(proyecto: any): number {
    return proyecto.año || proyecto.year || 0;
  }
}