import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuración de la estrategia de Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
      try {
        console.log('🔐 Google OAuth - Perfil recibido:', profile.id, profile.emails?.[0]?.value);

        // Verificar que el email existe
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No se pudo obtener el email de Google'));
        }

        // Buscar usuario existente por email
        let user = await prisma.user.findUnique({
          where: { email }
        });

        if (user) {
          // Usuario ya existe - actualizar última sesión y googleId si no lo tiene
          console.log('✅ Usuario existente encontrado:', user.email);
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              fechaUltimaSesion: new Date(),
              googleId: profile.id,
              authProvider: 'GOOGLE'
            } as any
          });
        } else {
          // Crear nuevo usuario con datos de Google
          console.log('➕ Creando nuevo usuario desde Google:', email);
          
          // Extraer nombre y apellido del perfil
          const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'Usuario';
          const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';
          const profileImage = profile.photos?.[0]?.value || null;

          user = await prisma.user.create({
            data: {
              email,
              nombre: firstName,
              apellidos: lastName,
              profileImage,
              googleId: profile.id,
              authProvider: 'GOOGLE',
              passwordHash: null,
              tipo: 'USER',
              emailVerificado: true, // Google ya verificó el email
              institucion: null
            } as any
          });

          console.log('✅ Usuario creado exitosamente:', user.email);
        }

        return done(null, user);
      } catch (error) {
        console.error('❌ Error en Google OAuth:', error);
        return done(error as Error);
      }
    }
  )
);

// NOTA: No necesitamos serializeUser/deserializeUser porque usamos JWT (session: false)
// La autenticación se maneja completamente con tokens, no con sesiones

export default passport;
