import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Servicio centralizado para manejo de logs
 * 
 * @description
 * - En desarrollo: Muestra todos los logs en consola
 * - En producción: Solo muestra errores críticos
 * - Permite integración futura con servicios externos (Sentry, LogRocket, etc.)
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {

  /**
   * Log de información general (solo desarrollo)
   */
  log(message: string, ...optionalParams: any[]): void {
    if (!environment.production) {
      console.log(message, ...optionalParams);
    }
  }

  /**
   * Log de advertencias (solo desarrollo)
   */
  warn(message: string, ...optionalParams: any[]): void {
    if (!environment.production) {
      console.warn(message, ...optionalParams);
    }
  }

  /**
   * Log de errores (siempre se muestran, pero en producción sin datos sensibles)
   */
  error(message: string, error?: any): void {
    if (environment.production) {
      // En producción: solo mensaje genérico
      console.error(message);
      
      // TODO: Enviar a servicio de monitoreo (Sentry, LogRocket, etc.)
      // this.sendToErrorTracking(message, error);
    } else {
      // En desarrollo: mostrar todo
      console.error(message, error);
    }
  }

  /**
   * Log de debugging detallado (solo desarrollo)
   */
  debug(message: string, data?: any): void {
    if (!environment.production) {
      console.log(`DEBUG: ${message}`, data);
    }
  }

  /**
   * Log de éxito (solo desarrollo)
   */
  success(message: string, ...optionalParams: any[]): void {
    if (!environment.production) {
      console.log(`${message}`, ...optionalParams);
    }
  }

  /**
   * Método privado para enviar errores a servicio externo
   * (implementar cuando se integre Sentry u otro servicio)
   */
  private sendToErrorTracking(message: string, error: any): void {
    // Implementar integración con Sentry, LogRocket, etc.
    // Ejemplo:
    // Sentry.captureException(error, { extra: { message } });
  }
}
