import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth';
import tournamentRoutes from './routes/tournaments';
import teamRoutes from './routes/teams';
import matchRoutes from './routes/matches';
import userRoutes from './routes/users';
import bracketRoutes from './routes/brackets';
import debugRoutes from './routes/debug';
import storageRoutes from './routes/storage';
import integrationsRoutes from './routes/integrations';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

export function createApp(): express.Application {
  const app = express();

  // CSP отключён: SPA + JSON-LD из react-helmet-async используют inline-скрипты в head.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: process.env['CLIENT_URL'] || 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  app.use('/api/auth', authRoutes);
  app.use('/api/tournaments', tournamentRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/brackets', bracketRoutes);
  app.use('/api/debug', debugRoutes);
  app.use('/api/storage', storageRoutes);
  app.use('/api/integrations', integrationsRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  const clientDist = process.env['CLIENT_DIST_PATH']
    ? path.resolve(process.env['CLIENT_DIST_PATH'])
    : path.join(__dirname, '../../client/dist');

  if (process.env['NODE_ENV'] === 'production' && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
