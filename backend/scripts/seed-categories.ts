// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Definir las categorías por defecto - ORIENTADAS A CARRERAS UNIVERSITARIAS
const defaultCategories = [
  {
    nombre: 'Ingeniería de Software',
    descripcion: 'Desarrollo de aplicaciones, sistemas y tecnología',
    icono: '💻',
    colorHex: '#3B82F6',
    ordenDisplay: 1,
    activa: true
  },
  {
    nombre: 'Ingeniería Industrial',
    descripcion: 'Optimización de procesos y sistemas productivos',
    icono: '⚙️',
    colorHex: '#F59E0B',
    ordenDisplay: 2,
    activa: true
  },
  {
    nombre: 'Ingeniería Civil',
    descripcion: 'Construcción, infraestructura y obras civiles',
    icono: '🏗️',
    colorHex: '#6366F1',
    ordenDisplay: 3,
    activa: true
  },
  {
    nombre: 'Administración',
    descripcion: 'Gestión empresarial y administración de negocios',
    icono: '💼',
    colorHex: '#64748B',
    ordenDisplay: 4,
    activa: true
  },
  {
    nombre: 'Marketing',
    descripcion: 'Marketing digital, publicidad y estrategias comerciales',
    icono: '📈',
    colorHex: '#EF4444',
    ordenDisplay: 5,
    activa: true
  },
  {
    nombre: 'Contabilidad',
    descripcion: 'Contabilidad, finanzas y análisis económico',
    icono: '💰',
    colorHex: '#F97316',
    ordenDisplay: 6,
    activa: true
  },
  {
    nombre: 'Medicina',
    descripcion: 'Ciencias médicas y de la salud',
    icono: '🏥',
    colorHex: '#06B6D4',
    ordenDisplay: 7,
    activa: true
  },
  {
    nombre: 'Derecho',
    descripcion: 'Ciencias jurídicas y legales',
    icono: '⚖️',
    colorHex: '#84CC16',
    ordenDisplay: 8,
    activa: true
  },
  {
    nombre: 'Psicología',
    descripcion: 'Psicología y ciencias del comportamiento',
    icono: '🧠',
    colorHex: '#EC4899',
    ordenDisplay: 9,
    activa: true
  },
  {
    nombre: 'Arquitectura',
    descripcion: 'Diseño arquitectónico y urbanismo',
    icono: '�️',
    colorHex: '#8B5CF6',
    ordenDisplay: 10,
    activa: true
  },
  {
    nombre: 'Diseño Gráfico',
    descripcion: 'Diseño visual, gráfico y multimedia',
    icono: '🎨',
    colorHex: '#A855F7',
    ordenDisplay: 11,
    activa: true
  },
  {
    nombre: 'Comunicaciones',
    descripcion: 'Periodismo, comunicación social y medios',
    icono: '📡',
    colorHex: '#F43F5E',
    ordenDisplay: 12,
    activa: true
  },
  {
    nombre: 'Educación',
    descripcion: 'Pedagogía y ciencias de la educación',
    icono: '📚',
    colorHex: '#14B8A6',
    ordenDisplay: 13,
    activa: true
  },
  {
    nombre: 'Ciencias',
    descripcion: 'Física, química, biología y matemáticas',
    icono: '🧪',
    colorHex: '#0EA5E9',
    ordenDisplay: 14,
    activa: true
  },
  {
    nombre: 'Turismo y Hotelería',
    descripcion: 'Gestión turística y servicios hoteleros',
    icono: '🏨',
    colorHex: '#10B981',
    ordenDisplay: 15,
    activa: true
  },
  {
    nombre: 'Enfermería',
    descripcion: 'Cuidados de enfermería y salud pública',
    icono: '👩‍⚕️',
    colorHex: '#059669',
    ordenDisplay: 16,
    activa: true
  },
  {
    nombre: 'Ingeniería Sistemas',
    descripcion: 'Análisis de sistemas y tecnologías de información',
    icono: '🖥️',
    colorHex: '#1E40AF',
    ordenDisplay: 17,
    activa: true
  },
  {
    nombre: 'Gastronomía',
    descripcion: 'Artes culinarias y gestión gastronómica',
    icono: '👨‍�',
    colorHex: '#DC2626',
    ordenDisplay: 18,
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