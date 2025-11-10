-- CreateTable
CREATE TABLE "comentarios_proyecto" (
    "id" SERIAL NOT NULL,
    "contenido" TEXT NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comentarios_proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comentarios_proyecto_proyecto_id_idx" ON "comentarios_proyecto"("proyecto_id");

-- CreateIndex
CREATE INDEX "comentarios_proyecto_usuario_id_idx" ON "comentarios_proyecto"("usuario_id");

-- CreateIndex
CREATE INDEX "comentarios_proyecto_fecha_creacion_idx" ON "comentarios_proyecto"("fecha_creacion");

-- AddForeignKey
ALTER TABLE "comentarios_proyecto" ADD CONSTRAINT "comentarios_proyecto_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_proyecto" ADD CONSTRAINT "comentarios_proyecto_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
