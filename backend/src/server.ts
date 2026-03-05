import express, { Express } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import datasetsRouter from './routes/datasets.js'
import purchasesRouter from './routes/purchases.js'

dotenv.config()

const app: Express = express()
const PORT = process.env.PORT || 3001

// Enable strict routing - trailing slashes matter
app.set('strict routing', true)

// Middleware - CORS configuration
// Allow requests from frontend (development and production)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      console.log(`CORS allowed request from origin: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      // In development, allow all origins with warning
      // In production, you should block unauthorized origins
      callback(null, process.env.NODE_ENV !== 'production');
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400 // 24 hours - cache preflight requests
}))

// Middleware - JSON body parser with size limit
app.use(express.json({ limit: '10mb' }))

// Middleware - URL-encoded body parser
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Middleware - Request logging (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
    next()
  })
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API Routes
app.use('/api/datasets', datasetsRouter)
app.use('/api/purchases', purchasesRouter)

// 404 handler - must be after all routes
app.use(notFoundHandler)

// Error handling middleware - must be last
app.use(errorHandler)

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`)
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  })
}

export default app
