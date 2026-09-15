import swaggerJSDoc from 'swagger-jsdoc';
import { env } from '../config/env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hệ Thống Quản Lý Khám Chữa Bệnh Tại Nhà API',
      version: '1.0.0',
      description:
        'Hệ thống RESTful API phục vụ Khách hàng/Bệnh nhân, Bác sĩ/Điều dưỡng và Admin/CSKH. Xây dựng bằng Node.js, Express, TypeScript và Prisma ORM kết nối PostgreSQL.',
      contact: {
        name: 'Healthcare Tech Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập JWT Access Token nhận được từ /auth/login hoặc /auth/otp/verify',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.route.ts', './src/modules/**/*.schema.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
