import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

export interface NotificationData {
  usuarioId: number;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  datosExtra?: any;
}

/**
 * Servicio para crear y gestionar notificaciones
 */
export class NotificationService {
  
  /**
   * Crear una nueva notificación
   */
  static async create(data: NotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          usuarioId: data.usuarioId,
          tipo: data.tipo,
          titulo: data.titulo,
          mensaje: data.mensaje,
          datosExtra: data.datosExtra || null,
          leida: false,
          fechaCreacion: new Date()
        }
      });

      console.log(`✅ Notificación creada para usuario ${data.usuarioId}: ${data.titulo}`);
      return notification;
    } catch (error) {
      console.error('❌ Error creando notificación:', error);
      throw error;
    }
  }

  /**
   * Notificación para compra exitosa
   */
  static async createCompraExitosa(compradorId: number, proyectoTitulo: string, precio: number, vendedorId: number) {
    // Notificación para el comprador
    await this.create({
      usuarioId: compradorId,
      tipo: NotificationType.COMPRA_EXITOSA,
      titulo: '¡Compra realizada con éxito!',
      mensaje: `Has adquirido "${proyectoTitulo}" por S/ ${precio}. Ya puedes acceder al contenido.`,
      datosExtra: {
        proyectoTitulo,
        precio,
        accion: 'compra',
        estado: 'exitosa'
      }
    });

    // Notificación para el vendedor
    await this.create({
      usuarioId: vendedorId,
      tipo: NotificationType.NUEVA_VENTA,
      titulo: '¡Nueva venta realizada!',
      mensaje: `Tu proyecto "${proyectoTitulo}" ha sido vendido por S/ ${precio}.`,
      datosExtra: {
        proyectoTitulo,
        precio,
        compradorId,
        accion: 'venta',
        estado: 'exitosa'
      }
    });
  }

  /**
   * Notificación para error en compra
   */
  static async createCompraError(compradorId: number, proyectoTitulo: string, motivoError: string) {
    await this.create({
      usuarioId: compradorId,
      tipo: NotificationType.COMPRA_ERROR,
      titulo: 'Error en la compra',
      mensaje: `No se pudo completar la compra de "${proyectoTitulo}". ${motivoError}`,
      datosExtra: {
        proyectoTitulo,
        motivoError,
        accion: 'compra',
        estado: 'error'
      }
    });
  }

  /**
   * Notificación para proyecto subido exitosamente
   */
  static async createProyectoSubido(autorId: number, proyectoTitulo: string) {
    await this.create({
      usuarioId: autorId,
      tipo: NotificationType.PROYECTO_SUBIDO,
      titulo: '¡Proyecto publicado con éxito!',
      mensaje: `Tu proyecto "${proyectoTitulo}" ha sido publicado y ya está disponible para la venta.`,
      datosExtra: {
        proyectoTitulo,
        accion: 'subida_proyecto',
        estado: 'exitosa'
      }
    });
  }

  /**
   * Notificación para error al subir proyecto
   */
  static async createProyectoError(autorId: number, proyectoTitulo: string, motivoError: string) {
    await this.create({
      usuarioId: autorId,
      tipo: NotificationType.PROYECTO_ERROR,
      titulo: 'Error al publicar proyecto',
      mensaje: `No se pudo publicar "${proyectoTitulo}". ${motivoError}`,
      datosExtra: {
        proyectoTitulo,
        motivoError,
        accion: 'subida_proyecto',
        estado: 'error'
      }
    });
  }

  /**
   * Obtener notificaciones de un usuario
   */
  static async getUserNotifications(usuarioId: number, limit: number = 10) {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          usuarioId: usuarioId
        },
        orderBy: {
          fechaCreacion: 'desc'
        },
        take: limit
      });

      return notifications;
    } catch (error) {
      console.error('❌ Error obteniendo notificaciones:', error);
      throw error;
    }
  }

  /**
   * Marcar notificación como leída
   */
  static async markAsRead(notificationId: number, usuarioId: number) {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          usuarioId: usuarioId // Verificar que pertenece al usuario
        },
        data: {
          leida: true,
          fechaLeida: new Date()
        }
      });

      return notification;
    } catch (error) {
      console.error('❌ Error marcando notificación como leída:', error);
      throw error;
    }
  }

  /**
   * Obtener conteo de notificaciones no leídas
   */
  static async getUnreadCount(usuarioId: number) {
    try {
      const count = await prisma.notification.count({
        where: {
          usuarioId: usuarioId,
          leida: false
        }
      });

      return count;
    } catch (error) {
      console.error('❌ Error obteniendo conteo de no leídas:', error);
      throw error;
    }
  }
}

export default NotificationService;