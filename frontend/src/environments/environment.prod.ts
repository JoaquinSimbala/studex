export const environment = {
  production: true,
  apiUrl: 'https://api.studex.pe/api',
  appName: 'STUDEX',
  version: '1.0.0',
  supportEmail: 'soporte@studex.pe',
  
  // Configuración de la aplicación
  config: {
    // Paginación por defecto
    defaultPageSize: 12,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-rar-compressed'
    ],
    
    // Configuración de autenticación
    tokenExpirationTime: 24 * 60 * 60 * 1000, // 24 horas
    refreshTokenTime: 60 * 60 * 1000, // 1 hora
    
    // Precios y comisiones
    platformCommission: 0.15, // 15%
    minProjectPrice: 10, // S/ 10
    maxProjectPrice: 500, // S/ 500
    
    // Configuración de búsqueda
    searchDebounceTime: 300, // milliseconds
    maxSearchResults: 50,
    
    // Configuración de notificaciones
    notificationAutoMarkReadTime: 5000, // 5 segundos
    maxNotificationsPerPage: 20,
    
    // URLs externas
    termsOfServiceUrl: '/legal/terms',
    privacyPolicyUrl: '/legal/privacy',
    helpUrl: '/help',
    
    // Redes sociales
    socialMedia: {
      facebook: 'https://facebook.com/studexperu',
      instagram: 'https://instagram.com/studexperu',
      twitter: 'https://twitter.com/studexperu',
      linkedin: 'https://linkedin.com/company/studexperu'
    },
    
    // Analytics
    googleAnalyticsId: 'GA_TRACKING_ID',
    hotjarId: 'HOTJAR_ID'
  }
};