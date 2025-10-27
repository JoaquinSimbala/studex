/*
  Warnings:

  - The values [investigacion,proyecto_final,software,texto_argumentativo] on the enum `ProjectType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProjectType_new" AS ENUM ('manual_guia', 'tutorial_curso', 'documentacion', 'plantilla_template', 'sistema_aplicacion', 'codigo_fuente', 'base_datos', 'api_servicio', 'plan_negocio', 'analisis_caso', 'investigacion_estudio', 'analisis_mercado', 'diseño_grafico', 'presentacion', 'video_audio', 'material_visual', 'hoja_calculo', 'formulario_formato', 'otro');
ALTER TABLE "proyectos" ALTER COLUMN "tipo" TYPE "ProjectType_new" USING ("tipo"::text::"ProjectType_new");
ALTER TYPE "ProjectType" RENAME TO "ProjectType_old";
ALTER TYPE "ProjectType_new" RENAME TO "ProjectType";
DROP TYPE "public"."ProjectType_old";
COMMIT;
