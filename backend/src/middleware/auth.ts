import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extender Request para incluir user
declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}

/**
 * Middleware de autenticación JWT
 * Verifica que el usuario esté autenticado y agrega la información del usuario a req.user
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'studex-secret-key') as any;
    
    // DEBUG: Ver qué contiene el token decodificado
    console.log('🔍 Token decodificado:', decoded);
    
    // Buscar usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    console.log('👤 Usuario encontrado:', user ? `ID: ${user.id}, Email: ${user.email}` : 'NULL');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    if (!user.activo) {
      res.status(401).json({
        success: false,
        message: 'Cuenta desactivada'
      });
      return;
    }

    if (user.bloqueado) {
      res.status(401).json({
        success: false,
        message: 'Cuenta bloqueada'
      });
      return;
    }

    // Agregar usuario a la request
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    res.status(403).json({
      success: false,
      message: 'Token inválido'
    });
    return;
  }
};

/**
 * Middleware para verificar que el usuario sea vendedor verificado
 */
export const requireVerifiedSeller = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Autenticación requerida'
    });
    return;
  }

  if (!req.user.vendedorVerificado) {
    res.status(403).json({
      success: false,
      message: 'Debes ser un vendedor verificado para realizar esta acción'
    });
    return;
  }

  next();
};

/**
 * Middleware para verificar que el usuario sea administrador
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Autenticación requerida'
    });
    return;
  }

  if (req.user.tipo !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Permisos de administrador requeridos'
    });
    return;
  }

  next();
};

/**
 * Middleware opcional de autenticación
 * Agrega información del usuario si está autenticado, pero no falla si no lo está
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No hay token, continuar sin usuario
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'studex-secret-key') as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (user && user.activo && !user.bloqueado) {
      req.user = user;
    }
  } catch (error) {
    // Token inválido, pero no falla la request
    console.warn('⚠️ Token inválido en autenticación opcional:', error);
  }

  next();
};