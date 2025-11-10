import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/comments/:projectId
 * Obtiene todos los comentarios de un proyecto
 */
router.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de proyecto inválido'
      });
    }

    const comments = await prisma.projectComment.findMany({
      where: { proyectoId: projectId },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            profileImage: true,
            vendedorVerificado: true,
            institucion: true
          }
        }
      },
      orderBy: { fechaCreacion: 'desc' }
    });

    return res.json({
      success: true,
      data: comments
    });
  } catch (error: any) {
    console.error('Error obteniendo comentarios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener comentarios'
    });
  }
});

/**
 * POST /api/comments
 * Crea un nuevo comentario (requiere autenticación)
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId, content } = req.body;

    console.log('📝 POST /api/comments - userId:', userId, 'projectId:', projectId, 'user object:', (req as any).user);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!projectId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }

    // Validar longitud del comentario
    if (content.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'El comentario debe tener al menos 3 caracteres'
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'El comentario no puede exceder 1000 caracteres'
      });
    }

    // Verificar que el proyecto existe
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    // Crear el comentario
    const comment = await prisma.projectComment.create({
      data: {
        contenido: content.trim(),
        proyectoId: projectId,
        usuarioId: userId
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            profileImage: true,
            vendedorVerificado: true,
            institucion: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      data: comment,
      message: 'Comentario publicado exitosamente'
    });
  } catch (error: any) {
    console.error('Error creando comentario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear comentario'
    });
  }
});

/**
 * DELETE /api/comments/:commentId
 * Elimina un comentario (solo el autor o admin)
 */
router.delete('/:commentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userType = (req as any).user?.tipo;
    const commentId = parseInt(req.params.commentId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (isNaN(commentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de comentario inválido'
      });
    }

    // Buscar el comentario
    const comment = await prisma.projectComment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // Verificar que el usuario es el autor o es admin
    if (comment.usuarioId !== userId && userType !== 'ADMINISTRADOR') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este comentario'
      });
    }

    // Eliminar el comentario
    await prisma.projectComment.delete({
      where: { id: commentId }
    });

    return res.json({
      success: true,
      message: 'Comentario eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error eliminando comentario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar comentario'
    });
  }
});

export default router;
