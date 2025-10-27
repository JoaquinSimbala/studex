import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /categories
 * Obtiene todas las categorías activas
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📂 Obteniendo categorías activas...');

    // Usar raw SQL para consultar la base de datos actual
    const categories = await prisma.$queryRaw`
      SELECT 
        id,
        nombre,
        descripcion,
        icono,
        color_hex as "colorHex",
        activa,
        orden_display as "ordenDisplay"
      FROM categorias_proyectos 
      WHERE activa = true 
      ORDER BY orden_display ASC
    ` as any[];

    console.log('✅ Categorías encontradas:', categories.length);
    console.log('📋 Categorías:', categories.map(c => `${c.id}: ${c.nombre} (${c.icono})`));

    res.json({
      success: true,
      data: categories,
      total: categories.length
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * GET /categories/:id
 * Obtiene una categoría específica por ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryId = parseInt(req.params.id);
    
    if (!categoryId || isNaN(categoryId)) {
      res.status(400).json({
        success: false,
        message: 'ID de categoría inválido'
      });
      return;
    }

    console.log('📂 Obteniendo categoría ID:', categoryId);

    // Usar raw SQL para la consulta principal
    const categories = await prisma.$queryRaw`
      SELECT 
        id,
        nombre,
        descripcion,
        icono,
        color_hex as "colorHex",
        activa
      FROM categorias_proyectos 
      WHERE id = ${categoryId}
    ` as any[];

    if (!categories || categories.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
      return;
    }

    const category = categories[0];

    // Contar proyectos publicados de esta categoría
    const projectCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM projects 
      WHERE "categoryId" = ${categoryId} 
      AND status = 'publicado'
    ` as any[];

    console.log('✅ Categoría encontrada:', category.nombre);

    res.json({
      success: true,
      data: {
        ...category,
        totalProjects: parseInt(projectCount[0]?.count || '0')
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      details: error.message
    });
  }
});

export default router;