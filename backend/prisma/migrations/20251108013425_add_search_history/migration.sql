-- CreateTable
CREATE TABLE "historial_busquedas" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "termino" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "historial_busquedas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historial_busquedas_usuario_id_is_active_idx" ON "historial_busquedas"("usuario_id", "is_active");

-- CreateIndex
CREATE INDEX "historial_busquedas_timestamp_idx" ON "historial_busquedas"("timestamp");

-- AddForeignKey
ALTER TABLE "historial_busquedas" ADD CONSTRAINT "historial_busquedas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
