import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from '../services/cloudinary';

const router = Router();
const prisma = new PrismaClient();

// Configurar multer para archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

/**
 * POST /auth/register
 * Registra un nuevo usuario
 */
router.post('/register', upload.single('profileImage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, university, password } = req.body;
    const profileImageFile = req.file;

    console.log('📝 Datos de registro recibidos:', { firstName, lastName, email, university, hasImage: !!profileImageFile });

    // Validaciones básicas
    if (!firstName || !lastName || !email || !university || !password) {
      res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
      return;
    }

    // Validar email universitario
    if (!email.endsWith('.edu.pe') && !email.includes('@pucp.') && !email.includes('@uni.') && !email.includes('@unmsm.') && !email.includes('@upc.')) {
      res.status(400).json({
        success: false,
        message: 'Debe usar un email universitario válido'
      });
      return;
    }

    // Verificar si el email ya existe en la base de datos
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'El email ya está registrado'
      });
      return;
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Subir imagen de perfil a Cloudinary si se proporciona
    let profileImageUrl: string | null = null;
    if (profileImageFile) {
      try {
        console.log('📸 Subiendo imagen de perfil a Cloudinary...');
        const uploadResult = await uploadToCloudinary(
          profileImageFile.buffer, 
          'users/profiles',
          profileImageFile.originalname || 'profile.jpg',
          'image'
        );
        profileImageUrl = uploadResult.secure_url;
        console.log('✅ Imagen subida exitosamente:', profileImageUrl);
      } catch (error) {
        console.error('❌ Error subiendo imagen:', error);
        res.status(500).json({
          success: false,
          message: 'Error subiendo la imagen de perfil'
        });
        return;
      }
    }

    // Crear nuevo usuario en la base de datos
    const newUser = await prisma.user.create({
      data: {
        email,
        nombre: firstName,
        apellidos: lastName,
        institucion: university,
        profileImage: profileImageUrl,
        passwordHash: hashedPassword,
        tipo: 'USER',
        emailVerificado: false
      }
    });

    console.log('✅ Usuario registrado exitosamente en BD:', newUser.email);

    // Respuesta exitosa (sin incluir la contraseña)
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.nombre,
      lastName: newUser.apellidos,
      university: newUser.institucion,
      profileImage: newUser.profileImage,
      userType: newUser.tipo,
      verified: newUser.emailVerificado,
      createdAt: newUser.fechaRegistro,
      areaEstudio: newUser.areaEstudio,
      descripcion: newUser.descripcion
    };
    
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /auth/login
 * Inicia sesión de usuario
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, rememberMe } = req.body;

    console.log('🔐 Intento de login:', { email, rememberMe });

    // Validaciones básicas
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email y contraseña son obligatorios'
      });
      return;
    }

    // Buscar usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
      return;
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
      return;
    }

    // Actualizar fecha de última sesión
    await prisma.user.update({
      where: { id: user.id },
      data: { fechaUltimaSesion: new Date() }
    });

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email 
      },
      process.env.JWT_SECRET || 'studex-secret-key',
      { 
        expiresIn: rememberMe ? '30d' : '24h' 
      }
    );

    console.log('✅ Login exitoso:', user.email);

    // Respuesta exitosa (sin incluir la contraseña)
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.nombre,
      lastName: user.apellidos,
      university: user.institucion,
      profileImage: user.profileImage,
      userType: user.tipo,
      verified: user.emailVerificado,
      createdAt: user.fechaRegistro,
      areaEstudio: user.areaEstudio,
      descripcion: user.descripcion
    };

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * Middleware de autenticación JWT
 */
