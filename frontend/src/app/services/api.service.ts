import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  
  private readonly baseUrl = environment.apiUrl || 'http://localhost:3000/api';
  private authToken: string | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Configura el token de autorización para las peticiones
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Limpia el token de autorización
   */
  clearAuthToken(): void {
    this.authToken = null;
  }

  /**
   * Obtiene los headers HTTP con autorización si está disponible
   */
  private getHeaders(includeContentType: boolean = true): HttpHeaders {
    let headers = new HttpHeaders({
      'Accept': 'application/json'
    });

    if (includeContentType) {
      headers = headers.set('Content-Type', 'application/json');
    }

    // Obtener token usando la misma lógica que AuthService
    const token = localStorage.getItem('studex_token') || sessionStorage.getItem('studex_token');
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Construye parámetros de consulta HTTP
   */
  private buildParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (value !== null && value !== undefined && value !== '') {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return httpParams;
  }

  /**
   * Maneja errores HTTP
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Ha ocurrido un error inesperado';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Datos inválidos';
          break;
        case 401:
          errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente';
          break;
        case 403:
          errorMessage = 'No tienes permisos para realizar esta acción';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado';
          break;
        case 422:
          errorMessage = error.error?.message || 'Error de validación';
          break;
        case 500:
          errorMessage = 'Error interno del servidor';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.error?.message || error.message}`;
      }
    }

    console.error('Error en API:', error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Petición GET genérica
   */
  get<T>(endpoint: string, params?: QueryParams): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const httpParams = this.buildParams(params);
    
    return this.http.get<ApiResponse<T>>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Petición POST genérica
   */
  post<T>(endpoint: string, data: any): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.http.post<ApiResponse<T>>(url, data, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Petición PUT genérica
   */
  put<T>(endpoint: string, data: any): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.http.put<ApiResponse<T>>(url, data, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Petición PATCH genérica
   */
  patch<T>(endpoint: string, data: any): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.http.patch<ApiResponse<T>>(url, data, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Petición DELETE genérica
   */
  delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.http.delete<ApiResponse<T>>(url, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Sube archivos al servidor
   */
  uploadFile<T>(endpoint: string, file: File, additionalData?: any): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const formData = new FormData();
    
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    // Para uploads, no incluimos Content-Type para que el browser lo configure automáticamente
    let headers = new HttpHeaders();
    if (this.authToken) {
      headers = headers.set('Authorization', `Bearer ${this.authToken}`);
    }

    return this.http.post<ApiResponse<T>>(url, formData, {
      headers
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Descarga archivos del servidor como blob
   */
  downloadBlob(endpoint: string, filename?: string): Observable<Blob> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.http.get(url, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // === MÉTODOS ESPECÍFICOS PARA STUDEX ===

  /**
   * Obtiene proyectos con filtros
   */
  getProjects(params?: QueryParams): Observable<ApiResponse<any[]>> {
    return this.get('/projects', params);
  }

  /**
   * Obtiene proyectos destacados
   */
  getFeaturedProjects(limit?: number): Observable<ApiResponse<any[]>> {
    const params = limit ? { limit } : undefined;
    return this.get('/projects/featured', params);
  }

  /**
   * Obtiene proyectos recientes
   */
  getRecentProjects(limit?: number): Observable<ApiResponse<any[]>> {
    const params = limit ? { limit } : undefined;
    return this.get('/projects/recent', params);
  }

  /**
   * Obtiene un proyecto por ID
   */
  getProject(id: string): Observable<ApiResponse<any>> {
    return this.get(`/projects/${id}`);
  }

  /**
   * Crea un nuevo proyecto
   */
  createProject(projectData: any): Observable<ApiResponse<any>> {
    return this.post('/projects', projectData);
  }

  /**
   * Actualiza un proyecto
   */
  updateProject(id: string, projectData: any): Observable<ApiResponse<any>> {
    return this.put(`/projects/${id}`, projectData);
  }

  /**
   * Elimina un proyecto
   */
  deleteProject(id: string): Observable<ApiResponse<any>> {
    return this.delete(`/projects/${id}`);
  }

  /**
   * Obtiene categorías
   */
  getCategories(): Observable<ApiResponse<any[]>> {
    return this.get('/categories');
  }

  /**
   * Busca proyectos
   */
  searchProjects(query: string, filters?: any): Observable<ApiResponse<any[]>> {
    const params = { search: query, ...filters };
    return this.get('/projects/search', params);
  }

  /**
   * Obtiene estadísticas del dashboard
   */
  getDashboardStats(): Observable<ApiResponse<any>> {
    return this.get('/dashboard/stats');
  }

  /**
   * Obtiene el perfil del usuario
   */
  getUserProfile(): Observable<ApiResponse<any>> {
    return this.get('/profile');
  }

  /**
   * Actualiza el perfil del usuario
   */
  updateUserProfile(profileData: any): Observable<ApiResponse<any>> {
    return this.put('/auth/profile', profileData);
  }

  /**
   * Obtiene las ventas del usuario
   */
  getUserSales(params?: QueryParams): Observable<ApiResponse<any[]>> {
    return this.get('/sales', params);
  }

  /**
   * Obtiene notificaciones del usuario
   */
  getNotifications(params?: QueryParams): Observable<ApiResponse<any[]>> {
    return this.get('/notifications', params);
  }

  /**
   * Marca una notificación como leída
   */
  markNotificationAsRead(id: string): Observable<ApiResponse<any>> {
    return this.patch(`/notifications/${id}/read`, {});
  }

  /**
   * Obtiene mensajes/chat
   */
  getMessages(conversationId?: string): Observable<ApiResponse<any[]>> {
    const endpoint = conversationId ? `/messages/${conversationId}` : '/messages';
    return this.get(endpoint);
  }

  /**
   * Envía un mensaje
   */
  sendMessage(conversationId: string, message: string): Observable<ApiResponse<any>> {
    return this.post(`/messages/${conversationId}`, { message });
  }

  // === MÉTODOS DE VENDEDOR ===

  /**
   * Convierte un usuario en vendedor
   */
  becomeSeller(userId: number, data: any): Observable<ApiResponse<any>> {
    return this.post('/seller/become-seller', { userId, ...data });
  }

  /**
   * Obtiene el estado de vendedor de un usuario
   */
  getSellerStatus(userId: number): Observable<ApiResponse<any>> {
    return this.get(`/seller/status/${userId}`);
  }

  /**
   * Sube un nuevo proyecto
   */
  uploadProject(projectData: any): Observable<ApiResponse<any>> {
    return this.post('/seller/upload-project', projectData);
  }

  /**
   * Obtiene los proyectos de un vendedor
   */
  getSellerProjects(sellerId: number): Observable<ApiResponse<any[]>> {
    return this.get(`/seller/projects/${sellerId}`);
  }

  /**
   * Obtiene todos los proyectos del vendedor actual con estadísticas
   */
  getMyProjects(userId: number): Observable<ApiResponse<any>> {
    return this.get(`/seller/my-projects/${userId}`);
  }

  /**
   * Obtiene detalles completos de un proyecto específico
   */
  getProjectDetails(projectId: number): Observable<ApiResponse<any>> {
    return this.get(`/projects/${projectId}`);
  }

  /**
   * Procesa descarga de archivo de proyecto y registra estadísticas
   */
  downloadProjectFile(projectId: number, fileId: number): Observable<ApiResponse<any>> {
    return this.get(`/projects/${projectId}/download/${fileId}`);
  }

  /**
   * Sube archivos para un proyecto
   */
  uploadProjectFiles(projectId: number, formData: FormData): Observable<ApiResponse<any>> {
    const url = `${this.baseUrl}/seller/upload-files/${projectId}`;
    
    return this.http.post<ApiResponse<any>>(url, formData, {
      headers: this.getHeaders(false) // Sin Content-Type para FormData
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ==============================
  // MÉTODOS DE COMPRAS/PURCHASES
  // ==============================

  /**
   * Procesar una compra de proyecto
   */
  purchaseProject(data: {projectId: number, paymentMethod: string, amount: number, currency: string}): Observable<ApiResponse<any>> {
    return this.post('/purchases', data);
  }

  /**
   * Procesar compra desde carrito (múltiples proyectos)
   */
  purchaseCart(data: {projects: Array<{projectId: number, amount: number}>, paymentMethod: string}): Observable<ApiResponse<any>> {
    return this.post('/purchases/cart', data);
  }

  /**
   * Obtener compras del usuario
   */
  getUserPurchases(userId: string): Observable<ApiResponse<any[]>> {
    return this.get(`/purchases/user/${userId}`);
  }

  /**
   * Verificar si el usuario ha comprado un proyecto
   */
  checkUserPurchase(projectId: number): Observable<ApiResponse<{hasPurchased: boolean, purchaseDate?: string, saleCode?: string}>> {
    return this.get(`/purchases/check/${projectId}`);
  }

  /**
   * Obtener estadísticas de compras del usuario
   */
  getPurchaseStats(): Observable<ApiResponse<{totalPurchases: number, totalSpent: number}>> {
    return this.get('/purchases/stats');
  }

  /**
   * Validar una compra (solo administradores)
   */
  validatePurchase(data: {saleId: number, comprobantePago?: string, approved: boolean}): Observable<ApiResponse<any>> {
    return this.post('/purchases/validate', data);
  }

  // ==================== PERFIL DE USUARIO ====================

  /**
   * Cambiar contraseña de usuario
   */
  changePassword(currentPassword: string, newPassword: string): Observable<ApiResponse<any>> {
    return this.put('/auth/password', {
      currentPassword,
      newPassword
    });
  }

  /**
   * Subir imagen de perfil
   */
  uploadProfileImage(formData: FormData): Observable<ApiResponse<{imageUrl: string, user: any}>> {
    return this.http.post<ApiResponse<{imageUrl: string, user: any}>>(
      `${this.baseUrl}/auth/profile/image`, 
      formData, 
      { headers: this.getHeaders(false) }
    ).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }
}