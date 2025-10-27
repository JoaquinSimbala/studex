import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Actualiza automáticamente los proyectos destacados
 * Selecciona los 6 proyectos PUBLICADOS más recientes
 */
export async function updateFeaturedProjects(): Promise<void> {
  try {
    console.log('🔄 Actualizando proyectos destacados automáticamente...');

    // 1. Resetear todos los proyectos a no destacados
    await prisma.project.updateMany({
      data: {
        destacado: false
      }
    });

    // 2. Obtener los 6 proyectos publicados más recientes
    const recentProjects = await prisma.project.findMany({
      where: {
        estado: 'PUBLICADO'
      },
      orderBy: {
        fechaCreacion: 'desc'  // Los más recientes primero
      },
      take: 6
    });

    if (recentProjects.length > 0) {
      // 3. Marcar estos proyectos como destacados
      const projectIds = recentProjects.map(p => p.id);
      
      await prisma.project.updateMany({
        where: {
          id: {
            in: projectIds
          }
        },
        data: {
          destacado: true
        }
      });

      console.log(`✅ ${recentProjects.length} proyectos marcados como destacados (más recientes)`);
      recentProjects.forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.titulo} (${project.fechaCreacion.toLocaleDateString()})`);
      });
    } else {
      console.log('⚠️ No se encontraron proyectos publicados');
    }

  } catch (error) {
    console.error('❌ Error actualizando proyectos destacados:', error);
  }
}

/**
 * Programa la actualización automática cada 30 minutos
 */
export function scheduleFeaturedUpdates(): void {
  // Ejecutar inmediatamente
  updateFeaturedProjects();
  
  // Programar ejecución cada 30 minutos
  setInterval(() => {
    updateFeaturedProjects();
  }, 30 * 60 * 1000); // 30 minutos en milisegundos
  
  console.log('⏰ Programada actualización automática de proyectos destacados cada 30 minutos');
}