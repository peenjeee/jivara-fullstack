import swaggerJsdoc from 'swagger-jsdoc';

const getServers = () => {
  const servers: Array<{ url: string; description: string }> = [];

  if (process.env.NODE_ENV === 'production') {
    servers.push({
      url: process.env.API_URL || 'https://api.jivara.web.id',
      description: '',
    });
  } else {
    servers.push({
      url: `http://localhost:${process.env.PORT || 3001}`,
      description: '',
    });
  }

  return servers;
};

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Jivara API Docs',
      version: '1.0.0',
      contact: {
        name: 'Jivara',
      },
    },
    servers: getServers(),
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Masukkan token akses',
        },
      },
    },
  },
  apis: ['./src/app.ts', './src/routes/*.ts'], // Path ke dokumentasi API
};

const spec = swaggerJsdoc(options) as { paths?: Record<string, unknown> };

if (spec.paths) {
  spec.paths = Object.fromEntries(
    Object.entries(spec.paths).map(([path, value]) => [
      path.startsWith('/api/') ? path.replace('/api/', '/api/v1/') : path,
      value,
    ]),
  );
}

export const swaggerSpec = spec;
