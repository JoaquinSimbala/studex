import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  university: string;
  userType: 'STUDENT' | 'SELLER' | 'ADMIN';
  profileImage?: string;
  verified: boolean;
  createdAt: Date;
  areaEstudio?: string;  // Área de estudio (carrera)
  descripcion?: string;  // Biografía/descripción personal
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  university: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private isInitializedSubject = new BehaviorSubject<boolean>(false);
  public isInitialized$ = this.isInitializedSubject.asObservable();

  private readonly TOKEN_KEY = 'studex_token';
  private readonly USER_KEY = 'studex_user';
  private readonly baseUrl = environment.apiUrl || 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    console.log('🔧 Inicializando AuthService...');
    this.loadUserFromStorage();
    
    // Verificar autenticación con el backend si hay token
    setTimeout(() => {
      if (this.getToken()) {
        console.log('🔍 Verificando token con el backend...');
        this.checkAuthStatus().finally(() => {
          this.isInitializedSubject.next(true);
          console.log('✅ AuthService inicializado completamente');
        });
      } else {
        this.isInitializedSubject.next(true);
        console.log('✅ AuthService inicializado (sin token)');
      }
    }, 100); // Reducir el timeout
    
    // Agregar listener para detectar cambios en storage
    window.addEventListener('storage', (event) => {
      if (event.key === this.TOKEN_KEY || event.key === this.USER_KEY) {
        console.log('🔄 Cambio detectado en storage, recargando usuario...');
        this.loadUserFromStorage();
      }
    });
  }

  /**
   * Carga el usuario desde localStorage al inicializar el servicio
   */
  private loadUserFromStorage(): void {
    try {
      // Verificar tanto localStorage como sessionStorage
      let token = localStorage.getItem(this.TOKEN_KEY);
      let userData = localStorage.getItem(this.USER_KEY);
      let storageType = 'localStorage';
      
      // Si no está en localStorage, verificar sessionStorage
      if (!token || !userData) {
        token = sessionStorage.getItem(this.TOKEN_KEY);
        userData = sessionStorage.getItem(this.USER_KEY);
        storageType = 'sessionStorage';
      }
      
      if (token && userData) {
        const user = JSON.parse(userData);
        
        // Verificar si el token no ha expirado
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const now = Math.floor(Date.now() / 1000);
          
          if (payload.exp && payload.exp < now) {
            console.log('⏰ Token expirado al cargar, limpiando sesión');
            this.clearStorage();
            return;
          }
        } catch (error) {
          console.error('❌ Error verificando token al cargar:', error);
          this.clearStorage();
          return;
        }
        
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        console.log(`✅ Usuario cargado desde ${storageType}:`, user.email);
        
        // Marcar como inicializado si no hay verificación pendiente
        if (!this.getToken()) {
          this.isInitializedSubject.next(true);
        }
      } else {
        console.log('ℹ️ No hay sesión guardada');
        this.isInitializedSubject.next(true);
      }
    } catch (error) {
      console.error('❌ Error cargando usuario desde storage:', error);
      this.clearStorage();
    }
  }

  /**
   * Obtiene los headers HTTP con autorización
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.TOKEN_KEY);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  /**
   * Inicia sesión del usuario
   */
  async login(email: string, password: string, rememberMe: boolean = false): Promise<boolean> {
    try {
      const response = await this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, {
        email,
        password,
        rememberMe
      }, { headers: this.getHeaders() }).toPromise();

      if (response?.success && response.user && response.token) {
        this.setAuthData(response.user, response.token, rememberMe);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error en login:', error);
      return false;
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async register(userData: RegisterData): Promise<boolean> {
    try {
      console.log('📝 Enviando datos de registro:', { ...userData, password: '[HIDDEN]' });
      
      const response = await this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, userData, { 
        headers: this.getHeaders() 
      }).toPromise();

      console.log('✅ Respuesta del servidor:', response);

      if (response?.success) {
        // Si el registro es exitoso, podríamos hacer login automático
        // o simplemente retornar true para que el usuario haga login manual
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      
      // Log adicional para debugging
      if (error.status) {
        console.error('Status HTTP:', error.status);
        console.error('Error del servidor:', error.error);
      }
      
      return false;
    }
  }

  /**
   * Registra un nuevo usuario con imagen de perfil
   */
  async registerWithImage(formData: FormData): Promise<boolean> {
    try {
      console.log('📝 Enviando datos de registro con imagen');
      
      // Para FormData no necesitamos Content-Type, el navegador lo establece automáticamente
      const token = localStorage.getItem(this.TOKEN_KEY);
      let headers = new HttpHeaders({
        'Accept': 'application/json'
      });
      
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, formData, { 
        headers 
      }).toPromise();

      console.log('✅ Respuesta del servidor:', response);

      if (response?.success) {
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('❌ Error en registro con imagen:', error);
      
      if (error.status) {
        console.error('Status HTTP:', error.status);
        console.error('Error del servidor:', error.error);
      }
      
      return false;
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    console.log('🚪 Cerrando sesión...');
    this.clearStorage();
    
    // Resetear estado
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    // Redirigir al login
    this.router.navigate(['/login']);
  }

  /**
   * Limpia todos los datos de autenticación del storage
   */
  private clearStorage(): void {
    // Limpiar storage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
  }

  /**
   * Establece los datos de autenticación en el estado y storage
   */
  private setAuthData(user: User, token: string, persistent: boolean = false): void {
    console.log(`💾 Guardando sesión (persistente: ${persistent ? 'Sí' : 'No'})`);
    
    // Actualizar estado
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
    
    // Limpiar storage anterior
    this.clearStorage();
    
    // Guardar en el storage apropiado
    const storage = persistent ? localStorage : sessionStorage;
    storage.setItem(this.TOKEN_KEY, token);
    storage.setItem(this.USER_KEY, JSON.stringify(user));
    
    console.log(`✅ Sesión guardada en ${persistent ? 'localStorage' : 'sessionStorage'}`);
  }

  /**
   * Actualiza los datos del usuario actual
   */
  updateUser(user: User): void {
    this.currentUserSubject.next(user);
    
    // Actualizar en el storage correspondiente
    if (localStorage.getItem(this.TOKEN_KEY)) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } else if (sessionStorage.getItem(this.TOKEN_KEY)) {
      sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  /**
   * Obtiene el token actual
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    
    if (!token || !user) {
      console.log('❌ No hay token o usuario');
      return false;
    }
    
    // Verificar si el token ha expirado (JWT básico)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < now) {
        console.log('⏰ Token expirado');
        this.logout();
        return false;
      }
      
      console.log('✅ Token válido');
      return true;
    } catch (error) {
      console.error('❌ Error verificando token:', error);
      return false;
    }
  }

  /**
   * Verifica el estado de autenticación de manera asíncrona
   */
  async checkAuthStatus(): Promise<boolean> {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    try {
      // Verificar token con el backend
      const response = await this.http.get<{success: boolean, user?: User}>(`${this.baseUrl}/auth/verify`, {
        headers: this.getHeaders()
      }).toPromise();

      if (response?.success && response.user) {
        console.log('✅ Token verificado con el backend');
        this.currentUserSubject.next(response.user);
        this.isAuthenticatedSubject.next(true);
        return true;
      } else {
        console.log('❌ Token inválido según el backend');
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('❌ Error verificando token con backend:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Verifica si el usuario tiene un rol específico
   */
  hasRole(role: 'STUDENT' | 'SELLER' | 'ADMIN'): boolean {
    const user = this.getCurrentUser();
    return user?.userType === role || false;
  }

  /**
   * Solicita el restablecimiento de contraseña
   */
  async forgotPassword(email: string): Promise<boolean> {
    try {
      const response = await this.http.post<{success: boolean}>('/api/auth/forgot-password', {
        email
      }).toPromise();

      return response?.success || false;
    } catch (error) {
      console.error('Error en forgot password:', error);
      return false;
    }
  }

  /**
   * Restablece la contraseña con el token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const response = await this.http.post<{success: boolean}>('/api/auth/reset-password', {
        token,
        newPassword
      }).toPromise();

      return response?.success || false;
    } catch (error) {
      console.error('Error en reset password:', error);
      return false;
    }
  }

  /**
   * Verifica el email del usuario
   */
  async verifyEmail(token: string): Promise<boolean> {
    try {
      const response = await this.http.post<AuthResponse>('/api/auth/verify-email', {
        token
      }).toPromise();

      if (response?.success && response.user) {
        this.updateUser(response.user);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error en verificación de email:', error);
      return false;
    }
  }

  /**
   * Reenvía el email de verificación
   */
  async resendVerificationEmail(): Promise<boolean> {
    try {
      const response = await this.http.post<{success: boolean}>('/api/auth/resend-verification', {}).toPromise();
      return response?.success || false;
    } catch (error) {
      console.error('Error reenviando email de verificación:', error);
      return false;
    }
  }

  /**
   * Actualiza la contraseña del usuario autenticado
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const response = await this.http.post<{success: boolean}>('/api/auth/change-password', {
        currentPassword,
        newPassword
      }).toPromise();

      return response?.success || false;
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      return false;
    }
  }

  /**
   * Refresca el token de autenticación
   */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await this.http.post<AuthResponse>('/api/auth/refresh', {}).toPromise();

      if (response?.success && response.user && response.token) {
        const currentToken = this.getToken();
        const persistent = !!localStorage.getItem(this.TOKEN_KEY);
        this.setAuthData(response.user, response.token, persistent);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error refrescando token:', error);
      this.logout();
      return false;
    }
  }
}