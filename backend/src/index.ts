import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import passport from './config/passport';

// Importar rutas
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import sellerRoutes from './routes/seller';
import notificationRoutes from './routes/notifications';
import categoryRoutes from './routes/categories';
import purchaseRoutes from './routes/purchases';
import favoritesRoutes from './routes/favorites';
import cartRoutes from './routes/cart';
import searchHistoryRoutes from './routes/search-history';
import commentsRoutes from './routes/comments';

// Importar servicios
import { scheduleFeaturedUpdates } from './services/featuredUpdater';

// Cargar variables de entorno
dotenv.config();

// Inicializar Prisma Client
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests en dev, 100 en producción
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
  standardHeaders: true, // Incluir headers de rate limit en la respuesta
  legacyHeaders: false, // Deshabilitar headers legacy
  skip: (req) => {
    // Permitir solicitudes de health check sin límite
    return req.path === '/health' || req.path === '/';
  }
});

// Middlewares globales
app.use(helmet()); // Seguridad HTTP headers
app.use(morgan('combined')); // Logging
app.use(limiter); // Rate limiting
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:4200', 
    'http://localhost:4201', 
    'http://localhost:3000',
    'file://' // Para archivos locales HTML
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Inicializar Passport
app.use(passport.initialize());

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: '🚀 STUDEX API está funcionando correctamente!',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

// Configurar rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/search-history', searchHistoryRoutes);
app.use('/api/comments', commentsRoutes);

// Middleware de manejo de errores
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error capturado:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Errores específicos de Prisma/Base de datos
  if (err.code === 'P2002') {
    return res.status(409).json({
      message: 'Conflicto: registro duplicado',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      message: 'Registro no encontrado',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }

  // Errores de conexión de base de datos
  if (err.message && err.message.includes('connect')) {
    return res.status(503).json({
      message: 'Error de conexión con la base de datos',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }

  // Error genérico
  return res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor STUDEX corriendo en puerto ${PORT}`);
  console.log(`📱 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`⚡ Health check: http://localhost:${PORT}/health`);
  
  // NOTA: Script automático desactivado - usar status='DESTACADO' en base de datos
  // scheduleFeaturedUpdates();
});

// Conectar a la base de datos
prisma.$connect()
  .then(() => {
    console.log(`💾 Base de datos PostgreSQL conectada`);
  })
  .catch((error) => {
    console.error('❌ Error conectando a la base de datos:', error);
  });

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  console.log('🔄 Recibida señal SIGTERM, cerrando servidor...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🔄 Recibida señal SIGINT, cerrando servidor...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  console.error('⚠️  El servidor continuará funcionando, pero revisa este error');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rechazada no manejada:', reason);
  console.error('⚠️  En:', promise);
  console.error('⚠️  El servidor continuará funcionando, pero revisa este error');
});

export default app;