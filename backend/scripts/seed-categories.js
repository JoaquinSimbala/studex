require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Definir las categorías por defecto - ÁREAS DE CONOCIMIENTO GENERAL
const defaultCategories = [
  {
    nombre: 'Tecnología y Software',
    descripcion: 'Sistemas, aplicaciones, código y soluciones tecnológicas',
    icono: '💻',
    colorHex: '#3B82F6',
    ordenDisplay: 1,
    activa: true
  },
  {
    nombre: 'Negocios y Emprendimiento',
    descripcion: 'Planes de negocio, estrategias y gestión empresarial',
    icono: '💼',
    colorHex: '#64748B',
    ordenDisplay: 2,
    activa: true
  },
  {
    nombre: 'Marketing y Ventas',
    descripcion: 'Estrategias de marketing, publicidad y técnicas de venta',
    icono: '📈',
    colorHex: '#EF4444',
    ordenDisplay: 3,
    activa: true
  },
  {
    nombre: 'Diseño y Creatividad',
    descripcion: 'Diseño gráfico, visual, multimedia y proyectos creativos',
    icono: '🎨',
    colorHex: '#A855F7',
    ordenDisplay: 4,
    activa: true
  },
  {
    nombre: 'Finanzas y Contabilidad',
    descripcion: 'Análisis financiero, contabilidad y gestión económica',
    icono: '💰',
    colorHex: '#F97316',
    ordenDisplay: 5,
    activa: true
  },
  {
    nombre: 'Salud y Medicina',
    descripcion: 'Información médica, salud y bienestar',
    icono: '🏥',
    colorHex: '#06B6D4',
    ordenDisplay: 6,
    activa: true
  },
  {
    nombre: 'Legal y Jurídico',
    descripcion: 'Documentos legales, contratos y asesoría jurídica',
    icono: '⚖️',
    colorHex: '#84CC16',
    ordenDisplay: 7,
    activa: true
  },
  {
    nombre: 'Educación y Formación',
    descripcion: 'Cursos, tutoriales y material educativo',
    icono: '📚',
    colorHex: '#14B8A6',
    ordenDisplay: 8,
    activa: true
  },
  {
    nombre: 'Construcción e Ingeniería',
    descripcion: 'Proyectos de construcción, ingeniería y arquitectura',
    icono: '🏗️',
    colorHex: '#6366F1',
    ordenDisplay: 9,
    activa: true
  },
  {
    nombre: 'Gastronomía y Cocina',
    descripcion: 'Recetas, técnicas culinarias y gestión gastronómica',
    icono: '👨‍🍳',
    colorHex: '#DC2626',
    ordenDisplay: 10,
    activa: true
  },
  {
    nombre: 'Turismo y Hospitalidad',
    descripcion: 'Gestión turística, hotelería y servicios de hospitalidad',
    icono: '🏨',
    colorHex: '#10B981',
    ordenDisplay: 11,
    activa: true
  },
  {
    nombre: 'Arte y Cultura',
    descripcion: 'Proyectos artísticos, culturales y de entretenimiento',
    icono: '🎭',
    colorHex: '#EC4899',
    ordenDisplay: 12,
    activa: true
  },
  {
    nombre: 'Ciencias e Investigación',
    descripcion: 'Estudios científicos, investigación y análisis de datos',
    icono: '🧪',
    colorHex: '#0EA5E9',
    ordenDisplay: 13,
    activa: true
  },
  {
    nombre: 'Comunicación y Medios',
    descripcion: 'Comunicación, periodismo y gestión de medios',
    icono: '📡',
    colorHex: '#F43F5E',
    ordenDisplay: 14,
    activa: true
  },
  {
    nombre: 'Recursos Humanos',
    descripcion: 'Gestión de personal, capacitación y desarrollo organizacional',
    icono: '👥',
    colorHex: '#8B5CF6',
    ordenDisplay: 15,
    activa: true
  }
];

