-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('user', 'vendedor', 'administrador');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('yape', 'plin', 'bcp', 'interbank');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('investigacion', 'proyecto_final', 'software', 'texto_argumentativo', 'presentacion', 'analisis_caso', 'otro');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('basico', 'intermedio', 'avanzado');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('borrador', 'revision', 'publicado', 'destacado', 'agotado', 'rechazado', 'eliminado', 'pausado');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pendiente', 'completado', 'fallido');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pendiente', 'entregado');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('texto', 'imagen', 'archivo');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('proyecto', 'usuario', 'calificacion', 'mensaje');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('contenido_inapropiado', 'spam', 'plagio', 'precio_abusivo', 'estafa', 'otro');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pendiente', 'en_revision', 'resuelto', 'desestimado');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('nueva_venta', 'nuevo_mensaje', 'calificacion_recibida', 'proyecto_aprobado', 'proyecto_rechazado', 'pago_recibido', 'sistema');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT,
    "tipo" "UserType" NOT NULL DEFAULT 'user',
    "institucion" TEXT,
    "area_estudio" TEXT,
    "descripcion" TEXT,
    "qr_pago" TEXT,
    "metodo_pago_preferido" "PaymentMethod" DEFAULT 'yape',
    "email_verificado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_bloqueo" TIMESTAMP(3),
    "motivo_bloqueo" TEXT,
    "vendedor_verificado" BOOLEAN NOT NULL DEFAULT false,
    "calificacion_vendedor" DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    "total_ventas" INTEGER NOT NULL DEFAULT 0,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_ultima_sesion" TIMESTAMP(3),
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_proyectos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "icono" TEXT,
    "color_hex" TEXT NOT NULL DEFAULT '#007bff',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden_display" INTEGER NOT NULL DEFAULT 0,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_proyectos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "type" "ProjectType" NOT NULL,
    "university" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'publicado',
    "views" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_images" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_files" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" SERIAL NOT NULL,
    "codigo_venta" TEXT NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "vendedor_id" INTEGER NOT NULL,
    "comprador_id" INTEGER NOT NULL,
    "precio_venta" DECIMAL(10,2) NOT NULL,
    "comision_plataforma" DECIMAL(10,2) NOT NULL,
    "ganancia_vendedor" DECIMAL(10,2) NOT NULL,
    "metodo_pago" "PaymentMethod" NOT NULL,
    "comprobante_pago" TEXT,
    "estado_pago" "PaymentStatus" NOT NULL DEFAULT 'pendiente',
    "estado_entrega" "DeliveryStatus" NOT NULL DEFAULT 'pendiente',
    "notas_admin" TEXT,
    "fecha_venta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_pago" TIMESTAMP(3),
    "fecha_entrega" TIMESTAMP(3),

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calificaciones" (
    "id" SERIAL NOT NULL,
    "venta_id" INTEGER NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "vendedor_id" INTEGER NOT NULL,
    "comprador_id" INTEGER NOT NULL,
    "calificacion_proyecto" INTEGER NOT NULL,
    "calificacion_vendedor" INTEGER NOT NULL,
    "comentario_proyecto" TEXT,
    "comentario_vendedor" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "reportada" BOOLEAN NOT NULL DEFAULT false,
    "fecha_calificacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favoritos" (
    "usuario_id" INTEGER NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "fecha_agregado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoritos_pkey" PRIMARY KEY ("usuario_id","proyecto_id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" SERIAL NOT NULL,
    "remitente_id" INTEGER NOT NULL,
    "destinatario_id" INTEGER NOT NULL,
    "proyecto_id" INTEGER,
    "mensaje" TEXT NOT NULL,
    "tipo" "MessageType" NOT NULL DEFAULT 'texto',
    "archivo_url" TEXT,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "fecha_leido" TIMESTAMP(3),
    "fecha_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes" (
    "id" SERIAL NOT NULL,
    "reportante_id" INTEGER NOT NULL,
    "tipo_contenido" "ContentType" NOT NULL,
    "contenido_id" INTEGER NOT NULL,
    "motivo" "ReportReason" NOT NULL,
    "descripcion" TEXT,
    "estado" "ReportStatus" NOT NULL DEFAULT 'pendiente',
    "respuesta_admin" TEXT,
    "admin_id" INTEGER,
    "fecha_reporte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_resolucion" TIMESTAMP(3),

    CONSTRAINT "reportes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tipo" "NotificationType" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fecha_leida" TIMESTAMP(3),
    "datos_extra" JSONB,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "accion" TEXT NOT NULL,
    "tabla_afectada" TEXT,
    "registro_id" INTEGER,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "fecha_accion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_proyectos_nombre_key" ON "categorias_proyectos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_codigo_venta_key" ON "ventas"("codigo_venta");

-- CreateIndex
CREATE UNIQUE INDEX "calificaciones_venta_id_key" ON "calificaciones"("venta_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categorias_proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_remitente_id_fkey" FOREIGN KEY ("remitente_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_reportante_id_fkey" FOREIGN KEY ("reportante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
