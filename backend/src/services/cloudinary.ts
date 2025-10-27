import { v2 as cloudinary } from 'cloudinary';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { Readable } from 'stream';

// Función para asegurar que Cloudinary esté configurado
const ensureCloudinaryConfig = () => {
  if (!cloudinary.config().cloud_name) {
    console.log('🔧 Configurando Cloudinary...');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'studex-files',
      api_key: process.env.CLOUDINARY_API_KEY || 'your-api-key',
      api_secret: process.env.CLOUDINARY_API_SECRET || 'your-api-secret'
    });
    
    const config = cloudinary.config();
    console.log('✅ Cloudinary configurado:', {
      cloud_name: config.cloud_name,
      api_key: config.api_key ? `${config.api_key.slice(0, 4)}***` : 'NO DEFINIDA',
      api_secret: config.api_secret ? '***DEFINIDA***' : 'NO DEFINIDA'
    });
  }
};

// Configuración de Multer para memoria
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Tipos de archivo permitidos
  const allowedMimeTypes = [
    // Imágenes
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archivos comprimidos (múltiples variantes MIME)
    'application/zip',
    'application/x-zip',
    'application/x-zip-compressed',
    'application/rar',
    'application/x-rar',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/7z',
    // Código fuente
    'text/plain',
    'application/json',
    'text/javascript',
    'application/javascript',
    'text/html',
    'text/css',
    'text/xml',
    'application/xml',
    // Otros formatos comunes
    'application/octet-stream' // Para archivos binarios genéricos
  ];

  console.log(`🔍 Verificando archivo: ${file.originalname} - MIME: ${file.mimetype}`);

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.error(`❌ Tipo de archivo rechazado: ${file.mimetype} para ${file.originalname}`);
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: imágenes, PDFs, documentos de Word, archivos comprimidos.`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 49 * 1024 * 1024, // 49MB límite
    files: 10 // Máximo 10 archivos por request
  }
});

/**
 * Sube un archivo a Cloudinary
 */
export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string,
  originalName: string,
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'
): Promise<any> => {
  // Asegurar configuración
  ensureCloudinaryConfig();
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder, // Usar exactamente la carpeta que se pasa
        resource_type: resourceType,
        public_id: `${Date.now()}_${originalName.split('.')[0]}`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        // Configuraciones adicionales
        quality: 'auto:good',
        fetch_format: 'auto',
        flags: 'progressive'
      },
      (error, result) => {
        if (error) {
          console.error('❌ Error subiendo a Cloudinary:', error);
          reject(error);
        } else {
          console.log('✅ Archivo subido a Cloudinary:', result?.public_id);
          resolve(result);
        }
      }
    );

    // Crear stream desde buffer
    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
};

/**
 * Extrae el public_id de una URL de Cloudinary
 */
export const extractPublicIdFromUrl = (cloudinaryUrl: string): string | null => {
  try {
    // Buscar el patrón /upload/v{version}/ o /upload/
    const uploadMatch = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (!uploadMatch) {
      console.warn('⚠️ No se pudo extraer public_id de la URL:', cloudinaryUrl);
      return null;
    }
    
    // Obtener la parte después de /upload/v{version}/ o /upload/
    let publicId = uploadMatch[1];
    
    // Remover la extensión del archivo (.jpg, .png, etc.)
    publicId = publicId.replace(/\.[^.]+$/, '');
    
    console.log(`🔍 Public ID extraído: ${publicId} de URL: ${cloudinaryUrl}`);
    return publicId;
  } catch (error) {
    console.error('❌ Error extrayendo public_id:', error);
    return null;
  }
};

/**
 * Elimina un archivo de Cloudinary
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'raw'
): Promise<any> => {
  try {
    // Asegurar configuración
    ensureCloudinaryConfig();
    
    console.log(`🗑️ Iniciando eliminación de Cloudinary - Public ID: ${publicId}, Tipo: ${resourceType}`);
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    console.log(`� Resultado de eliminación:`, result);
    
    if (result.result === 'ok') {
      console.log(`✅ Archivo eliminado exitosamente de Cloudinary: ${publicId}`);
    } else if (result.result === 'not found') {
      console.log(`⚠️ Archivo no encontrado en Cloudinary: ${publicId}`);
    } else {
      console.warn(`⚠️ Resultado inesperado al eliminar ${publicId}:`, result);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error eliminando archivo ${publicId} de Cloudinary:`, error);
    throw error;
  }
};

/**
 * Middleware para manejar errores de Multer
 */
export const handleMulterError = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'El archivo excede el límite de 49MB'
      });
      return;
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        success: false,
        message: 'Demasiados archivos. Máximo 10 archivos por vez'
      });
      return;
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        success: false,
        message: 'Campo de archivo inesperado'
      });
      return;
    }
  }

  if (error.message) {
    res.status(400).json({
      success: false,
      message: error.message
    });
    return;
  }

  next(error);
};

/**
 * Obtiene información de un archivo de Cloudinary
 */
export const getCloudinaryFileInfo = async (publicId: string): Promise<any> => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'auto'
    });
    return result;
  } catch (error) {
    console.error('❌ Error obteniendo info de Cloudinary:', error);
    throw error;
  }
};

/**
 * Genera URL optimizada para diferentes tamaños
 */
export const generateOptimizedUrl = (
  publicId: string,
  width?: number,
  height?: number,
  quality: string = 'auto:good'
): string => {
  const transformations: any = {
    quality,
    fetch_format: 'auto'
  };

  if (width) transformations.width = width;
  if (height) transformations.height = height;

  return cloudinary.url(publicId, transformations);
};

export default cloudinary;