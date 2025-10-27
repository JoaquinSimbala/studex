import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /favorites
 * Obtiene todos los favoritos del usuario autenticado
 */
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    console.log('📋 Obteniendo favoritos del usuario:', userId);

    const favorites = await prisma.favorite.findMany({
      where: { usuarioId: userId },
      include: {
        proyecto: {
          include: {
            imagenes: {
              where: { esPrincipal: true },
              take: 1
            },
            categoria: true,
            vendedor: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                profileImage: true,
                emailVerificado: true
              }
            }
          }
        }
      },
      orderBy: {
        fechaAgregado: 'desc'
      }
    });

    // Formatear respuesta
    const formattedFavorites = favorites.map(favorite => ({
      id: `${favorite.usuarioId}-${favorite.proyectoId}`,
      projectId: favorite.proyectoId,
      userId: favorite.usuarioId,
      createdAt: favorite.fechaAgregado,
      project: {
        id: favorite.proyecto.id,
        title: favorite.proyecto.titulo,
        description: favorite.proyecto.descripcion,
        price: favorite.proyecto.precio,
        type: favorite.proyecto.tipo,
        university: favorite.proyecto.universidad,
        category: favorite.proyecto.categoria?.nombre || 'Sin categoría',
        year: favorite.proyecto.año,
        rating: 4.5, // Valor por defecto, implementar rating real después
        views: favorite.proyecto.vistas || 0,
        mainImage: favorite.proyecto.imagenes && favorite.proyecto.imagenes.length > 0 ? {
          fileUrl: favorite.proyecto.imagenes[0].urlArchivo,
          fileName: favorite.proyecto.imagenes[0].nombreArchivo
        } : null,
        seller: {
          id: favorite.proyecto.vendedor.id,
          name: `${favorite.proyecto.vendedor.nombre} ${favorite.proyecto.vendedor.apellidos}`,
          avatar: favorite.proyecto.vendedor.profileImage,
          rating: 4.8, // Valor por defecto
          salesCount: 0 // Implementar conteo real después
        }
      }
    }));

    res.status(200).json({
      success: true,
      data: formattedFavorites,
      count: formattedFavorites.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo favoritos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /favorites
 * Agrega un proyecto a favoritos
 */
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { projectId } = req.body;

    console.log('❤️ POST /favorites - Usuario:', userId, 'Proyecto:', projectId);

    // Validación básica
    if (!projectId) {
      console.log('❌ ProjectId no proporcionado');
      res.status(400).json({ success: false, message: 'ID de proyecto requerido' });
      return;
    }

    // Verificar que el proyecto existe y no es propio
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) }
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
      return;
    }

    if (project.vendedorId === userId) {
      console.log('❌ Usuario intentando agregar su propio proyecto');
      res.status(400).json({ 
        success: false, 
        message: 'No puedes agregar tus propios proyectos a favoritos',
        code: 'OWN_PROJECT' 
      });
      return;
    }

    // Verificar si ya existe el favorito
    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        usuarioId: userId,
        proyectoId: parseInt(projectId)
      }
    });

    if (existingFavorite) {
      console.log('❌ Ya existe en favoritos');
      res.status(400).json({ success: false, message: 'Ya está en favoritos' });
      return;
    }

    // Crear el favorito (la fecha se agrega automáticamente)
    const newFavorite = await prisma.favorite.create({
      data: {
        usuarioId: userId,
        proyectoId: parseInt(projectId)
      }
    });

    console.log('✅ Favorito creado exitosamente:', newFavorite);

    res.status(200).json({
      success: true,
      message: 'Agregado a favoritos',
      data: newFavorite
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

/**
 * DELETE /favorites/:projectId
 * Remueve un proyecto de favoritos
 */
router.delete('/:projectId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { projectId } = req.params;

    console.log('🗑️ DELETE /favorites - Usuario:', userId, 'Proyecto:', projectId);

    // Buscar el favorito
    const favorite = await prisma.favorite.findFirst({
      where: {
        usuarioId: userId,
        proyectoId: parseInt(projectId)
      }
    });

    if (!favorite) {
      console.log('❌ Favorito no encontrado para eliminar');
      res.status(404).json({ success: false, message: 'No está en favoritos' });
      return;
    }

    // Eliminar el favorito
    await prisma.favorite.delete({
      where: {
        usuarioId_proyectoId: {
          usuarioId: userId,
          proyectoId: parseInt(projectId)
        }
      }
    });

    console.log('✅ Favorito eliminado exitosamente');

    res.status(200).json({
      success: true,
      message: 'Removido de favoritos'
    });

  } catch (error) {
    console.error('❌ Error eliminando favorito:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

/**
 * GET /favorites/check/:projectId
 * Verifica si un proyecto está en favoritos
 */
router.get('/check/:projectId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { projectId } = req.params;

    const favorite = await prisma.favorite.findFirst({
      where: {
        usuarioId: userId,
        proyectoId: parseInt(projectId)
      }
    });

    res.status(200).json({
      success: true,
      data: {
        isFavorite: !!favorite
      }
    });

  } catch (error) {
    console.error('❌ Error verificando favorito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;