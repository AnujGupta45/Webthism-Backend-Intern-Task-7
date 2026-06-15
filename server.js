import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import apiRouter from './src/routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Standard Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Serve Static Front-End Dashboard (for testing)
app.use(express.static('public'));

// Register API Routes
app.use('/api', apiRouter);

// Global Error Fallback Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` Lead Generation API Server is running!`);
  console.log(` Local Server:     http://localhost:${PORT}`);
  console.log(` API Endpoints:    http://localhost:${PORT}/api`);
  console.log(` Interactive UI:   http://localhost:${PORT}/index.html`);
  console.log(`===================================================`);
});
