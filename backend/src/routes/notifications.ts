import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

/**
 * GET /api/notifications
 * Obtener notificaciones del usuario actual
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 10;

    const notifications = await prisma.notification.findMany({
      where: {
        usuarioId: userId
      },
      orderBy: {
        fechaCreacion: 'desc'
      },
      take: limit
    });

    res.json({
      success: true,
      data: notifications
    });

  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/notifications/unread-count
 */
router.get('/unread-count', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
      return;
    }

    const count = await prisma.notification.count({
      where: {
        usuarioId: userId,
        leida: false
      }
    });

    res.json({
      success: true,
      data: { unreadCount: count }
    });

  } catch (error) {
    console.error('Error obteniendo conteo de no leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
      return;
    }

    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      res.status(400).json({
        success: false,
        message: 'ID de notificación inválido'
      });
      return;
    }

    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        usuarioId: userId
      },
      data: {
        leida: true,
        fechaLeida: new Date()
      }
    });

    res.json({
      success: true,
      data: notification
    });

  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * PUT /api/notifications/mark-all-read
 */
router.put('/mark-all-read', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
      return;
    }

    await prisma.notification.updateMany({
      where: {
        usuarioId: userId,
        leida: false
      },
      data: {
        leida: true,
        fechaLeida: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas'
    });

  } catch (error) {
    console.error('Error marcando todas como leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;