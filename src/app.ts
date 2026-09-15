import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import { errorHandler, NotFoundError } from './middlewares/error.middleware';
import { logger } from './config/logger';

// Modules routes
import authRoute from './modules/auth/auth.route';
import userRoute from './modules/users/user.route';
import patientRoute from './modules/patients/patient.route';
import bodyMapRoute from './modules/body-map/body-map.route';
import catalogRoute from './modules/catalog/catalog.route';
import productRoute from './modules/products/product.route';
import appointmentRoute from './modules/appointments/appointment.route';
import examinationRoute from './modules/examinations/examination.route';
import followUpRoute from './modules/follow-ups/follow-up.route';
import notificationRoute from './modules/notifications/notification.route';
import cskhRoute from './modules/cskh/cskh.route';

// Ensure BigInt serialization globally
import './utils/bigint.util';

const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
const morganStream = {
  write: (message: string) => logger.http(message.trim()),
};
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

// Swagger Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// API Routes Mounting
const apiRouter = express.Router();

apiRouter.use('/auth', authRoute);
apiRouter.use('/users', userRoute);
apiRouter.use('/patients', patientRoute);
apiRouter.use('/', bodyMapRoute);
apiRouter.use('/', catalogRoute);
apiRouter.use('/products', productRoute);
apiRouter.use('/appointments', appointmentRoute);
apiRouter.use('/examinations', examinationRoute);
apiRouter.use('/follow-ups', followUpRoute);
apiRouter.use('/notifications', notificationRoute);
apiRouter.use('/cskh', cskhRoute);

app.use('/api', apiRouter);

// 404 Handler
app.use((req, res, next) => {
  next(new NotFoundError(`Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`));
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
