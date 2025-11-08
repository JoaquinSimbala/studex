// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Definir las categorías por defecto - CATEGORÍAS GENERALES
// Iconos SVG usando Heroicons (viewBox="0 0 24 24")
// Nota: En el futuro, el administrador podrá subir sus propios SVG personalizados
const defaultCategories = [
  {
    nombre: 'Tecnología y Software',
    descripcion: 'Desarrollo, programación y soluciones tecnológicas',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>',
    colorHex: '#3B82F6',
    ordenDisplay: 1,
    activa: true
  },
  {
    nombre: 'Negocios y Emprendimiento',
    descripcion: 'Gestión empresarial y desarrollo de negocios',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
    colorHex: '#8B5CF6',
    ordenDisplay: 2,
    activa: true
  },
  {
    nombre: 'Marketing y Ventas',
    descripcion: 'Estrategias de marketing y técnicas de ventas',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>',
    colorHex: '#EF4444',
    ordenDisplay: 3,
    activa: true
  },
  {
    nombre: 'Diseño y Creatividad',
    descripcion: 'Diseño gráfico, UX/UI y proyectos creativos',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>',
    colorHex: '#EC4899',
    ordenDisplay: 4,
    activa: true
  },
  {
    nombre: 'Finanzas y Contabilidad',
    descripcion: 'Gestión financiera y análisis contable',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>',
    colorHex: '#10B981',
    ordenDisplay: 5,
    activa: true
  },
  {
    nombre: 'Salud y Medicina',
    descripcion: 'Ciencias de la salud y medicina',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>',
    colorHex: '#06B6D4',
    ordenDisplay: 6,
    activa: true
  },
  {
    nombre: 'Legal y Jurídico',
    descripcion: 'Derecho y ciencias jurídicas',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/></svg>',
    colorHex: '#84CC16',
    ordenDisplay: 7,
    activa: true
  },
  {
    nombre: 'Educación y Formación',
    descripcion: 'Pedagogía y proyectos educativos',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>',
    colorHex: '#F59E0B',
    ordenDisplay: 8,
    activa: true
  },
  {
    nombre: 'Construcción e Ingeniería',
    descripcion: 'Ingeniería civil, arquitectura y construcción',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>',
    colorHex: '#6366F1',
    ordenDisplay: 9,
    activa: true
  },
  {
    nombre: 'Gastronomía y Cocina',
    descripcion: 'Artes culinarias y gastronomía',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>',
    colorHex: '#F97316',
    ordenDisplay: 10,
    activa: true
  },
  {
    nombre: 'Turismo y Hospitalidad',
    descripcion: 'Gestión turística y hotelera',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    colorHex: '#14B8A6',
    ordenDisplay: 11,
    activa: true
  },
  {
    nombre: 'Arte y Cultura',
    descripcion: 'Artes visuales, música y expresiones culturales',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>',
    colorHex: '#A855F7',
    ordenDisplay: 12,
    activa: true
  },
  {
    nombre: 'Ciencias e Investigación',
    descripcion: 'Investigación científica y análisis',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>',
    colorHex: '#0EA5E9',
    ordenDisplay: 13,
    activa: true
  },
  {
    nombre: 'Comunicación y medios',
    descripcion: 'Periodismo, comunicación y medios digitales',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>',
    colorHex: '#F43F5E',
    ordenDisplay: 14,
    activa: true
  },
  {
    nombre: 'Recursos Humanos',
    descripcion: 'Gestión de talento y desarrollo organizacional',
    icono: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
    colorHex: '#64748B',
    ordenDisplay: 15,
    activa: true
  }
];

