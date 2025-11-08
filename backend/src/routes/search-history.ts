/**
 * @fileoverview Rutas para gestión del historial de búsquedas de usuarios
 * 
 * @description
 * Endpoints para:
 * - Guardar búsquedas (con lógica de duplicados y reactivación)
 * - Obtener búsquedas recientes del usuario (solo activas)
 * - Desactivar búsquedas específicas (soft delete)
 * - Limpiar todo el historial del usuario
 * - Obtener búsquedas populares globales
 * 
 * @author STUDEX Team
 * @version 1.0.0
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/search-history
 * Guardar o actualizar una búsqueda del usuario
 * 
 * @description
 * Lógica implementada:
 * 1. Si ya existe el término (activo o inactivo) → Reactivar y actualizar timestamp
 * 2. Si no existe → Crear nuevo registro
 * 3. Si el usuario tiene más de 50 búsquedas → Eliminar las más antiguas
 * 
 * @body { termino: string } - Término de búsqueda
 */
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { termino } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    if (!termino || termino.trim().length === 0) {
      res.status(400).json({ error: 'El término de búsqueda es requerido' });
      return;
    }

    const terminoNormalizado = termino.trim().toLowerCase();

    // 1. Verificar si ya existe este término para el usuario
    const existingSearch = await prisma.searchHistory.findFirst({
      where: {
        usuarioId: userId,
        termino: terminoNormalizado
      }
    });

    if (existingSearch) {
      // Si existe (activo o inactivo), reactivar y actualizar timestamp
      const updated = await prisma.searchHistory.update({
        where: { id: existingSearch.id },
        data: {
          isActive: true,
          timestamp: new Date()
        }
      });

      res.status(200).json({
        message: 'Búsqueda actualizada',
        search: updated
      });
      return;
    }

    // 2. Crear nuevo registro
    const newSearch = await prisma.searchHistory.create({
      data: {
        usuarioId: userId,
        termino: terminoNormalizado,
        isActive: true
      }
    });

    // 3. Verificar límite de 50 búsquedas activas
    const totalActive = await prisma.searchHistory.count({
      where: {
        usuarioId: userId,
        isActive: true
      }
    });

    // Si excede 50, desactivar las más antiguas
    if (totalActive > 50) {
      const exceso = totalActive - 50;
      
      // Obtener las más antiguas
      const oldestSearches = await prisma.searchHistory.findMany({
        where: {
          usuarioId: userId,
          isActive: true
        },
        orderBy: {
          timestamp: 'asc'
        },
        take: exceso,
        select: { id: true }
      });

      // Desactivarlas
      await prisma.searchHistory.updateMany({
        where: {
          id: { in: oldestSearches.map(s => s.id) }
        },
        data: {
          isActive: false
        }
      });
    }

    res.status(201).json({
      message: 'Búsqueda guardada exitosamente',
      search: newSearch
    });

  } catch (error) {
    console.error('❌ Error al guardar búsqueda:', error);
    res.status(500).json({ error: 'Error al guardar la búsqueda' });
  }
});

/**
 * GET /api/search-history/recent
 * Obtener búsquedas recientes del usuario autenticado
 * 
 * @query limit - Número de búsquedas a retornar (default: 5, max: 20)
 * @returns Array de búsquedas ordenadas por timestamp DESC
 */
router.get('/recent', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const recentSearches = await prisma.searchHistory.findMany({
      where: {
        usuarioId: userId,
        isActive: true
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit,
      select: {
        id: true,
        termino: true,
        timestamp: true
      }
    });

    res.status(200).json(recentSearches);

  } catch (error) {
    console.error('❌ Error al obtener búsquedas recientes:', error);
    res.status(500).json({ error: 'Error al obtener búsquedas recientes' });
  }
});

/**
 * GET /api/search-history/popular
 * Obtener búsquedas populares globales
 * 
 * @description
 * Retorna los términos más buscados de todos los usuarios (solo activos)
 * Agrupa por término y cuenta ocurrencias
 * 
 * @query limit - Número de búsquedas populares (default: 5, max: 10)
 */
router.get('/popular', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);

    // Obtener búsquedas agrupadas por término
    const popularSearches = await prisma.searchHistory.groupBy({
      by: ['termino'],
      where: {
        isActive: true
      },
      _count: {
        termino: true
      },
      orderBy: {
        _count: {
          termino: 'desc'
        }
      },
      take: limit
    });

    // Formatear respuesta
    const formattedSearches = popularSearches.map(search => ({
      termino: search.termino,
      count: search._count.termino
    }));

    res.status(200).json(formattedSearches);

  } catch (error) {
    console.error('❌ Error al obtener búsquedas populares:', error);
    res.status(500).json({ error: 'Error al obtener búsquedas populares' });
  }
});

/**
 * PATCH /api/search-history/:id/deactivate
 * Desactivar una búsqueda específica (soft delete)
 * 
 * @param id - ID de la búsqueda a desactivar
 */
router.patch('/:id/deactivate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const searchId = parseInt(req.params.id);

    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    if (isNaN(searchId)) {
      res.status(400).json({ error: 'ID de búsqueda inválido' });
      return;
    }

    // Verificar que la búsqueda pertenece al usuario
    const search = await prisma.searchHistory.findFirst({
      where: {
        id: searchId,
        usuarioId: userId
      }
    });

    if (!search) {
      res.status(404).json({ error: 'Búsqueda no encontrada' });
      return;
    }

    // Desactivar la búsqueda
    await prisma.searchHistory.update({
      where: { id: searchId },
      data: { isActive: false }
    });

    res.status(200).json({ message: 'Búsqueda eliminada exitosamente' });

  } catch (error) {
    console.error('❌ Error al desactivar búsqueda:', error);
    res.status(500).json({ error: 'Error al eliminar la búsqueda' });
  }
});

/**
 * DELETE /api/search-history/clear
 * Desactivar todas las búsquedas del usuario
 */
router.delete('/clear', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const result = await prisma.searchHistory.updateMany({
      where: {
        usuarioId: userId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    res.status(200).json({
      message: 'Historial limpiado exitosamente',
      count: result.count
    });

  } catch (error) {
    console.error('❌ Error al limpiar historial:', error);
    res.status(500).json({ error: 'Error al limpiar el historial' });
  }
});

export default router;
