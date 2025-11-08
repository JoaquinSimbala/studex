/**
 * Script para insertar proyectos de prueba en la base de datos
 * 
 * @description
 * Inserta 20 proyectos de prueba distribuidos entre:
 * - Vendedores: ID 1, 2, 7
 * - Categorías: ID 66-80
 * - Con imágenes y archivos de Cloudinary
 * 
 * Ejecutar con: npx ts-node scripts/seed-projects.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// URLs de imágenes de ejemplo de Unsplash
const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
  'https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?w=800',
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=800',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800',
  'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800',
  'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
  'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=800',
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800',
];

// URL del archivo de ejemplo
const SAMPLE_FILE_URL = 'https://res.cloudinary.com/dqvijtbws/raw/upload/v1762563911/projects/6/files/1762563911484_S25%20-%20Hooks';

// Vendedores disponibles (solo IDs 1, 2, 7)
const SELLER_IDS = [1, 2, 7];

// Categorías disponibles (IDs 66-80)
const CATEGORY_IDS = Array.from({ length: 15 }, (_, i) => 66 + i); // [66, 67, 68, ..., 80]

// Tipos de proyectos
const PROJECT_TYPES = [
  'MANUAL_GUIA',
  'TUTORIAL_CURSO',
  'DOCUMENTACION',
  'SISTEMA_APLICACION',
  'CODIGO_FUENTE',
  'PLAN_NEGOCIO',
  'ANALISIS_CASO',
  'INVESTIGACION_ESTUDIO',
  'DISEÑO_GRAFICO',
  'PRESENTACION',
];

// Universidades peruanas
const UNIVERSITIES = [
  'Universidad Nacional Mayor de San Marcos',
  'Pontificia Universidad Católica del Perú',
  'Universidad Nacional de Ingeniería',
  'Universidad de Lima',
  'Universidad Peruana de Ciencias Aplicadas',
  'Universidad Nacional Agraria La Molina',
  'Universidad San Martín de Porres',
  'Universidad Ricardo Palma',
];

// Datos de proyectos de ejemplo
const PROJECT_DATA = [
  {
    titulo: 'Sistema de Gestión Académica Web',
    descripcion: 'Sistema completo para gestión de notas, asistencias y matrículas desarrollado en React y Node.js. Incluye panel administrativo, módulo de estudiantes y reportes automáticos.',
    materia: 'Desarrollo Web Avanzado',
  },
  {
    titulo: 'Análisis de Mercado Digital - E-commerce',
    descripcion: 'Estudio completo del mercado de comercio electrónico en Perú. Incluye análisis de competidores, encuestas a 500+ usuarios y proyecciones de crecimiento.',
    materia: 'Marketing Digital',
  },
  {
    titulo: 'Aplicación Móvil de Delivery Flutter',
    descripcion: 'App completa de delivery con geolocalización, pagos integrados y sistema de tracking en tiempo real. Código fuente completo con documentación.',
    materia: 'Desarrollo Móvil',
  },
  {
    titulo: 'Tesis: Inteligencia Artificial en Agricultura',
    descripcion: 'Investigación sobre el uso de IA para optimizar cultivos. Incluye dataset de 10,000 imágenes, modelo ML entrenado y resultados experimentales.',
    materia: 'Inteligencia Artificial',
  },
  {
    titulo: 'Plan de Negocios - Startup Fintech',
    descripcion: 'Plan completo para startup de tecnología financiera. Incluye análisis FODA, proyecciones financieras 5 años, estrategia de marketing y pitch deck.',
    materia: 'Emprendimiento y Negocios',
  },
  {
    titulo: 'Sistema de Gestión Hospitalaria',
    descripcion: 'Software completo para gestión de historias clínicas, citas médicas y farmacia. Desarrollado en Java Spring Boot con base de datos MySQL.',
    materia: 'Ingeniería de Software',
  },
  {
    titulo: 'Diseño de Identidad Corporativa Completa',
    descripcion: 'Branding completo para empresa tecnológica: logo, manual de marca, papelería, redes sociales. Archivos editables en Adobe Illustrator.',
    materia: 'Diseño Gráfico',
  },
  {
    titulo: 'Investigación: Blockchain en Supply Chain',
    descripcion: 'Estudio sobre implementación de blockchain en cadenas de suministro. Incluye prototipo funcional, casos de uso y análisis de viabilidad.',
    materia: 'Tecnologías Emergentes',
  },
  {
    titulo: 'Aplicación Web de Gestión de Proyectos',
    descripcion: 'Herramienta tipo Trello desarrollada con Vue.js y Firebase. Incluye tableros Kanban, asignación de tareas y notificaciones en tiempo real.',
    materia: 'Programación Web',
  },
  {
    titulo: 'Análisis Financiero - Caso Bancario',
    descripcion: 'Análisis profundo de estados financieros del sector bancario peruano. Incluye ratios financieros, proyecciones y recomendaciones de inversión.',
    materia: 'Finanzas Corporativas',
  },
  {
    titulo: 'Sistema IoT para Smart Home',
    descripcion: 'Proyecto de automatización del hogar con Arduino y Raspberry Pi. Incluye control de luces, temperatura y seguridad desde smartphone.',
    materia: 'Internet de las Cosas',
  },
  {
    titulo: 'Campaña de Marketing Digital 360°',
    descripcion: 'Estrategia completa de marketing digital para marca de moda. Incluye plan de contenidos, ads en redes sociales y análisis de ROI.',
    materia: 'Publicidad Digital',
  },
  {
    titulo: 'Base de Datos Optimizada - PostgreSQL',
    descripcion: 'Diseño e implementación de base de datos empresarial con más de 50 tablas. Incluye procedimientos almacenados, triggers y optimización de consultas.',
    materia: 'Bases de Datos Avanzadas',
  },
  {
    titulo: 'Presentación Corporativa Premium',
    descripcion: 'Template profesional de presentación con 50+ slides editables. Incluye infografías, gráficos animados y diseño moderno.',
    materia: 'Comunicación Empresarial',
  },
  {
    titulo: 'API REST con Microservicios',
    descripcion: 'Arquitectura de microservicios completa con Node.js, Docker y Kubernetes. Incluye documentación Swagger y tests automatizados.',
    materia: 'Arquitectura de Software',
  },
  {
    titulo: 'Estudio de Factibilidad - Energía Solar',
    descripcion: 'Análisis técnico-económico para implementación de paneles solares en campus universitario. Incluye cálculos, ROI y diseño de instalación.',
    materia: 'Energías Renovables',
  },
  {
    titulo: 'Machine Learning - Predicción de Ventas',
    descripcion: 'Modelo de ML para predecir ventas usando Python y scikit-learn. Incluye dataset, notebook de Jupyter y modelo entrenado con 92% de precisión.',
    materia: 'Ciencia de Datos',
  },
  {
    titulo: 'Tutorial Completo de React y TypeScript',
    descripcion: 'Curso paso a paso de React con TypeScript. 12 proyectos prácticos, desde básico hasta avanzado. Incluye código fuente y videos explicativos.',
    materia: 'Desarrollo Frontend',
  },
  {
    titulo: 'Investigación de Mercado - Delivery Apps',
    descripcion: 'Estudio cualitativo y cuantitativo sobre apps de delivery en Lima. 1000+ encuestas, focus groups y análisis de comportamiento del consumidor.',
    materia: 'Investigación de Mercados',
  },
  {
    titulo: 'Sistema de Gestión de Inventarios',
    descripcion: 'Software completo para control de stock, ventas y compras. Desarrollado en C# .NET con SQL Server. Incluye reportes y código de barras.',
    materia: 'Sistemas de Información',
  },
];

async function main() {
  console.log('🌱 Iniciando seed de proyectos...\n');

  // Verificar que existen los vendedores
  for (const sellerId of SELLER_IDS) {
    const seller = await prisma.user.findUnique({ where: { id: sellerId } });
    if (!seller) {
      console.error(`❌ Error: No existe vendedor con ID ${sellerId}`);
      process.exit(1);
    }
  }

  // Verificar que existen las categorías
  const categories = await prisma.category.findMany({
    where: {
      id: {
        in: CATEGORY_IDS
      }
    }
  });

  if (categories.length === 0) {
    console.error('❌ Error: No se encontraron categorías en el rango 66-80');
    process.exit(1);
  }

  console.log(`✅ Vendedores verificados: ${SELLER_IDS.join(', ')}`);
  console.log(`✅ Categorías encontradas: ${categories.length}\n`);

  let projectsCreated = 0;

  // Crear 20 proyectos
  for (let i = 0; i < 20; i++) {
    const projectInfo = PROJECT_DATA[i];
    const sellerId = SELLER_IDS[i % SELLER_IDS.length];
    const categoryId = CATEGORY_IDS[i % CATEGORY_IDS.length];
    const projectType = PROJECT_TYPES[i % PROJECT_TYPES.length];
    const university = UNIVERSITIES[i % UNIVERSITIES.length];
    const imageUrl = SAMPLE_IMAGES[i % SAMPLE_IMAGES.length];
    
    // Precio aleatorio entre 15 y 150 soles
    const price = Math.floor(Math.random() * 135) + 15;
    
    // Año aleatorio entre 2020 y 2025
    const year = 2020 + Math.floor(Math.random() * 6);

    // 50% de probabilidad de ser destacado
    const destacado = Math.random() > 0.5;

    try {
      // Crear el proyecto
      const project = await prisma.project.create({
        data: {
          titulo: projectInfo.titulo,
          descripcion: projectInfo.descripcion,
          precio: price,
          tipo: projectType as any,
          universidad: university,
          materia: projectInfo.materia,
          año: year,
          vendedorId: sellerId,
          categoriaId: categoryId,
          estado: 'PUBLICADO',
          destacado: destacado,
          etiquetas: ['prueba', 'demo', 'seed'],
          vistas: Math.floor(Math.random() * 500),
          descargas: Math.floor(Math.random() * 100),
        }
      });

      // Crear imagen principal
      await prisma.projectImage.create({
        data: {
          proyectoId: project.id,
          nombreArchivo: `proyecto-${project.id}-imagen.jpg`,
          urlArchivo: imageUrl,
          claveArchivo: `seed/proyecto-${project.id}`,
          tamañoArchivo: 150000,
          tipoMime: 'image/jpeg',
          esPrincipal: true,
          orden: 0,
        }
      });

      // Crear archivo del proyecto
      await prisma.projectFile.create({
        data: {
          proyectoId: project.id,
          nombreArchivo: 'S25 - Hooks.pdf',
          urlArchivo: SAMPLE_FILE_URL,
          claveArchivo: `seed/proyecto-${project.id}-file`,
          tamañoArchivo: 500000,
          tipoMime: 'application/pdf',
          descripcion: 'Archivo de ejemplo del proyecto',
          orden: 0,
        }
      });

      projectsCreated++;
      console.log(`✅ Proyecto ${projectsCreated}/20 creado: "${project.titulo}" (ID: ${project.id}, Vendedor: ${sellerId}, ${destacado ? '⭐ DESTACADO' : ''})`);

    } catch (error) {
      console.error(`❌ Error creando proyecto ${i + 1}:`, error);
    }
  }

  console.log(`\n🎉 Seed completado exitosamente!`);
  console.log(`📊 Total de proyectos creados: ${projectsCreated}/20`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
