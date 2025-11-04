-- CreateTable
CREATE TABLE "categorias_preferidas_usuario" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "fecha_agregado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_preferidas_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_preferidas_usuario_usuario_id_categoria_id_key" ON "categorias_preferidas_usuario"("usuario_id", "categoria_id");

-- AddForeignKey
ALTER TABLE "categorias_preferidas_usuario" ADD CONSTRAINT "categorias_preferidas_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_preferidas_usuario" ADD CONSTRAINT "categorias_preferidas_usuario_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
