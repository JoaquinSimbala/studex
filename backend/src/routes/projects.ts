import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { upload, uploadToCloudinary, handleMulterError } from '../services/cloudinary';
import { NotificationService } from '../services/notificationService';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /projects/featured
 * Obtiene proyectos destacados para mostrar en la página principal
 */
router.get('/featured', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 6;
    
    console.log('📚 Obteniendo proyectos destacados, límite:', limit);

    const featuredProjects = await prisma.project.findMany({
      where: {
        estado: 'DESTACADO'         // Solo proyectos con estado DESTACADO
      },
      include: {
        vendedor: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            institucion: true,
            calificacionVendedor: true,
            vendedorVerificado: true
          }
        },
        categoria: {
          select: {
            id: true,
            nombre: true,
            icono: true,
            colorHex: true
          }
        },
        imagenes: {
          where: { esPrincipal: true },
          take: 1,
          select: {
            id: true,
            nombreArchivo: true,
            urlArchivo: true,
            claveArchivo: true,
            tamañoArchivo: true,
            tipoMime: true,
            esPrincipal: true,
            orden: true
          }
        },
        _count: {
          select: {
            calificaciones: true,
            favoritos: true
          }
        }
      },
      orderBy: [
        { fechaCreacion: 'desc' },    // Más recientes primero
        { vistas: 'desc' },        // Luego por popularidad
        { destacado: 'desc' }      // Finalmente por destacado
      ],
      take: limit
    });

    console.log('✅ Proyectos destacados encontrados:', featuredProjects.length);
    console.log('📊 IDs encontrados:', featuredProjects.map(p => `${p.id}:${p.titulo.substring(0,30)}...`));

    // Formatear respuesta para compatibilidad con frontend
    const formattedProjects = featuredProjects.map(project => ({
      id: project.id,
      title: project.titulo,
      description: project.descripcion,
      price: Number(project.precio),
      university: project.universidad,
      subject: project.materia,
      year: project.año,
      status: project.estado,
      views: project.vistas,
      downloads: project.descargas,
      featured: project.destacado,
      tags: project.etiquetas || [],
      createdAt: project.fechaCreacion,
      updatedAt: project.fechaActualizacion,
      category: {
        id: project.categoria.id,
        nombre: project.categoria.nombre,
        icono: project.categoria.icono,
        colorHex: project.categoria.colorHex
      },
      seller: {
        id: project.vendedor.id,
        name: `${project.vendedor.nombre} ${project.vendedor.apellidos}`,
        university: project.vendedor.institucion || 'No especificada',
        rating: project.vendedor.calificacionVendedor || 0,
        verified: project.vendedor.vendedorVerificado
      },
      mainImage: project.imagenes[0] ? {
        id: project.imagenes[0].id,
        fileName: project.imagenes[0].nombreArchivo,
        fileUrl: project.imagenes[0].urlArchivo,
        fileKey: project.imagenes[0].claveArchivo,
        fileSize: project.imagenes[0].tamañoArchivo,
        mimeType: project.imagenes[0].tipoMime,
        isMain: project.imagenes[0].esPrincipal,
        order: project.imagenes[0].orden
      } : null,
      stats: {
        totalRatings: project._count.calificaciones,
        totalFavorites: project._count.favoritos
      }
    }));

    res.json({
      success: true,
      data: formattedProjects,
      total: featuredProjects.length
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo proyectos destacados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * GET /projects/explore
 * Obtiene proyectos públicos con filtros para la página de explorar
 */
router.get('/explore', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search = '',
      type = '',
      category = '',
      university = '',
      career = '',
      minPrice,
      maxPrice,
      orderBy = 'newest',
      page = '1',
      limit = '12'
    } = req.query;

    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 12;
    const offset = (pageNumber - 1) * limitNumber;

    console.log('🔍 Explorando proyectos con filtros:', {
      search, type, category, university, career, minPrice, maxPrice, orderBy, page: pageNumber, limit: limitNumber
    });

    // Construir filtros dinámicos
    const whereClause: any = {
      AND: [
        {
          OR: [
            { estado: 'PUBLICADO' },
            { estado: 'DESTACADO' }
          ]
        }
      ]
    };

    // Filtro por búsqueda de texto
    if (search) {
      whereClause.AND.push({
        OR: [
          { titulo: { contains: search as string, mode: 'insensitive' } },
          { descripcion: { contains: search as string, mode: 'insensitive' } },
          { etiquetas: { hasSome: [search as string] } }
        ]
      });
    }

    // Filtro por tipo
    if (type) {
      whereClause.AND.push({ tipo: type as string });
    }

    // Filtro por universidad
    if (university) {
      whereClause.AND.push({ universidad: { contains: university as string, mode: 'insensitive' } });
    }

    // Filtro por carrera/materia
    if (career) {
      whereClause.AND.push({ materia: { contains: career as string, mode: 'insensitive' } });
    }

    // Filtro por rango de precio
    if (minPrice) {
      whereClause.AND.push({ precio: { gte: parseFloat(minPrice as string) } });
    }
    if (maxPrice) {
      whereClause.AND.push({ precio: { lte: parseFloat(maxPrice as string) } });
    }

    // Filtro por categoría (si se proporciona)
    if (category) {
      whereClause.AND.push({
        categoria: {
          nombre: { contains: category as string, mode: 'insensitive' }
        }
      });
    }

    // Construir ordenamiento
    let orderByClause: any = {};
    switch (orderBy) {
      case 'newest':
        orderByClause = { fechaCreacion: 'desc' };
        break;
      case 'oldest':
        orderByClause = { fechaCreacion: 'asc' };
        break;
      case 'price_asc':
        orderByClause = { precio: 'asc' };
        break;
      case 'price_desc':
        orderByClause = { precio: 'desc' };
        break;
      case 'rating':
        orderByClause = { vendedor: { calificacionVendedor: 'desc' } };
        break;
      case 'popular':
        orderByClause = { vistas: 'desc' };
        break;
      default:
        orderByClause = { fechaCreacion: 'desc' };
    }

    // Obtener total de proyectos que coinciden con los filtros
    const totalProjects = await prisma.project.count({
      where: whereClause
    });

    // Obtener proyectos con paginación
    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        vendedor: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            institucion: true,
            calificacionVendedor: true,
            vendedorVerificado: true,
            totalVentas: true
          }
        },
        categoria: {
          select: {
            id: true,
            nombre: true,
            icono: true,
            colorHex: true
          }
        },
        imagenes: {
          where: { esPrincipal: true },
          take: 1,
          select: {
            id: true,
            nombreArchivo: true,
            urlArchivo: true,
            tipoMime: true,
            esPrincipal: true
          }
        },
        _count: {
          select: {
            calificaciones: true,
            favoritos: true
          }
        }
      },
      orderBy: orderByClause,
      take: limitNumber,
      skip: offset
    });

    console.log(`✅ Encontrados ${projects.length} proyectos de ${totalProjects} total`);

    // Formatear respuesta
    const formattedProjects = projects.map(project => ({
      id: project.id,
      title: project.titulo,
      description: project.descripcion,
      price: Number(project.precio),
      type: project.tipo,
      university: project.universidad,
      category: project.categoria?.nombre || 'Sin categoría',
      year: project.año,
      rating: Number(project.vendedor.calificacionVendedor) || 0,
      views: project.vistas,
      mainImage: project.imagenes[0] ? {
        fileUrl: project.imagenes[0].urlArchivo,
        fileName: project.imagenes[0].nombreArchivo
      } : null,
      isFavorite: false, // TODO: Calcular según usuario logueado
      seller: {
        id: project.vendedor.id,
        name: `${project.vendedor.nombre} ${project.vendedor.apellidos || ''}`.trim(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(project.vendedor.nombre)}&background=10B981&color=ffffff&size=40`,
        rating: Number(project.vendedor.calificacionVendedor) || 0,
        salesCount: project.vendedor.totalVentas || 0
      },
      featured: project.destacado
    }));

    // Obtener estadísticas basadas en los filtros aplicados
    // IMPORTANTE: Usar el mismo whereClause para que las estadísticas reflejen los resultados filtrados
    const stats = await prisma.project.aggregate({
      where: whereClause,
      _count: true
    });

    const universities = await prisma.project.findMany({
      where: whereClause,
      select: { universidad: true },
      distinct: ['universidad']
    });

    // Contar categorías únicas en los proyectos filtrados
    const projectsWithCategories = await prisma.project.findMany({
      where: whereClause,
      select: { categoriaId: true },
      distinct: ['categoriaId']
    });
    
    const categoriesCount = projectsWithCategories.length;

    res.json({
      success: true,
      data: formattedProjects,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalProjects / limitNumber),
        totalItems: totalProjects,
        itemsPerPage: limitNumber,
        hasNextPage: pageNumber < Math.ceil(totalProjects / limitNumber),
        hasPrevPage: pageNumber > 1
      },
      stats: {
        total: stats._count,
        universities: universities.length,
        categories: categoriesCount
      }
    });

  } catch (error: any) {
    console.error('❌ Error en explore projects:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * GET /projects/categories
 * Obtiene todas las categorías disponibles para filtros
 */
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📂 Obteniendo categorías para filtros');

    const categories = await prisma.category.findMany({
      where: {
        activa: true
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        icono: true,
        colorHex: true
      },
      orderBy: {
        ordenDisplay: 'asc'
      }
    });

    console.log(`✅ ${categories.length} categorías encontradas`);

    res.json({
      success: true,
      data: categories
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
 * GET /projects/:id/download/:fileId
 * Registra una descarga y retorna información del archivo
 */
router.get('/:id/download/:fileId', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = parseInt(req.params.id);
    const fileId = parseInt(req.params.fileId);
    
    if (!projectId || isNaN(projectId) || !fileId || isNaN(fileId)) {
      res.status(400).json({
        success: false,
        message: 'ID de proyecto o archivo inválido'
      });
      return;
    }

    console.log('📥 Registrando descarga - Proyecto:', projectId, 'Archivo:', fileId);

    // Verificar que el archivo existe y pertenece al proyecto
    const file = await prisma.projectFile.findFirst({
      where: {
        id: fileId,
        proyectoId: projectId
      }
    });

    if (!file) {
      res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
      return;
    }

    // Incrementar contador de descargas del proyecto
    await prisma.project.update({
      where: { id: projectId },
      data: {
        descargas: {
          increment: 1
        }
      }
    });

    // Retornar información del archivo para descarga
    res.json({
      success: true,
      data: {
        fileName: file.nombreArchivo,
        fileUrl: file.urlArchivo,
        mimeType: file.tipoMime,
        fileSize: file.tamañoArchivo
      }
    });

  } catch (error: any) {
    console.error('❌ Error procesando descarga:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * GET /projects/types
 * Obtiene todos los tipos de proyecto disponibles desde el enum ProjectType
 */
router.get('/types', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📋 Obteniendo tipos de proyecto disponibles');

    // Definir los tipos de proyecto con sus labels en español
    const projectTypes = [
      // Documentación y guías
      { value: 'MANUAL_GUIA', label: 'Manual o Guía', category: 'Documentación y guías' },
      { value: 'TUTORIAL_CURSO', label: 'Tutorial o Curso', category: 'Documentación y guías' },
      { value: 'DOCUMENTACION', label: 'Documentación', category: 'Documentación y guías' },
      { value: 'PLANTILLA_TEMPLATE', label: 'Plantilla o Template', category: 'Documentación y guías' },
      
      // Desarrollo y tecnología
      { value: 'SISTEMA_APLICACION', label: 'Sistema o Aplicación', category: 'Desarrollo y tecnología' },
      { value: 'CODIGO_FUENTE', label: 'Código Fuente', category: 'Desarrollo y tecnología' },
      { value: 'BASE_DATOS', label: 'Base de Datos', category: 'Desarrollo y tecnología' },
      { value: 'API_SERVICIO', label: 'API o Servicio', category: 'Desarrollo y tecnología' },
      
      // Análisis y negocio
      { value: 'PLAN_NEGOCIO', label: 'Plan de Negocio', category: 'Análisis y negocio' },
      { value: 'ANALISIS_CASO', label: 'Análisis de Caso', category: 'Análisis y negocio' },
      { value: 'INVESTIGACION_ESTUDIO', label: 'Investigación o Estudio', category: 'Análisis y negocio' },
      { value: 'ANALISIS_MERCADO', label: 'Análisis de Mercado', category: 'Análisis y negocio' },
      
      // Diseño y multimedia
      { value: 'DISEÑO_GRAFICO', label: 'Diseño Gráfico', category: 'Diseño y multimedia' },
      { value: 'PRESENTACION', label: 'Presentación', category: 'Diseño y multimedia' },
      { value: 'VIDEO_AUDIO', label: 'Video o Audio', category: 'Diseño y multimedia' },
      { value: 'MATERIAL_VISUAL', label: 'Material Visual', category: 'Diseño y multimedia' },
      
      // Otros formatos
      { value: 'HOJA_CALCULO', label: 'Hoja de Cálculo', category: 'Otros formatos' },
      { value: 'FORMULARIO_FORMATO', label: 'Formulario o Formato', category: 'Otros formatos' },
      { value: 'OTRO', label: 'Otro', category: 'Otros formatos' }
    ];

    console.log(`✅ Devolviendo ${projectTypes.length} tipos de proyecto`);

    res.status(200).json({
      success: true,
      message: 'Tipos de proyecto obtenidos exitosamente',
      data: projectTypes
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo tipos de proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /projects/:id
 * Obtiene detalles completos de un proyecto específico
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (!projectId || isNaN(projectId)) {
      res.status(400).json({
        success: false,
        message: 'ID de proyecto inválido'
      });
      return;
    }

    console.log('📄 Obteniendo detalles del proyecto:', projectId);

    const project = await prisma.project.findUnique({
      where: {
        id: projectId
      },
      include: {
        vendedor: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            institucion: true,
            calificacionVendedor: true,
            vendedorVerificado: true
          }
        },
        categoria: {
          select: {
            id: true,
            nombre: true,
            icono: true,
            colorHex: true
          }
        },
        imagenes: {
          orderBy: { orden: 'asc' },
          select: {
            id: true,
            nombreArchivo: true,
            urlArchivo: true,
            claveArchivo: true,
            tamañoArchivo: true,
            tipoMime: true,
            esPrincipal: true,
            orden: true
          }
        },
        archivos: {
          orderBy: { orden: 'asc' },
          select: {
            id: true,
            nombreArchivo: true,
            urlArchivo: true,
            claveArchivo: true,
            tamañoArchivo: true,
            tipoMime: true,
            descripcion: true,
            orden: true
          }
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

    // Incrementar contador de vistas
    await prisma.project.update({
      where: { id: projectId },
      data: {
        vistas: {
          increment: 1
        }
      }
    });

    // Formatear respuesta con verificación de tipos
    const formattedProject = {
      id: project.id,
      title: project.titulo,
      description: project.descripcion,
      price: Number(project.precio),
      type: project.tipo,
      university: project.universidad,
      subject: project.materia,
      year: project.año,
      status: project.estado,
      views: project.vistas + 1, // Incluir la vista actual
      downloads: project.descargas,
      featured: project.destacado,
      tags: project.etiquetas || [],
      createdAt: project.fechaCreacion,
      updatedAt: project.fechaActualizacion,
      category: project.categoria ? {
        id: project.categoria.id,
        nombre: project.categoria.nombre,
        icono: project.categoria.icono,
        colorHex: project.categoria.colorHex
      } : null,
      seller: project.vendedor ? {
        id: project.vendedor.id,
        name: `${project.vendedor.nombre} ${project.vendedor.apellidos}`,
        university: project.vendedor.institucion || 'No especificada',
        rating: project.vendedor.calificacionVendedor || 0,
        verified: project.vendedor.vendedorVerificado
      } : null,
      images: project.imagenes.map(img => ({
        id: img.id,
        fileName: img.nombreArchivo,
        fileUrl: img.urlArchivo,
        fileKey: img.claveArchivo,
        fileSize: img.tamañoArchivo,
        mimeType: img.tipoMime,
        isMain: img.esPrincipal,
        order: img.orden
      })),
      files: project.archivos.map(file => ({
        id: file.id,
        fileName: file.nombreArchivo,
        fileUrl: file.urlArchivo,
        fileKey: file.claveArchivo,
        fileSize: file.tamañoArchivo,
        mimeType: file.tipoMime,
        description: file.descripcion,
        order: file.orden
      }))
    };

    console.log('✅ Proyecto encontrado:', project.titulo);

    res.json({
      success: true,
      data: formattedProject
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * GET /projects/recent
 * Obtiene proyectos recientes
 */
router.get('/recent', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 8;
    
    console.log('📚 Obteniendo proyectos recientes, límite:', limit);

    const recentProjects = await prisma.project.findMany({
      where: {
        estado: {
          in: ['PUBLICADO', 'DESTACADO']
        }
      },
      include: {
        vendedor: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            institucion: true,
            calificacionVendedor: true,
            vendedorVerificado: true
          }
        },
        categoria: {
          select: {
            id: true,
            nombre: true,
            icono: true,
            colorHex: true
          }
        },
        imagenes: {
          where: { esPrincipal: true },
          take: 1,
          select: {
            id: true,
            nombreArchivo: true,
            urlArchivo: true,
            claveArchivo: true,
            tamañoArchivo: true,
            tipoMime: true,
            esPrincipal: true,
            orden: true
          }
        },
        _count: {
          select: {
            calificaciones: true,
            favoritos: true
          }
        }
      },
      orderBy: {
        fechaCreacion: 'desc'
      },
      take: limit
    });

    console.log('✅ Proyectos recientes encontrados:', recentProjects.length);

    // Formatear respuesta
    const formattedProjects = recentProjects.map(project => ({
      id: project.id,
      title: project.titulo,
      description: project.descripcion,
      price: Number(project.precio),
      type: project.tipo,
      university: project.universidad,
      subject: project.materia,
      year: project.año,
      status: project.estado,
      views: project.vistas,
      downloads: project.descargas,
      featured: project.destacado,
      tags: project.etiquetas,
      createdAt: project.fechaCreacion,
      updatedAt: project.fechaActualizacion,
      seller: {
        id: project.vendedor.id,
        name: `${project.vendedor.nombre} ${project.vendedor.apellidos || ''}`.trim(),
        university: project.vendedor.institucion,
        rating: Number(project.vendedor.calificacionVendedor || 0),
        verified: project.vendedor.vendedorVerificado
      },
      category: project.categoria,
      mainImage: project.imagenes[0] ? {
        id: project.imagenes[0].id,
        fileName: project.imagenes[0].nombreArchivo,
        fileUrl: project.imagenes[0].urlArchivo,
        fileKey: project.imagenes[0].claveArchivo,
        fileSize: project.imagenes[0].tamañoArchivo,
        mimeType: project.imagenes[0].tipoMime,
        isMain: project.imagenes[0].esPrincipal,
        order: project.imagenes[0].orden
      } : null,
      ratingsCount: project._count.calificaciones,
      favoritesCount: project._count.favoritos
    }));

    res.status(200).json({
      success: true,
      message: 'Proyectos recientes obtenidos exitosamente',
      data: formattedProjects,
      total: formattedProjects.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo proyectos recientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * GET /projects/:id
 * Obtiene detalles de un proyecto específico
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = parseInt(req.params.id);

    if (isNaN(projectId)) {
      res.status(400).json({
        success: false,
        message: 'ID de proyecto inválido'
      });
      return;
    }

    console.log('📚 Obteniendo proyecto ID:', projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        vendedor: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            institucion: true,
            calificacionVendedor: true,
            vendedorVerificado: true,
            totalVentas: true
          }
        },
        categoria: true,
        imagenes: {
          orderBy: { orden: 'asc' }
        },
        archivos: {
          orderBy: { orden: 'asc' }
        },
        _count: {
          select: {
            calificaciones: true,
            favoritos: true,
            ventas: true
          }
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

    // Incrementar contador de vistas
    await prisma.project.update({
      where: { id: projectId },
      data: { vistas: { increment: 1 } }
    });

    console.log('✅ Proyecto encontrado:', project.titulo);

    // Formatear respuesta
    const formattedProject = {
      id: project.id,
      title: project.titulo,
      description: project.descripcion,
      price: Number(project.precio),
      type: project.tipo,
      university: project.universidad,
      subject: project.materia,
      year: project.año,
      status: project.estado,
      views: project.vistas + 1, // Incluir la vista actual
      downloads: project.descargas,
      featured: project.destacado,
      tags: project.etiquetas,
      createdAt: project.fechaCreacion,
      updatedAt: project.fechaActualizacion,
      seller: {
        id: project.vendedor.id,
        name: `${project.vendedor.nombre} ${project.vendedor.apellidos || ''}`.trim(),
        university: project.vendedor.institucion,
        rating: Number(project.vendedor.calificacionVendedor || 0),
        verified: project.vendedor.vendedorVerificado,
        totalSales: project.vendedor.totalVentas
      },
      category: project.categoria,
      images: project.imagenes.map(img => ({
        id: img.id,
        fileName: img.nombreArchivo,
        fileUrl: img.urlArchivo,
        fileKey: img.claveArchivo,
        fileSize: img.tamañoArchivo,
        mimeType: img.tipoMime,
        isMain: img.esPrincipal,
        order: img.orden
      })),
      files: project.archivos.map(file => ({
        id: file.id,
        fileName: file.nombreArchivo,
        fileUrl: file.urlArchivo,
        fileKey: file.claveArchivo,
        fileSize: file.tamañoArchivo,
        mimeType: file.tipoMime,
        description: file.descripcion,
        order: file.orden
      })),
      ratingsCount: project._count.calificaciones,
      favoritesCount: project._count.favoritos,
      salesCount: project._count.ventas
    };

    res.status(200).json({
      success: true,
      message: 'Proyecto obtenido exitosamente',
      data: formattedProject
    });

  } catch (error) {
    console.error('❌ Error obteniendo proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * POST /projects/upload
 * Crea un nuevo proyecto
 */
router.post('/upload', async (req: Request, res: Response): Promise<void> => {
  try {
    const { titulo, descripcion, precio, tipo, categoryId, userId } = req.body;

    console.log('📤 Creando nuevo proyecto:');
    console.log('- Título:', titulo);
    console.log('- Descripción:', descripcion);
    console.log('- Precio:', precio);
    console.log('- Tipo:', tipo);
    console.log('- CategoryId:', categoryId, '(tipo:', typeof categoryId, ')');
    console.log('- UserId:', userId);

    // Validar datos requeridos
    if (!titulo || !descripcion || !precio || !tipo || !categoryId || !userId) {
      res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
      return;
    }

    // Convertir categoryId a número si viene como string
    const categoryIdNumber = parseInt(categoryId);
    
    if (isNaN(categoryIdNumber)) {
      res.status(400).json({
        success: false,
        message: 'CategoryId debe ser un número válido'
      });
      return;
    }

    // Verificar que la categoría existe usando raw SQL
    const categoryCheck = await prisma.$queryRaw`
      SELECT id, nombre FROM categorias_proyectos WHERE id = ${categoryIdNumber}
    ` as any[];

    if (!categoryCheck || categoryCheck.length === 0) {
      res.status(400).json({
        success: false,
        message: `La categoría con ID ${categoryIdNumber} no existe`
      });
      return;
    }

    console.log('✅ Categoría encontrada:', categoryCheck[0].nombre);

    // Crear el proyecto usando raw SQL
    const createResult = await prisma.$queryRaw`
      INSERT INTO proyectos (
        titulo, descripcion, precio, tipo, universidad, materia, año, 
        vendedor_id, categoria_id, estado, fecha_creacion, fecha_actualizacion
      ) VALUES (
        ${titulo}, ${descripcion}, ${parseFloat(precio)}, ${tipo}::project_type,
        'Universidad de Prueba', 'Materia de Prueba', ${new Date().getFullYear()},
        ${parseInt(userId)}, ${categoryIdNumber}, 'PUBLICADO', NOW(), NOW()
      ) RETURNING id, titulo, categoria_id
    ` as any[];

    const newProject = createResult[0];

    console.log('🎉 Proyecto creado exitosamente:');
    console.log('- ID:', newProject.id);
    console.log('- Title:', newProject.titulo);
    console.log('- CategoryId guardado:', newProject.categoriaId);
    console.log('- Categoría asociada:', categoryCheck[0].nombre);

    // Crear notificación de proyecto subido exitosamente
    try {
      await NotificationService.createProyectoSubido(
        parseInt(userId),
        newProject.titulo
      );
      console.log(`✅ Notificación de proyecto subido creada para usuario ${userId}`);
    } catch (notificationError) {
      console.error('❌ Error creando notificación de proyecto subido:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Proyecto creado exitosamente',
      data: {
        ...newProject,
        category: {
          id: categoryIdNumber,
          nombre: categoryCheck[0].nombre
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al crear proyecto:', error);
    
    // Crear notificación de error al subir proyecto
    try {
      const { userId, titulo } = req.body;
      if (userId) {
        await NotificationService.createProyectoError(
          parseInt(userId),
          titulo || 'Proyecto sin título',
          'Error interno del servidor al crear el proyecto'
        );
        console.log(`✅ Notificación de error de proyecto creada para usuario ${userId}`);
      }
    } catch (notificationError) {
      console.error('❌ Error creando notificación de error de proyecto:', notificationError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * POST /projects/upload-with-files
 * Crea un nuevo proyecto con archivos e imagen principal
 */
router.post('/upload-with-files', 
  upload.fields([
    { name: 'files', maxCount: 5 },
    { name: 'images', maxCount: 5 }
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { titulo, descripcion, precio, tipo, categoryId, userId, university, subject, year, tags } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      console.log('📤 Creando proyecto con archivos:');
      console.log('- Título:', titulo);
      console.log('- Tipo:', tipo);
      console.log('- Tags recibidos:', tags);
      console.log('- Archivos recibidos:', {
        files: files.files?.length || 0,
        images: files.images?.length || 0
      });

      // Validar datos requeridos
      if (!titulo || !descripcion || !precio || !tipo || !categoryId || !userId || !university || !subject || !year) {
        res.status(400).json({
          success: false,
          message: 'Faltan datos requeridos'
        });
        return;
      }

      // Validar que al menos haya archivos o imágenes
      if ((!files.files || files.files.length === 0) && (!files.images || files.images.length === 0)) {
        res.status(400).json({
          success: false,
          message: 'Debe incluir al menos un archivo o imagen'
        });
        return;
      }

      const categoryIdNumber = parseInt(categoryId);
      
      if (isNaN(categoryIdNumber)) {
        res.status(400).json({
          success: false,
          message: 'CategoryId debe ser un número válido'
        });
        return;
      }

      // Verificar que la categoría existe
      const categoryCheck = await prisma.$queryRaw`
        SELECT id, nombre FROM categorias_proyectos WHERE id = ${categoryIdNumber}
      ` as any[];

      if (!categoryCheck || categoryCheck.length === 0) {
        res.status(400).json({
          success: false,
          message: 'La categoría seleccionada no existe'
        });
        return;
      }

      // Procesar tags
      let parsedTags: string[] = [];
      
      if (tags) {
        try {
          // Si viene como string JSON, parsearlo
          if (typeof tags === 'string') {
            parsedTags = JSON.parse(tags);
          } 
          // Si ya viene como array, usarlo directamente
          else if (Array.isArray(tags)) {
            parsedTags = tags;
          }
          
          console.log('✅ Tags procesados:', parsedTags);
        } catch (error) {
          console.error('❌ Error parseando tags:', error);
          parsedTags = [];
        }
      }

      // Crear el proyecto con tags incluidos
      const newProject = await prisma.project.create({
        data: {
          titulo: titulo,
          descripcion: descripcion,
          precio: parseFloat(precio),
          tipo: tipo as any, // Usar el tipo enviado desde el frontend
          universidad: university,
          materia: subject,
          año: parseInt(year),
          estado: 'PUBLICADO',
          vendedorId: parseInt(userId),
          categoriaId: categoryIdNumber,
          vistas: 0,
          descargas: 0,
          destacado: false,
          etiquetas: parsedTags
        }
      });

      console.log('✅ Proyecto creado con ID:', newProject.id, 'Tags:', newProject.etiquetas);

      // Crear notificación de proyecto subido exitosamente
      try {
        await NotificationService.createProyectoSubido(
          parseInt(userId),
          newProject.titulo
        );
        console.log(`✅ Notificación de proyecto subido creada para usuario ${userId}`);
      } catch (notificationError) {
        console.error('❌ Error creando notificación de proyecto subido:', notificationError);
      }

      // Subir archivos del proyecto
      const uploadedFiles: any[] = [];
      const uploadedImages: any[] = [];
      const uploadErrors: string[] = [];

      // Procesar archivos
      if (files.files) {
        for (let i = 0; i < files.files.length; i++) {
          const file = files.files[i];
          try {
            console.log(`📄 Subiendo archivo: ${file.originalname}`);
            
            // Estructura organizada: projects/[id]/files/
            const uploadResult = await uploadToCloudinary(
              file.buffer,
              `projects/${newProject.id}/files`,
              file.originalname,
              'raw'
            );

            // Guardar archivo en base de datos
            const savedFile = await prisma.projectFile.create({
              data: {
                proyectoId: newProject.id,
                nombreArchivo: file.originalname,
                urlArchivo: uploadResult.secure_url,
                claveArchivo: uploadResult.public_id,
                tamañoArchivo: file.size,
                tipoMime: file.mimetype,
                descripcion: `Archivo del proyecto: ${file.originalname}`,
                orden: i + 1
              }
            });

            uploadedFiles.push({
              id: savedFile.id,
              fileName: savedFile.nombreArchivo,
              fileUrl: savedFile.urlArchivo,
              fileSize: savedFile.tamañoArchivo
            });

          } catch (error) {
            console.error(`❌ Error subiendo archivo ${file.originalname}:`, error);
            uploadErrors.push(`Error subiendo ${file.originalname}: ${error}`);
          }
        }
      }

      // Procesar imágenes
      if (files.images) {
        for (let i = 0; i < files.images.length; i++) {
          const image = files.images[i];
          try {
            console.log(`🖼️ Subiendo imagen: ${image.originalname}`);
            
            // Estructura organizada: projects/[id]/images/
            const uploadResult = await uploadToCloudinary(
              image.buffer,
              `projects/${newProject.id}/images`,
              image.originalname,
              'image'
            );

            // Guardar imagen en base de datos
            const savedImage = await prisma.projectImage.create({
              data: {
                proyectoId: newProject.id,
                nombreArchivo: image.originalname,
                urlArchivo: uploadResult.secure_url,
                claveArchivo: uploadResult.public_id,
                tamañoArchivo: image.size,
                tipoMime: image.mimetype,
                esPrincipal: i === 0, // Primera imagen como principal
                orden: i + 1
              }
            });

            uploadedImages.push({
              id: savedImage.id,
              fileName: savedImage.nombreArchivo,
              fileUrl: savedImage.urlArchivo,
              fileSize: savedImage.tamañoArchivo,
              isMain: savedImage.esPrincipal
            });

          } catch (error) {
            console.error(`❌ Error subiendo imagen ${image.originalname}:`, error);
            uploadErrors.push(`Error subiendo ${image.originalname}: ${error}`);
          }
        }
      }

      res.json({
        success: true,
        message: `Proyecto creado exitosamente con ${uploadedFiles.length} archivo(s) y ${uploadedImages.length} imagen(es)`,
        data: {
          project: newProject,
          uploadedFiles,
          uploadedImages,
          uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined
        }
      });

    } catch (error: any) {
      console.error('❌ Error creando proyecto con archivos:', error);
      
      // Crear notificación de error al subir proyecto
      try {
        const { userId, title } = req.body;
        if (userId) {
          await NotificationService.createProyectoError(
            parseInt(userId),
            title || 'Proyecto sin título',
            'Error al subir proyecto con archivos'
          );
          console.log(`✅ Notificación de error de proyecto creada para usuario ${userId}`);
        }
      } catch (notificationError) {
        console.error('❌ Error creando notificación de error de proyecto:', notificationError);
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
);

export default router;