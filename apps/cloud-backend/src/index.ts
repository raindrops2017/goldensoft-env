import './env';
import express from 'express';
import cors from 'cors';
import { env } from './env';
import { tenantResolver } from './middleware/tenantResolver';
import logsRoutes from './modules/logs/logs.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Mount tenant logs endpoint
app.use('/api/tenant/logs', logsRoutes);

app.get('/api/health', tenantResolver, (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      dbContext: req.tenantDb.name
    }
  });
});

app.listen(env.PORT, () => {
  console.log(`☁️  Cloud Backend is running on port ${env.PORT}`);
});

