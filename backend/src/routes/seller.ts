import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { upload, uploadToCloudinary, handleMulterError } from '../services/cloudinary';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /seller/my-projects/:userId
 * Obtiene todos los proyectos del vendedor
 */
router.get('/my-projects/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (!userId || isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
      return;
    }

    console.log('📚 Obteniendo proyectos del vendedor:', userId);

    // Verificar que el usuario existe y es vendedor
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    if (user.tipo !== 'VENDEDOR') {
      res.status(403).json({
        success: false,
        message: 'El usuario no es vendedor'
      });
      return;
    }

    // Obtener proyectos con estadísticas
    const projects = await prisma.project.findMany({
      where: {
        vendedorId: userId
      },
      include: {
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
            urlArchivo: true,
            nombreArchivo: true
          }
        },
        _count: {
          select: {
            imagenes: true,
            archivos: true,
            calificaciones: true
          }
        }
      },
      orderBy: {
        fechaActualizacion: 'desc'
      }
    });

    // Formatear respuesta
    const formattedProjects = projects.map(project => ({
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
      createdAt: project.fechaCreacion,
      updatedAt: project.fechaActualizacion,
      category: project.categoria,
      mainImage: project.imagenes[0] ? {
        fileName: project.imagenes[0].nombreArchivo,
        fileUrl: project.imagenes[0].urlArchivo
      } : null,
      stats: {
        totalImages: project._count.imagenes,
        totalFiles: project._count.archivos,
        totalRatings: project._count.calificaciones
      }
    }));

    // Estadísticas generales
    const stats = {
      total: projects.length,
      published: projects.filter(p => p.estado === 'PUBLICADO' || p.estado === 'DESTACADO').length,
      totalViews: projects.reduce((sum, p) => sum + p.vistas, 0),
      totalDownloads: projects.reduce((sum, p) => sum + p.descargas, 0)
    };

    console.log('✅ Proyectos encontrados:', projects.length);

    res.json({
      success: true,
      data: {
        projects: formattedProjects,
        stats: stats
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo proyectos del vendedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * POST /seller/become-seller
 * Convierte un usuario regular en vendedor
 */
router.post('/become-seller', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, motivacion, experiencia } = req.body;

    console.log('👤 Solicitud de conversión a vendedor:', { userId, motivacion });

    // Validaciones básicas
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'ID de usuario es obligatorio'
      });
      return;
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    // Verificar si ya es vendedor
    if (user.tipo === 'VENDEDOR') {
      res.status(400).json({
        success: false,
        message: 'El usuario ya es vendedor'
      });
      return;
    }

    // Actualizar usuario a vendedor
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        tipo: 'VENDEDOR',
        descripcion: motivacion || 'Vendedor en STUDEX',
        // Campos adicionales para vendedor
        vendedorVerificado: false, // Pendiente de verificación
        calificacionVendedor: 0.0,
        totalVentas: 0
      }
    });

    console.log('✅ Usuario convertido a vendedor:', updatedUser.email);

    // Respuesta exitosa
    res.status(200).json({
      success: true,
      message: 'Usuario convertido a vendedor exitosamente',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        nombre: updatedUser.nombre,
        apellidos: updatedUser.apellidos,
        tipo: updatedUser.tipo,
        vendedorVerificado: updatedUser.vendedorVerificado,
        calificacionVendedor: updatedUser.calificacionVendedor,
        totalVentas: updatedUser.totalVentas
      }
    });

  } catch (error) {
    console.error('❌ Error convirtiendo a vendedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /seller/status/:userId
 * Obtiene el estado de vendedor de un usuario
 */
router.get('/status/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tipo: true,
        vendedorVerificado: true,
        calificacionVendedor: true,
        totalVentas: true,
        descripcion: true,
        proyectos: {
          select: {
            id: true,
            titulo: true,
            estado: true,
            vistas: true,
            fechaCreacion: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    const isVendedor = user.tipo === 'VENDEDOR';

    res.status(200).json({
      success: true,
      data: {
        userId: user.id,
        isVendedor,
        vendedorVerificado: user.vendedorVerificado,
        calificacionVendedor: Number(user.calificacionVendedor),
        totalVentas: user.totalVentas,
        descripcion: user.descripcion,
        totalProyectos: user.proyectos.length,
        proyectosActivos: user.proyectos.filter(p => p.estado === 'PUBLICADO' || p.estado === 'DESTACADO').length
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estado de vendedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /seller/upload-project
 * Sube un nuevo proyecto (sin archivos, solo metadatos)
 */
router.post('/upload-project', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      sellerId,
      title,
      description,
      price,
      type,
      university,
      subject,
      year,
      categoryId,
      tags
    } = req.body;

    console.log('📚 Subida de proyecto:', { title, sellerId });

    // Validaciones básicas
    if (!sellerId || !title || !description || !price || !type || !categoryId) {
      res.status(400).json({
        success: false,
        message: 'Todos los campos obligatorios deben ser completados'
      });
      return;
    }

    // Verificar que el usuario es vendedor
    const seller = await prisma.user.findUnique({
      where: { id: parseInt(sellerId) }
    });

    if (!seller || seller.tipo !== 'VENDEDOR') {
      res.status(403).json({
        success: false,
        message: 'Solo los vendedores pueden subir proyectos'
      });
      return;
    }

    // Crear el proyecto
    const newProject = await prisma.project.create({
      data: {
        titulo: title,
        descripcion: description,
        precio: parseFloat(price),
        tipo: type,
        universidad: university || seller.institucion || 'Universidad no especificada',
        materia: subject || 'Materia no especificada',
        año: parseInt(year) || new Date().getFullYear(),
        vendedorId: parseInt(sellerId),
        categoriaId: parseInt(categoryId),
        estado: 'BORRADOR', // Inicialmente en borrador
        etiquetas: Array.isArray(tags) ? tags : (typeof tags === 'string' && tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []),
        vistas: 0,
        descargas: 0,
        destacado: false
      },
      include: {
        vendedor: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true
          }
        },
        categoria: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    console.log('✅ Proyecto creado:', newProject.titulo);

    res.status(201).json({
      success: true,
      message: 'Proyecto creado exitosamente',
      data: {
        id: newProject.id,
        title: newProject.titulo,
        description: newProject.descripcion,
        price: Number(newProject.precio),
        status: newProject.estado,
        seller: newProject.vendedor,
        category: newProject.categoria
      }
    });

  } catch (error) {
    console.error('❌ Error creando proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /seller/projects/:sellerId
 * Obtiene los proyectos de un vendedor
 */
router.get('/projects/:sellerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = parseInt(req.params.sellerId);

    if (isNaN(sellerId)) {
      res.status(400).json({
        success: false,
        message: 'ID de vendedor inválido'
      });
      return;
    }

    const projects = await prisma.project.findMany({
      where: { vendedorId: sellerId },
      include: {
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
            urlArchivo: true,
            nombreArchivo: true
          }
        },
        _count: {
          select: {
            calificaciones: true,
            favoritos: true,
            ventas: true
          }
        }
      },
      orderBy: {
        fechaCreacion: 'desc'
      }
    });

    const formattedProjects = projects.map(project => ({
      id: project.id,
      title: project.titulo,
      description: project.descripcion,
      price: Number(project.precio),
      type: project.tipo,
      status: project.estado,
      views: project.vistas,
      downloads: project.descargas,
      featured: project.destacado,
      createdAt: project.fechaCreacion,
      updatedAt: project.fechaActualizacion,
      category: project.categoria,
      mainImage: project.imagenes[0] ? {
        fileName: project.imagenes[0].nombreArchivo,
        fileUrl: project.imagenes[0].urlArchivo
      } : null,
      ratingsCount: project._count.calificaciones,
      favoritesCount: project._count.favoritos,
      salesCount: project._count.ventas
    }));

    res.status(200).json({
      success: true,
      message: 'Proyectos obtenidos exitosamente',
      data: formattedProjects,
      total: formattedProjects.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo proyectos del vendedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /seller/upload-files/:projectId
 * Sube archivos (imágenes y documentos) para un proyecto
 */
router.post('/upload-files/:projectId', 
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'files', maxCount: 5 }
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const projectId = parseInt(req.params.projectId);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      console.log('📁 Subiendo archivos para proyecto:', projectId);
      console.log('📁 Archivos recibidos:', {
        images: files.images?.length || 0,
        files: files.files?.length || 0,
        totalFiles: (files.images?.length || 0) + (files.files?.length || 0)
      });

      // Log detallado de archivos
      if (files.images) {
        files.images.forEach((img, i) => {
          console.log(`📸 Imagen ${i + 1}: ${img.originalname} (${img.mimetype}, ${img.size} bytes)`);
        });
      }
      if (files.files) {
        files.files.forEach((file, i) => {
          console.log(`📄 Archivo ${i + 1}: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
        });
      }

      if (isNaN(projectId)) {
        res.status(400).json({
          success: false,
          message: 'ID de proyecto inválido'
        });
        return;
      }

      // Verificar que el proyecto existe
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { vendedor: true }
      });

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
        return;
      }

      const uploadedFiles: any[] = [];
      const uploadErrors: string[] = [];

      // Subir imágenes
      if (files.images) {
        for (const [index, image] of files.images.entries()) {
          try {
            console.log(`📸 Subiendo imagen ${index + 1}/${files.images.length}:`, image.originalname);
            
            const cloudinaryResult = await uploadToCloudinary(
              image.buffer,
              image.originalname,
              `projects/${projectId}/images`,
              'image'
            );

            // Guardar en base de datos
            const savedImage = await prisma.projectImage.create({
              data: {
                proyectoId: projectId,
                nombreArchivo: image.originalname,
                urlArchivo: cloudinaryResult.secure_url,
                claveArchivo: cloudinaryResult.public_id,
                tamañoArchivo: image.size,
                tipoMime: image.mimetype,
                esPrincipal: index === 0, // Primera imagen como principal
                orden: index + 1
              }
            });

            uploadedFiles.push({
              type: 'image',
              id: savedImage.id,
              filename: savedImage.nombreArchivo,
              url: savedImage.urlArchivo,
              size: savedImage.tamañoArchivo,
              isMain: savedImage.esPrincipal
            });

          } catch (error) {
            console.error(`❌ Error subiendo imagen ${image.originalname}:`, error);
            uploadErrors.push(`Error subiendo ${image.originalname}: ${error}`);
          }
        }
      }

      // Subir archivos/documentos
      if (files.files) {
        for (const [index, file] of files.files.entries()) {
          try {
            console.log(`📄 Subiendo archivo ${index + 1}/${files.files.length}:`, file.originalname);
            
            const cloudinaryResult = await uploadToCloudinary(
              file.buffer,
              file.originalname,
              `projects/${projectId}/files`,
              'raw'
            );

            // Guardar en base de datos
            const savedFile = await prisma.projectFile.create({
              data: {
                proyectoId: projectId,
                nombreArchivo: file.originalname,
                urlArchivo: cloudinaryResult.secure_url,
                claveArchivo: cloudinaryResult.public_id,
                tamañoArchivo: file.size,
                tipoMime: file.mimetype,
                descripcion: `Archivo del proyecto: ${file.originalname}`,
                orden: index + 1
              }
            });

            uploadedFiles.push({
              type: 'file',
              id: savedFile.id,
              filename: savedFile.nombreArchivo,
              url: savedFile.urlArchivo,
              size: savedFile.tamañoArchivo,
              description: savedFile.descripcion
            });

          } catch (error) {
            console.error(`❌ Error subiendo archivo ${file.originalname}:`, error);
            uploadErrors.push(`Error subiendo ${file.originalname}: ${error}`);
          }
        }
      }

      // Si se subió al menos un archivo correctamente
      if (uploadedFiles.length > 0) {
        // Actualizar estado del proyecto si estaba en borrador
        if (project.estado === 'BORRADOR') {
          await prisma.project.update({
            where: { id: projectId },
            data: { estado: 'REVISION' }
          });
        }

        res.status(200).json({
          success: true,
          message: `${uploadedFiles.length} archivo(s) subido(s) exitosamente`,
          data: {
            uploadedFiles,
            errors: uploadErrors,
            projectStatus: project.estado === 'BORRADOR' ? 'REVISION' : project.estado
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'No se pudo subir ningún archivo',
          errors: uploadErrors
        });
      }

    } catch (error) {
      console.error('❌ Error en subida de archivos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// Middleware para manejar errores de Multer
router.use(handleMulterError);

export default router;