async function seedCategories() {
  console.log('🌱 Iniciando seeding de categorías...');

  try {
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');

    // Crear o actualizar cada categoría
    const results = [];
    
    for (const categoria of defaultCategories) {
      const result = await prisma.category.upsert({
        where: { nombre: categoria.nombre },
        update: {
          descripcion: categoria.descripcion,
          icono: categoria.icono,
          colorHex: categoria.colorHex,
          ordenDisplay: categoria.ordenDisplay,
          activa: categoria.activa
        },
        create: categoria
      });
      
      results.push(result);
      console.log(`✅ Categoría procesada: ${categoria.nombre}`);
    }

    console.log(`\n🎉 Seeding completado exitosamente!`);
    console.log(`📊 Total de categorías procesadas: ${results.length}`);

    // Mostrar resumen de categorías
    const allCategories = await prisma.category.findMany({
      orderBy: { ordenDisplay: 'asc' }
    });

    console.log(`\n📋 Categorías en la base de datos:`);
    allCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.icono} ${cat.nombre} (${cat.activa ? 'Activa' : 'Inactiva'})`);
    });

  } catch (error) {
    console.error('❌ Error durante el seeding de categorías:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Conexión a la base de datos cerrada');
  }
}

async function updateCategories() {
  console.log('🔄 Actualizando categorías existentes...');

  try {
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');

    const results = [];
    
    for (const categoria of defaultCategories) {
      // Solo actualizar categorías existentes
      const existing = await prisma.category.findUnique({
        where: { nombre: categoria.nombre }
      });

      if (existing) {
        const result = await prisma.category.update({
          where: { nombre: categoria.nombre },
          data: {
            descripcion: categoria.descripcion,
            icono: categoria.icono,
            colorHex: categoria.colorHex,
            ordenDisplay: categoria.ordenDisplay,
            activa: categoria.activa
          }
        });
        
        results.push(result);
        console.log(`✅ Categoría actualizada: ${categoria.nombre}`);
      } else {
        console.log(`⚠️  Categoría no encontrada (no actualizada): ${categoria.nombre}`);
      }
    }

    console.log(`\n🎉 Actualización completada!`);
    console.log(`📊 Total de categorías actualizadas: ${results.length}`);

  } catch (error) {
    console.error('❌ Error durante la actualización de categorías:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function listCategories() {
  console.log('📋 Listando todas las categorías...');

  try {
    await prisma.$connect();
    
    const categories = await prisma.category.findMany({
      orderBy: { ordenDisplay: 'asc' }
    });

    if (categories.length === 0) {
      console.log('⚠️  No hay categorías en la base de datos');
      return;
    }

    console.log(`\n📊 Total de categorías: ${categories.length}\n`);
    
    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.icono} ${cat.nombre}`);
      console.log(`   📝 ${cat.descripcion}`);
      console.log(`   🎨 Color: ${cat.colorHex} | Orden: ${cat.ordenDisplay} | Estado: ${cat.activa ? '✅ Activa' : '❌ Inactiva'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error al listar categorías:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function forceRecreate() {
  console.log('🔥 RECREANDO TODAS LAS CATEGORÍAS (ELIMINAR Y CREAR)...');
  console.log('⚠️  ADVERTENCIA: Esto eliminará todas las categorías existentes');

  try {
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');

    // Eliminar todas las categorías existentes
    const deleted = await prisma.category.deleteMany({});
    console.log(`🗑️  Eliminadas ${deleted.count} categorías existentes`);

    // Crear las nuevas categorías
    const results = [];
    
    for (const categoria of defaultCategories) {
      const result = await prisma.category.create({
        data: categoria
      });
      
      results.push(result);
      console.log(`✅ Categoría creada: ${categoria.nombre}`);
    }

    console.log(`\n🎉 Recreación completada exitosamente!`);
    console.log(`📊 Total de categorías creadas: ${results.length}`);

  } catch (error) {
    console.error('❌ Error durante la recreación de categorías:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar según el comando proporcionado
const command = process.argv[2];

switch (command) {
  case 'seed':
    seedCategories();
    break;
  case 'update':
    updateCategories();
    break;
  case 'list':
    listCategories();
    break;
  case 'force':
    forceRecreate();
    break;
  default:
    console.log('📋 Comandos disponibles:');
    console.log('  npm run seed:categories seed    - Crear/actualizar categorías');
    console.log('  npm run seed:categories update  - Solo actualizar existentes');
    console.log('  npm run seed:categories list    - Listar todas las categorías');
    console.log('  npm run seed:categories force   - Eliminar y recrear todas');
    break;
}