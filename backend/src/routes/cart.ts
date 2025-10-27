import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: any;
}

/**
 * GET /api/cart - Obtener proyectos del carrito del usuario
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const cartItems = await prisma.cart.findMany({
      where: { usuarioId: userId },
      include: {
        proyecto: {
          include: {
            vendedor: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                calificacionVendedor: true,
                totalVentas: true,
                profileImage: true
              }
            },
            categoria: {
              select: {
                id: true,
                nombre: true,
                colorHex: true
              }
            },
            imagenes: {
              where: { esPrincipal: true },
              select: {
                urlArchivo: true,
                nombreArchivo: true
              }
            }
          }
        }
      },
      orderBy: {
        fechaAgregado: 'desc'
      }
    });

    // Calcular total del carrito
    const total = cartItems.reduce((sum, item) => {
      return sum + Number(item.proyecto.precio);
    }, 0);

    res.json({
      success: true,
      data: {
        items: cartItems,
        total: total,
        count: cartItems.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/cart - Agregar proyecto al carrito
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { projectId } = req.body;

    if (!projectId) {
      res.status(400).json({
        success: false,
        message: 'ID del proyecto es requerido'
      });
      return;
    }

    // Verificar que el proyecto existe
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
      include: {
        vendedor: true,
        ventas: {
          where: { compradorId: userId }
        }
      }
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
      return;
    }

    // Verificar que no es el propietario del proyecto
    if (project.vendedorId === userId) {
      res.status(400).json({
        success: false,
        message: 'No puedes agregar tu propio proyecto al carrito',
        code: 'OWN_PROJECT'
      });
      return;
    }

    // Verificar que no ha comprado ya el proyecto
    if (project.ventas.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Ya has comprado este proyecto',
        code: 'ALREADY_PURCHASED'
      });
      return;
    }

    // Verificar que no está ya en el carrito
    const existingCartItem = await prisma.cart.findFirst({
      where: {
        usuarioId: userId,
        proyectoId: parseInt(projectId)
      }
    });

    if (existingCartItem) {
      res.status(400).json({
        success: false,
        message: 'El proyecto ya está en tu carrito',
        code: 'ALREADY_IN_CART'
      });
      return;
    }

    // Agregar al carrito
    const cartItem = await prisma.cart.create({
      data: {
        usuarioId: userId,
        proyectoId: parseInt(projectId)
      },
      include: {
        proyecto: {
          select: {
            id: true,
            titulo: true,
            precio: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Proyecto agregado al carrito exitosamente',
      data: cartItem
    });

  } catch (error) {
    console.error('Error agregando al carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * DELETE /api/cart/:projectId - Remover proyecto del carrito
 */
router.delete('/:projectId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.projectId);

    if (isNaN(projectId)) {
      res.status(400).json({
        success: false,
        message: 'ID del proyecto inválido'
      });
      return;
    }

    // Verificar que el item existe en el carrito
    const cartItem = await prisma.cart.findFirst({
      where: {
        usuarioId: userId,
        proyectoId: projectId
      }
    });

    if (!cartItem) {
      res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado en el carrito'
      });
      return;
    }

    // Remover del carrito
    await prisma.cart.deleteMany({
      where: {
        usuarioId: userId,
        proyectoId: projectId
      }
    });

    res.json({
      success: true,
      message: 'Proyecto removido del carrito exitosamente'
    });

  } catch (error) {
    console.error('Error removiendo del carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * DELETE /api/cart - Limpiar todo el carrito
 */
router.delete('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    await prisma.cart.deleteMany({
      where: { usuarioId: userId }
    });

    res.json({
      success: true,
      message: 'Carrito limpiado exitosamente'
    });

  } catch (error) {
    console.error('Error limpiando carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/cart/count - Obtener número de items en el carrito
 */
router.get('/count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const count = await prisma.cart.count({
      where: { usuarioId: userId }
    });

    res.json({
      success: true,
      data: { count }
    });

  } catch (error) {
    console.error('Error obteniendo conteo del carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;