const authenticateToken = async (req: Request, res: Response, next: any): Promise<void> => {
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
    
    // Buscar usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    // Agregar usuario a la request
    (req as any).user = user;
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
 * GET /auth/verify
 * Verifica si el token JWT es válido
 */
router.get('/verify', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    // Respuesta exitosa con datos del usuario
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.nombre,
      lastName: user.apellidos,
      university: user.institucion,
      profileImage: user.profileImage,
      userType: user.tipo,
      verified: user.emailVerificado,
      createdAt: user.fechaRegistro,
      areaEstudio: user.areaEstudio,
      descripcion: user.descripcion
    };
    
    res.status(200).json({
      success: true,
      message: 'Token válido',
      user: userResponse
    });
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /auth/me
 * Obtiene información del usuario actual
 */
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.nombre,
      lastName: user.apellidos,
      university: user.institucion,
      profileImage: user.profileImage,
      userType: user.tipo,
      verified: user.emailVerificado,
      createdAt: user.fechaRegistro,
      areaEstudio: user.areaEstudio,
      descripcion: user.descripcion
    };
    
    res.status(200).json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('❌ Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * PUT /auth/profile
 * Actualiza el perfil del usuario
 */
router.put('/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { firstName, lastName, email, university, areaEstudio, descripcion } = req.body;

    console.log('📝 Actualizando perfil usuario:', userId, { firstName, lastName, email, university, areaEstudio, descripcion });

    // Validar que al menos algunos campos estén presentes
    if (!firstName && !lastName && !email && !university && !areaEstudio && !descripcion) {
      res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un campo para actualizar'
      });
      return;
    }

    // Construir objeto de actualización solo con campos definidos
    const updateData: any = {};
    if (firstName !== undefined) updateData.nombre = firstName;
    if (lastName !== undefined) updateData.apellidos = lastName;
    if (email !== undefined) updateData.email = email;
    if (university !== undefined) updateData.institucion = university;
    if (areaEstudio !== undefined) updateData.areaEstudio = areaEstudio;
    if (descripcion !== undefined) updateData.descripcion = descripcion;

    // Actualizar usuario en la base de datos
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    // Respuesta exitosa
    const userResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.nombre,
      lastName: updatedUser.apellidos,
      university: updatedUser.institucion,
      profileImage: updatedUser.profileImage,
      userType: updatedUser.tipo,
      verified: updatedUser.emailVerificado,
      createdAt: updatedUser.fechaRegistro,
      areaEstudio: updatedUser.areaEstudio,
      descripcion: updatedUser.descripcion
    };

    res.status(200).json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    
    // Error de email duplicado
    if ((error as any).code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'El email ya está en uso por otro usuario'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * PUT /auth/password
 * Cambia la contraseña del usuario
 */
router.put('/password', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    console.log('🔐 Cambiando contraseña usuario:', userId);

    // Validaciones
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'La contraseña actual y nueva son requeridas'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
      return;
    }

    // Obtener usuario para verificar contraseña actual
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

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'La contraseña actual es incorrecta'
      });
      return;
    }

    // Hashear nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña en la base de datos
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedNewPassword }
    });

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /auth/profile/image
 * Actualiza la imagen de perfil del usuario
 */
router.post('/profile/image', upload.single('profileImage'), authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const profileImageFile = req.file;

    console.log('📸 Actualizando imagen perfil usuario:', userId);

    if (!profileImageFile) {
      res.status(400).json({
        success: false,
        message: 'No se proporcionó una imagen'
      });
      return;
    }

    // Obtener la imagen anterior del usuario
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileImage: true }
    });

    let oldImagePublicId: string | null = null;
    if (currentUser?.profileImage) {
      console.log('🖼️ URL de imagen anterior encontrada:', currentUser.profileImage);
      oldImagePublicId = extractPublicIdFromUrl(currentUser.profileImage);
      console.log('🔍 Public ID extraído:', oldImagePublicId);
    } else {
      console.log('ℹ️ No hay imagen anterior para eliminar');
    }

    // Subir nueva imagen a Cloudinary
    const uploadResult = await uploadToCloudinary(
      profileImageFile.buffer,
      'users/profiles',
      profileImageFile.originalname || 'profile.jpg'
    );

    const profileImageUrl = uploadResult.secure_url;

    // Actualizar imagen en la base de datos
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profileImage: profileImageUrl }
    });

    // Eliminar imagen anterior de Cloudinary (si existe)
    if (oldImagePublicId) {
      console.log('🗑️ Intentando eliminar imagen anterior con public_id:', oldImagePublicId);
      try {
        await deleteFromCloudinary(oldImagePublicId, 'image');
        console.log('✅ Imagen anterior eliminada exitosamente de Cloudinary');
      } catch (deleteError) {
        console.error('❌ Error al eliminar imagen anterior:', deleteError);
        // No falla la operación si no se puede eliminar la imagen anterior
      }
    } else {
      console.log('ℹ️ No hay public_id válido para eliminar');
    }

    res.status(200).json({
      success: true,
      message: 'Imagen de perfil actualizada exitosamente',
      data: {
        imageUrl: profileImageUrl,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.nombre,
          lastName: updatedUser.apellidos,
          university: updatedUser.institucion,
          profileImage: updatedUser.profileImage,
          userType: updatedUser.tipo,
          verified: updatedUser.emailVerificado,
          createdAt: updatedUser.fechaRegistro,
          areaEstudio: updatedUser.areaEstudio,
          descripcion: updatedUser.descripcion
        }
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;