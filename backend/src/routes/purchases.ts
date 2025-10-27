import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';

const router = express.Router();
const prisma = new PrismaClient();

// Función para validar request de compra
function validatePurchaseRequest(body: any) {
  const { projectId, paymentMethod, amount, currency = 'PEN' } = body;
  
  if (!projectId || typeof projectId !== 'number') {
    throw new Error('ID de proyecto requerido y debe ser un número');
  }
  
  if (!paymentMethod || !['YAPE', 'PLIN', 'BANCARIO'].includes(paymentMethod)) {
    throw new Error('Método de pago inválido');
  }
  
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new Error('Monto inválido');
  }
  
  return { projectId, paymentMethod, amount, currency };
}

// Función para validar request de validación
function validateValidateRequest(body: any) {
  const { saleId, comprobantePago, approved } = body;
  
  if (!saleId || typeof saleId !== 'number') {
    throw new Error('ID de venta requerido');
  }
  
  if (typeof approved !== 'boolean') {
    throw new Error('Estado de aprobación requerido');
  }
  
  return { saleId, comprobantePago, approved };
}

/**
 * POST /api/purchases/cart
 * Procesar compra desde carrito (múltiples proyectos)
 */
router.post('/cart', authMiddleware, async (req, res): Promise<void> => {
  try {
    const { projects, paymentMethod } = req.body;
    const compradorId = req.user.id;

    // Validar datos de entrada
    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Lista de proyectos requerida'
      });
      return;
    }

    if (!paymentMethod || !['YAPE', 'PLIN', 'BANCARIO'].includes(paymentMethod)) {
      res.status(400).json({
        success: false,
        error: 'Método de pago inválido'
      });
      return;
    }

    console.log(`🛒 Procesando compra de carrito para usuario ${compradorId}:`, {
      projectCount: projects.length,
      paymentMethod
    });

    // Usar transacción para garantizar atomicidad
    const result = await prisma.$transaction(async (tx) => {
      const sales = [];
      let totalAmount = 0;

      // Procesar cada proyecto
      for (const projectData of projects) {
        const { projectId, amount } = projectData;

        // Verificar que el proyecto existe y está disponible
        const project = await tx.project.findUnique({
          where: { id: projectId },
          include: { vendedor: true }
        });

        if (!project) {
          throw new Error(`Proyecto ${projectId} no encontrado`);
        }

        if (project.estado !== 'PUBLICADO' && project.estado !== 'DESTACADO') {
          throw new Error(`El proyecto "${project.titulo}" no está disponible para compra`);
        }

        // Verificar que el comprador no sea el vendedor
        if (project.vendedorId === compradorId) {
          throw new Error(`No puedes comprar tu propio proyecto "${project.titulo}"`);
        }

        // Verificar que no haya comprado ya este proyecto
        const existingSale = await tx.sale.findFirst({
          where: {
            proyectoId: projectId,
            compradorId: compradorId,
            estadoPago: 'COMPLETADO'
          }
        });

        if (existingSale) {
          throw new Error(`Ya has comprado el proyecto "${project.titulo}"`);
        }

        // Calcular comisión (10% para la plataforma)
        const comisionPlataforma = Number((amount * 0.10).toFixed(2));
        const gananciaVendedor = Number((amount - comisionPlataforma).toFixed(2));

        // Generar código único de venta
        const codigoVenta = `CART_${Date.now()}_${projectId}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // Crear la venta
        const sale = await tx.sale.create({
          data: {
            codigoVenta,
            proyectoId: projectId,
            vendedorId: project.vendedorId,
            compradorId,
            precioVenta: amount,
            comisionPlataforma,
            gananciaVendedor,
            metodoPago: paymentMethod,
            estadoPago: 'PENDIENTE',
            estadoEntrega: 'PENDIENTE'
          },
          include: {
            proyecto: {
              select: {
                id: true,
                titulo: true,
                precio: true,
                vendedor: {
                  select: {
                    id: true,
                    nombre: true,
                    email: true
                  }
                }
              }
            }
          }
        });

        sales.push(sale);
        totalAmount += amount;

        console.log(`✅ Venta creada: ${codigoVenta} - ${project.titulo} - S/ ${amount}`);
      }

      return { sales, totalAmount };
    });

    // Crear notificaciones para cada vendedor (fuera de la transacción)
    const vendorNotifications = new Map();
    
    for (const sale of result.sales) {
      const vendorId = sale.vendedorId;
      
      if (!vendorNotifications.has(vendorId)) {
        vendorNotifications.set(vendorId, []);
      }
      
      vendorNotifications.get(vendorId).push(sale);
    }

    // Enviar notificaciones agrupadas por vendedor
    for (const [vendorId, vendorSales] of vendorNotifications) {
      try {
        if (vendorSales.length === 1) {
          // Notificación para un solo proyecto
          const sale = vendorSales[0];
          await NotificationService.create({
            usuarioId: vendorId,
            tipo: 'NUEVA_VENTA',
            titulo: '¡Nueva venta realizada!',
            mensaje: `Se ha vendido tu proyecto "${sale.proyecto.titulo}" por S/ ${sale.precioVenta}`,
            datosExtra: {
              proyectoId: sale.proyecto.id,
              compradorId: compradorId,
              ventaId: sale.id,
              monto: sale.precioVenta
            }
          });
        } else {
          // Notificación para múltiples proyectos del mismo vendedor
          const totalVendor = vendorSales.reduce((sum: number, sale: any) => sum + Number(sale.precioVenta), 0);
          const projectTitles = vendorSales.map((sale: any) => sale.proyecto.titulo).join(', ');
          
          await NotificationService.create({
            usuarioId: vendorId,
            tipo: 'NUEVA_VENTA',
            titulo: '¡Múltiples ventas realizadas!',
            mensaje: `Se han vendido ${vendorSales.length} proyectos tuyos por un total de S/ ${totalVendor}: ${projectTitles}`,
            datosExtra: {
              proyectos: vendorSales.map((sale: any) => ({
                proyectoId: sale.proyecto.id,
                titulo: sale.proyecto.titulo,
                monto: sale.precioVenta
              })),
              compradorId: compradorId,
              totalVentas: vendorSales.length,
              montoTotal: totalVendor
            }
          });
        }
        
        console.log(`✅ Notificación de venta creada para vendedor ${vendorId}`);
      } catch (notificationError) {
        console.error(`❌ Error creando notificación para vendedor ${vendorId}:`, notificationError);
      }
    }

    // Simular procesamiento de pago en desarrollo
    if (process.env.NODE_ENV === 'development') {
      setTimeout(async () => {
        try {
          console.log(`🔄 Procesando compras de carrito simuladas: ${result.sales.length} ventas`);
          
          // Completar todas las ventas
          for (const sale of result.sales) {
            await prisma.sale.update({
              where: { id: sale.id },
              data: {
                estadoPago: 'COMPLETADO',
                estadoEntrega: 'ENTREGADO',
                fechaPago: new Date(),
                fechaEntrega: new Date(),
                comprobantePago: `CART_SIMULATION_${Date.now()}`
              }
            });

            // Actualizar estadísticas del vendedor
            await prisma.user.update({
              where: { id: sale.vendedorId },
              data: {
                totalVentas: {
                  increment: 1
                }
              }
            });
          }

          // Notificación de compra exitosa para el comprador
          await NotificationService.createCompraExitosa(
            compradorId,
            `${result.sales.length} proyectos`,
            result.totalAmount,
            result.sales[0].vendedorId // Para compatibilidad
          );

          console.log(`✅ Compra de carrito completada: ${result.sales.length} proyectos por S/ ${result.totalAmount}`);
          
        } catch (error) {
          console.error(`❌ Error completando compra de carrito:`, error);
          
          // Notificación de error
          await NotificationService.createCompraError(
            compradorId,
            `Compra de carrito (${result.sales.length} proyectos)`,
            'Error procesando el pago. Por favor, contacta soporte.'
          );
        }
      }, 2000);
    }

    // Respuesta exitosa
    res.json({
      success: true,
      data: {
        purchaseId: `CART_${Date.now()}`,
        userId: compradorId.toString(),
        totalProjects: result.sales.length,
        totalAmount: result.totalAmount,
        currency: 'PEN',
        status: 'PENDING',
        paymentMethod: paymentMethod,
        sales: result.sales.map(sale => ({
          id: sale.codigoVenta,
          projectId: sale.proyectoId,
          projectTitle: sale.proyecto.titulo,
          amount: sale.precioVenta,
          vendor: sale.proyecto.vendedor
        })),
        createdAt: new Date()
      },
      message: `Compra de ${result.sales.length} proyectos procesada exitosamente`
    });

  } catch (error) {
    console.error('❌ Error procesando compra de carrito:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/purchases
 * Crear una nueva compra (venta)
 */
router.post('/', authMiddleware, async (req, res): Promise<void> => {
  try {
    const { projectId, paymentMethod, amount } = validatePurchaseRequest(req.body);
    const compradorId = req.user.id;

    // Verificar que el proyecto existe y está disponible
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { vendedor: true }
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Proyecto no encontrado'
      });
      return;
    }

    if (project.estado !== 'PUBLICADO' && project.estado !== 'DESTACADO') {
      res.status(400).json({
        success: false,
        error: 'El proyecto no está disponible para compra'
      });
      return;
    }

    // Verificar que el comprador no sea el vendedor
    if (project.vendedorId === compradorId) {
      res.status(400).json({
        success: false,
        error: 'No puedes comprar tu propio proyecto'
      });
      return;
    }

    // Verificar que no haya comprado ya este proyecto
    const existingSale = await prisma.sale.findFirst({
      where: {
        proyectoId: projectId,
        compradorId: compradorId,
        estadoPago: 'COMPLETADO'
      }
    });

    if (existingSale) {
      res.status(400).json({
        success: false,
        error: 'Ya has comprado este proyecto'
      });
      return;
    }

    // Calcular comisión (10% para la plataforma)
    const comisionPlataforma = Number((amount * 0.10).toFixed(2));
    const gananciaVendedor = Number((amount - comisionPlataforma).toFixed(2));

    // Generar código único de venta
    const codigoVenta = `SALE_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Crear la venta
    const sale = await prisma.sale.create({
      data: {
        codigoVenta,
        proyectoId: projectId,
        vendedorId: project.vendedorId,
        compradorId,
        precioVenta: amount,
        comisionPlataforma,
        gananciaVendedor,
        metodoPago: paymentMethod,
        estadoPago: 'PENDIENTE',
        estadoEntrega: 'PENDIENTE'
      },
      include: {
        proyecto: {
          select: {
            id: true,
            titulo: true,
            precio: true,
            vendedor: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            }
          }
        },
        comprador: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    // Crear notificación de nueva venta para el vendedor
    try {
      await NotificationService.create({
        usuarioId: project.vendedorId,
        tipo: 'NUEVA_VENTA',
        titulo: '¡Nueva venta realizada!',
        mensaje: `${sale.comprador.nombre} ha comprado tu proyecto "${sale.proyecto.titulo}" por S/ ${sale.precioVenta}`,
        datosExtra: {
          proyectoId: project.id,
          compradorId: compradorId,
          ventaId: sale.id,
          monto: sale.precioVenta
        }
      });
      console.log(`✅ Notificación de nueva venta creada para vendedor ${project.vendedorId}`);
    } catch (notificationError) {
      console.error('❌ Error creando notificación de nueva venta:', notificationError);
    }

    // En un entorno real, aquí se integraría con un procesador de pagos
    // Por ahora, simularemos una compra exitosa automáticamente
    if (process.env.NODE_ENV === 'development') {
      // Simular compra exitosa para desarrollo
      setTimeout(async () => {
        try {
          console.log(`🔄 Procesando compra simulada: ${codigoVenta}`);
          
          // Verificar que la venta aún existe antes de actualizarla
          const existingSale = await prisma.sale.findUnique({
            where: { id: sale.id }
          });

          if (!existingSale) {
            console.error(`❌ Venta ${codigoVenta} no encontrada para completar`);
            return;
          }

          // Actualizar la venta a completada
          const updatedSale = await prisma.sale.update({
            where: { id: sale.id },
            data: {
              estadoPago: 'COMPLETADO',
              estadoEntrega: 'ENTREGADO',
              fechaPago: new Date(),
              fechaEntrega: new Date(),
              comprobantePago: `SIMULATION_${Date.now()}`
            },
            include: {
              proyecto: { select: { titulo: true } },
              comprador: { select: { id: true } }
            }
          });

          // Crear notificación de compra exitosa para el comprador
          try {
            await NotificationService.createCompraExitosa(
              updatedSale.compradorId,
              updatedSale.proyecto.titulo,
              Number(updatedSale.precioVenta),
              updatedSale.vendedorId
            );
            console.log(`✅ Notificación de compra exitosa creada para comprador ${updatedSale.compradorId}`);
          } catch (notificationError) {
            console.error('❌ Error creando notificación de compra exitosa:', notificationError);
          }

          // Verificar que el vendedor existe antes de actualizar estadísticas
          const vendor = await prisma.user.findUnique({
            where: { id: project.vendedorId }
          });

          if (vendor) {
            await prisma.user.update({
              where: { id: project.vendedorId },
              data: {
                totalVentas: {
                  increment: 1
                }
              }
            });
          } else {
            console.error(`❌ Vendedor ${project.vendedorId} no encontrado para actualizar estadísticas`);
          }

          console.log(`✅ Compra simulada completada: ${codigoVenta}`);
        } catch (error) {
          console.error(`❌ Error completando compra simulada ${codigoVenta}:`, error);
          
          // Crear notificación de error de compra para el comprador
          try {
            await NotificationService.createCompraError(
              compradorId,
              project.titulo,
              'Error procesando el pago. Por favor, contacta soporte.'
            );
            console.log(`✅ Notificación de error de compra creada para comprador ${compradorId}`);
          } catch (notificationError) {
            console.error('❌ Error creando notificación de error de compra:', notificationError);
          }
        }
      }, 2000);
    }

    res.json({
      success: true,
      data: {
        id: sale.codigoVenta,
        userId: compradorId.toString(),
        projectId: sale.proyectoId,
        amount: sale.precioVenta,
        currency: 'PEN',
        status: 'PENDING',
        paymentMethod: sale.metodoPago,
        transactionId: sale.codigoVenta,
        createdAt: sale.fechaVenta,
        completedAt: sale.fechaPago
      },
      message: 'Compra procesada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creando compra:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/purchases/user/:userId
 * Obtener todas las compras de un usuario
 */
router.get('/user/:userId', authMiddleware, async (req, res): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);
    const requestingUserId = req.user.id;

    // Validar que userId es un número válido
    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
      return;
    }

    // Verificar que el usuario esté solicitando sus propias compras o sea admin
    if (userId !== requestingUserId && req.user.tipo !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'No tienes permiso para ver estas compras'
      });
      return;
    }

    console.log(`📊 Obteniendo compras para usuario: ${userId}`);

    const sales = await prisma.sale.findMany({
      where: {
        compradorId: userId,
        estadoPago: 'COMPLETADO'
      },
      include: {
        proyecto: {
          select: {
            id: true,
            titulo: true,
            descripcion: true,
            precio: true,
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
            vendedor: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      },
      orderBy: {
        fechaVenta: 'desc'
      }
    });

    console.log(`✅ Encontradas ${sales.length} compras para usuario ${userId}`);

    const purchases = sales.map(sale => ({
      id: sale.codigoVenta,
      userId: sale.compradorId.toString(),
      projectId: sale.proyectoId,
      amount: sale.precioVenta,
      currency: 'PEN',
      status: 'COMPLETED',
      paymentMethod: sale.metodoPago,
      transactionId: sale.codigoVenta,
      createdAt: sale.fechaVenta,
      completedAt: sale.fechaPago,
      project: {
        id: sale.proyecto.id,
        title: sale.proyecto.titulo,
        description: sale.proyecto.descripcion,
        price: Number(sale.proyecto.precio),
        seller: sale.proyecto.vendedor,
        mainImage: sale.proyecto.imagenes && sale.proyecto.imagenes.length > 0 ? {
          fileName: sale.proyecto.imagenes[0].nombreArchivo,
          fileUrl: sale.proyecto.imagenes[0].urlArchivo
        } : null
      }
    }));

    res.json({
      success: true,
      data: purchases
    });

  } catch (error) {
    console.error('❌ Error obteniendo compras del usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/purchases/check/:projectId
 * Verificar si el usuario actual ha comprado un proyecto específico
 */
router.get('/check/:projectId', authMiddleware, async (req, res): Promise<void> => {
  try {
    const projectId = parseInt(req.params.projectId);
    const userId = req.user.id;

    const sale = await prisma.sale.findFirst({
      where: {
        proyectoId: projectId,
        compradorId: userId,
        estadoPago: 'COMPLETADO'
      }
    });

    res.json({
      success: true,
      data: {
        hasPurchased: !!sale,
        purchaseDate: sale?.fechaPago || null,
        saleCode: sale?.codigoVenta || null
      }
    });

  } catch (error) {
    console.error('❌ Error verificando compra:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/purchases/validate
 * Validar un pago (solo para administradores)
 */
router.post('/validate', authMiddleware, async (req, res): Promise<void> => {
  try {
    // Verificar que el usuario sea admin
    if (req.user.tipo !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para realizar esta acción'
      });
      return;
    }

    const { saleId, comprobantePago, approved } = validateValidateRequest(req.body);

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        proyecto: true,
        vendedor: true,
        comprador: true
      }
    });

    if (!sale) {
      res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
      return;
    }

    if (approved) {
      // Aprobar la compra
      await prisma.sale.update({
        where: { id: saleId },
        data: {
          estadoPago: 'COMPLETADO',
          estadoEntrega: 'ENTREGADO',
          fechaPago: new Date(),
          fechaEntrega: new Date(),
          comprobantePago,
          notasAdmin: 'Pago validado por administrador'
        }
      });

      // Actualizar estadísticas del vendedor
      await prisma.user.update({
        where: { id: sale.vendedorId },
        data: {
          totalVentas: {
            increment: 1
          }
        }
      });

      res.json({
        success: true,
        message: 'Pago aprobado exitosamente'
      });
    } else {
      // Rechazar la compra
      await prisma.sale.update({
        where: { id: saleId },
        data: {
          estadoPago: 'FALLIDO',
          notasAdmin: 'Pago rechazado por administrador'
        }
      });

      res.json({
        success: true,
        message: 'Pago rechazado'
      });
    }

  } catch (error) {
    console.error('❌ Error validando pago:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/purchases/stats
 * Obtener estadísticas de compras del usuario actual
 */
router.get('/stats', authMiddleware, async (req, res): Promise<void> => {
  try {
    const userId = req.user.id;

    const completedPurchases = await prisma.sale.count({
      where: {
        compradorId: userId,
        estadoPago: 'COMPLETADO'
      }
    });

    const totalSpent = await prisma.sale.aggregate({
      where: {
        compradorId: userId,
        estadoPago: 'COMPLETADO'
      },
      _sum: {
        precioVenta: true
      }
    });

    res.json({
      success: true,
      data: {
        totalPurchases: completedPurchases,
        totalSpent: totalSpent._sum.precioVenta || 0
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router;