async function seedCategories() {
  console.log('🌱 Iniciando seeding de categorías...');

  try {
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos');

    // Contar categorías existentes
    const existingCount = await prisma.category.count();
    console.log(`📊 Categorías existentes: ${existingCount}`);

    if (existingCount > 0) {
      console.log('⚠️  Ya existen categorías en la base de datos');
      
      // Preguntar si desea continuar (en un entorno real, podrías usar inquirer)
      console.log('💡 Opciones:');
      console.log('   1. Ejecutar con --force para recrear todas las categorías');
      console.log('   2. Ejecutar con --update para actualizar categorías existentes');
      console.log('   3. Cancelar la operación');
      
      const forceMode = process.argv.includes('--force');
      const updateMode = process.argv.includes('--update');
      
      if (forceMode) {
        console.log('🔄 Modo forzado: Eliminando categorías existentes...');
        await prisma.category.deleteMany({});
        console.log('🗑️  Categorías eliminadas');
      } else if (updateMode) {
        console.log('🔄 Modo actualización: Actualizando categorías existentes...');
        await updateCategories();
        return;
      } else {
        console.log('❌ Operación cancelada. Use --force o --update para continuar.');
        return;
      }
    }

    // Crear las categorías
    console.log('🚀 Creando categorías...');
    
    for (const category of defaultCategories) {
      try {
        const created = await prisma.category.create({
          data: category
        });
        console.log(`✅ Categoría creada: ${created.nombre} (ID: ${created.id})`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Categoría '${category.nombre}' ya existe, omitiendo...`);
        } else {
          console.error(`❌ Error creando '${category.nombre}':`, error.message);
        }
      }
    }

    // Verificar el resultado
    const finalCount = await prisma.category.count();
    console.log(`\n📈 Resumen:`);
    console.log(`   - Categorías creadas: ${finalCount - existingCount}`);
    console.log(`   - Total de categorías: ${finalCount}`);
    
    // Mostrar las categorías creadas
    const allCategories = await prisma.category.findMany({
      orderBy: { ordenDisplay: 'asc' }
    });
    
    console.log(`\n📋 Categorías en la base de datos:`);
    allCategories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.icono} ${cat.nombre} - ${cat.descripcion}`);
    });

    console.log('\n🎉 Seeding de categorías completado exitosamente!');

  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Desconectado de la base de datos');
  }
}

async function updateCategories() {
  console.log('🔄 Actualizando categorías existentes...');
  
  for (const category of defaultCategories) {
    try {
      const updated = await prisma.category.upsert({
        where: { nombre: category.nombre },
        update: {
          descripcion: category.descripcion,
          icono: category.icono,
          colorHex: category.colorHex,
          ordenDisplay: category.ordenDisplay,
          activa: category.activa
        },
        create: category
      });
      console.log(`✅ Categoría actualizada/creada: ${updated.nombre}`);
    } catch (error: any) {
      console.error(`❌ Error actualizando '${category.nombre}':`, error.message);
    }
  }
}

// Función para agregar una categoría individual
export async function addCategory(data: {
  nombre: string;
  descripcion?: string;
  icono?: string;
  colorHex?: string;
  ordenDisplay?: number;
  activa?: boolean;
}) {
  try {
    const category = await prisma.category.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        icono: data.icono || '📁',
        colorHex: data.colorHex || '#007bff',
        ordenDisplay: data.ordenDisplay || 999,
        activa: data.activa !== undefined ? data.activa : true
      }
    });
    
    console.log(`✅ Categoría '${category.nombre}' creada con ID: ${category.id}`);
    return category;
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new Error(`La categoría '${data.nombre}' ya existe`);
    }
    throw error;
  }
}

// Función para listar todas las categorías
export async function listCategories() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { ordenDisplay: 'asc' }
    });
    
    console.log('\n📋 Categorías disponibles:');
    categories.forEach((cat, index) => {
      const status = cat.activa ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${cat.icono} ${cat.nombre} (${cat.colorHex})`);
      if (cat.descripcion) {
        console.log(`      📝 ${cat.descripcion}`);
      }
    });
    
    return categories;
  } catch (error) {
    console.error('❌ Error listando categorías:', error);
    throw error;
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  seedCategories()
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { seedCategories, prisma };