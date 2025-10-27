/*
  Warnings:

  - You are about to drop the `project_files` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projects` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'compra_exitosa';
ALTER TYPE "NotificationType" ADD VALUE 'compra_error';
ALTER TYPE "NotificationType" ADD VALUE 'proyecto_subido';
ALTER TYPE "NotificationType" ADD VALUE 'proyecto_error';

-- DropForeignKey
ALTER TABLE "public"."calificaciones" DROP CONSTRAINT "calificaciones_proyecto_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."favoritos" DROP CONSTRAINT "favoritos_proyecto_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."mensajes" DROP CONSTRAINT "mensajes_proyecto_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."project_files" DROP CONSTRAINT "project_files_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."project_images" DROP CONSTRAINT "project_images_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ventas" DROP CONSTRAINT "ventas_proyecto_id_fkey";

-- DropTable
DROP TABLE "public"."project_files";

-- DropTable
DROP TABLE "public"."project_images";

-- DropTable
DROP TABLE "public"."projects";

-- CreateTable
CREATE TABLE "proyectos" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precio" DECIMAL(65,30) NOT NULL,
    "tipo" "ProjectType" NOT NULL,
    "universidad" TEXT NOT NULL,
    "materia" TEXT NOT NULL,
    "año" INTEGER NOT NULL,
    "vendedor_id" INTEGER NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "estado" "ProjectStatus" NOT NULL DEFAULT 'publicado',
    "vistas" INTEGER NOT NULL DEFAULT 0,
    "descargas" INTEGER NOT NULL DEFAULT 0,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "etiquetas" TEXT[],
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imagenes_proyecto" (
    "id" SERIAL NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "url_archivo" TEXT NOT NULL,
    "clave_archivo" TEXT NOT NULL,
    "tamaño_archivo" INTEGER NOT NULL,
    "tipo_mime" TEXT NOT NULL,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos_proyecto" (
    "id" SERIAL NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "url_archivo" TEXT NOT NULL,
    "clave_archivo" TEXT NOT NULL,
    "tamaño_archivo" INTEGER NOT NULL,
    "tipo_mime" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrito" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "fecha_agregado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carrito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carrito_usuario_id_proyecto_id_key" ON "carrito"("usuario_id", "proyecto_id");

-- AddForeignKey
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagenes_proyecto" ADD CONSTRAINT "imagenes_proyecto_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_proyecto" ADD CONSTRAINT "archivos_proyecto_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrito" ADD CONSTRAINT "carrito_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrito" ADD CONSTRAINT "carrito_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
