// Load environment variables first
require('dotenv').config();

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const http = require('http');
const url = require('url');
const Redis = require('ioredis'); // Use ioredis for better performance
// const compression = require('compression'); // Unused - remove if not needed
// const rateLimit = require('express-rate-limit'); // Unused - remove if not needed
const NodeCache = require('node-cache');
const pino = require('pino');
const EventEmitter = require('events');

// Initialize high-performance logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      singleLine: true
    }
  } : undefined
});

// Initialize in-memory cache for better performance
const memCache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every minute
  useClones: false // Better performance
});

// Enhanced performance optimizations with adaptive clustering and resource management
const OPTIMAL_WORKERS = process.env.CLUSTER_SIZE || Math.min(numCPUs, process.env.NODE_ENV === 'production' ? Math.max(numCPUs, 2) : 4);
// const MEMORY_THRESHOLD = parseInt(process.env.MEMORY_THRESHOLD) || (1024 * 1024 * 1024); // 1GB threshold - unused
// const CPU_THRESHOLD = parseInt(process.env.CPU_THRESHOLD) || 80; // 80% CPU threshold - unused
const WORKER_MEMORY_LIMIT = parseInt(process.env.WORKER_MEMORY_LIMIT) || (512 * 1024 * 1024); // 512MB per worker
const RESTART_DELAY_BASE = 1000; // Base restart delay in ms
const MAX_RESTART_DELAY = 30000; // Max restart delay 30s
const ADAPTIVE_SCALING_ENABLED = process.env.ADAPTIVE_SCALING === 'true';

// Advanced cluster manager with auto-scaling capabilities
class ClusterManager extends EventEmitter {
  constructor() {
    super();
    this.workers = new Map();
    this.workerStats = new Map();
    this.systemMetrics = {
      cpu: 0,
      memory: 0,
      loadAvg: [0, 0, 0],
      lastCheck: Date.now()
    };
    this.autoScaleTimer = null;
    this.performanceHistory = [];
    this.lastWorkerIndex = 0;
  }

  async initialize() {
    logger.info(`🚀 Primary ${process.pid} initializing ${OPTIMAL_WORKERS} workers`);
    logger.info(`📊 System: ${numCPUs} CPUs available, targeting ${OPTIMAL_WORKERS} workers`);
    
    // Start initial workers
    for (let i = 0; i < OPTIMAL_WORKERS; i++) {
      await this.createWorker();
    }

    // Setup monitoring and auto-scaling
    if (ADAPTIVE_SCALING_ENABLED) {
      this.startPerformanceMonitoring();
      this.startAutoScaling();
    }

    this.setupClusterEventHandlers();
    this.startHealthMonitoring();
    this.startSystemMetricsCollection();

    logger.info(`✅ Cluster manager initialized with ${this.workers.size} workers`);
  }
  
  async createWorker() {
    const worker = cluster.fork();
    const workerId = worker.id;
    const workerPid = worker.process.pid;
    
    // Enhanced worker tracking with performance metrics
    this.workers.set(workerId, {
      worker,
      pid: workerPid,
      startTime: Date.now(),
      restarts: 0,
      lastHealthCheck: Date.now(),
      memoryUsage: 0,
      cpuUsage: 0,
      requestCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      isHealthy: true,
      load: 0 // Current load score for load balancing
    });
    
    // Initialize worker performance stats
    this.workerStats.set(workerId, {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      lastRequestTime: Date.now(),
      performanceScore: 100 // 0-100 performance score
    });

    // Enhanced worker message handling
    worker.on('message', (msg) => this.handleWorkerMessage(workerId, msg));
    worker.on('exit', (code, signal) => this.handleWorkerExit(workerId, code, signal));
    worker.on('error', (error) => this.handleWorkerError(workerId, error));

    logger.info(`✅ Worker ${workerId} (PID: ${workerPid}) created successfully`);
    return worker;
  }

  handleWorkerMessage(workerId, msg) {
    const workerData = this.workers.get(workerId);
    if (!workerData) return;

    switch (msg.type) {
      case 'health':
        workerData.lastHealthCheck = Date.now();
        workerData.isHealthy = msg.healthy || true;
        workerData.memoryUsage = msg.memory || 0;
        workerData.cpuUsage = msg.cpu || 0;
        workerData.load = msg.load || 0;
        break;
      
      case 'request_complete':
        workerData.requestCount++;
        workerData.avgResponseTime = (workerData.avgResponseTime + msg.responseTime) / 2;
        break;
      
      case 'request_error':
        workerData.errorCount++;
        break;
      
      case 'performance_alert':
        logger.warn(`Performance alert from worker ${workerId}: ${msg.message}`);
        if (msg.severity === 'critical' && ADAPTIVE_SCALING_ENABLED) {
          this.handlePerformanceCrisis(workerId);
        }
        break;
    }
  }

  handleWorkerExit(workerId, code, signal) {
    const workerData = this.workers.get(workerId);
    if (workerData) {
      workerData.restarts++;
      logger.warn(`Worker ${workerId} exited with code ${code} and signal ${signal}. Restarts: ${workerData.restarts}`);
      
      // Remove the dead worker
      this.workers.delete(workerId);
      this.workerStats.delete(workerId);
      
      // Restart worker with exponential backoff
      const delay = Math.min(RESTART_DELAY_BASE * Math.pow(2, workerData.restarts - 1), MAX_RESTART_DELAY);
      setTimeout(() => {
        logger.info(`Restarting worker ${workerId} after ${delay}ms delay`);
        this.createWorker();
      }, delay);
    }
  }

  handleWorkerError(workerId, error) {
    logger.error(`Worker ${workerId} error:`, error);
    const workerData = this.workers.get(workerId);
    if (workerData) {
      workerData.errorCount++;
    }
  }

  startPerformanceMonitoring() {
    logger.info('🔍 Starting performance monitoring');
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 30000); // Every 30 seconds
  }

  startAutoScaling() {
    logger.info('⚡ Starting auto-scaling monitoring');
    setInterval(() => {
      this.evaluateScaling();
    }, 60000); // Every minute
  }

  setupClusterEventHandlers() {
    logger.info('🔧 Setting up cluster event handlers');
    
    cluster.on('exit', (worker, code, signal) => {
      logger.warn(`Worker ${worker.process.pid} died`);
    });

    cluster.on('listening', (worker, address) => {
      logger.info(`Worker ${worker.process.pid} listening on ${address.address}:${address.port}`);
    });

    cluster.on('disconnect', (worker) => {
      logger.warn(`Worker ${worker.process.pid} disconnected`);
    });
  }

  startHealthMonitoring() {
    logger.info('💊 Starting health monitoring');
    setInterval(() => {
      this.checkWorkerHealth();
    }, 10000); // Every 10 seconds
  }

  startSystemMetricsCollection() {
    logger.info('📊 Starting system metrics collection');
    setInterval(() => {
      this.updateSystemMetrics();
    }, 5000); // Every 5 seconds
  }

  collectPerformanceMetrics() {
    const metrics = {
      totalWorkers: this.workers.size,
      healthyWorkers: Array.from(this.workers.values()).filter(w => w.isHealthy).length,
      totalRequests: Array.from(this.workers.values()).reduce((sum, w) => sum + w.requestCount, 0),
      totalErrors: Array.from(this.workers.values()).reduce((sum, w) => sum + w.errorCount, 0),
      avgResponseTime: this.calculateAverageResponseTime(),
      avgPerformanceScore: this.calculateAveragePerformanceScore()
    };
    
    this.performanceHistory.push({
      timestamp: Date.now(),
      ...metrics
    });

    // Keep only last 100 data points
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
  }

  evaluateScaling() {
    const currentWorkers = this.workers.size;
    const avgLoad = this.calculateAverageLoad();
    // const memoryPressure = this.calculateMemoryPressure(); // Unused variable
    
    if (avgLoad > 80 && currentWorkers < numCPUs) {
      logger.info('🚀 High load detected, scaling up');
      this.createWorker();
    } else if (avgLoad < 30 && currentWorkers > 2) {
      logger.info('📉 Low load detected, scaling down');
      this.removeWorker();
    }
  }

  checkWorkerHealth() {
    const now = Date.now();
    for (const [workerId, workerData] of this.workers.entries()) {
      const timeSinceLastHealth = now - workerData.lastHealthCheck;
      
      if (timeSinceLastHealth > 30000) { // 30 seconds without heartbeat
        logger.warn(`Worker ${workerId} appears unhealthy, no heartbeat for ${timeSinceLastHealth}ms`);
        workerData.isHealthy = false;
        
        if (timeSinceLastHealth > 60000) { // 1 minute - force restart
          logger.error(`Force killing unhealthy worker ${workerId}`);
          workerData.worker.kill('SIGTERM');
        }
      }
    }
  }

  updateSystemMetrics() {
    const os = require('os');
    this.systemMetrics = {
      cpu: os.loadavg()[0] * 100 / os.cpus().length,
      memory: (os.totalmem() - os.freemem()) / os.totalmem() * 100,
      loadAvg: os.loadavg(),
      lastCheck: Date.now()
    };
  }

  calculateAverageResponseTime() {
    const workers = Array.from(this.workers.values());
    if (workers.length === 0) return 0;
    
    const total = workers.reduce((sum, w) => sum + w.avgResponseTime, 0);
    return total / workers.length;
  }

  calculateAveragePerformanceScore() {
    const workers = Array.from(this.workers.values());
    if (workers.length === 0) return 100;
    
    return workers.reduce((sum, w) => {
      const memScore = 100 - (w.memoryUsage / WORKER_MEMORY_LIMIT * 100);
      const errorScore = w.requestCount > 0 ? 100 - (w.errorCount / w.requestCount * 100) : 100;
      const responseScore = Math.max(0, 100 - (w.avgResponseTime / 100));
      return sum + (memScore + errorScore + responseScore) / 3;
    }, 0) / workers.length;
  }

  calculateAverageLoad() {
    const workers = Array.from(this.workers.values());
    if (workers.length === 0) return 0;
    
    return workers.reduce((sum, w) => sum + w.load, 0) / workers.length;
  }

  calculateMemoryPressure() {
    const workers = Array.from(this.workers.values());
    if (workers.length === 0) return 0;
    
    return workers.reduce((sum, w) => sum + (w.memoryUsage / WORKER_MEMORY_LIMIT * 100), 0) / workers.length;
  }

  handlePerformanceCrisis(workerId) {
    logger.error(`🚨 Performance crisis in worker ${workerId}, taking corrective action`);
    const workerData = this.workers.get(workerId);
    if (workerData && workerData.worker) {
      workerData.worker.kill('SIGTERM');
    }
  }

  removeWorker() {
    const workers = Array.from(this.workers.values());
    if (workers.length <= 2) return; // Keep minimum of 2 workers
    
    // Find worker with lowest load
    const workerToRemove = workers.reduce((min, current) => 
      current.load < min.load ? current : min
    );
    
    logger.info(`Removing worker ${workerToRemove.worker.id} due to low load`);
    workerToRemove.worker.kill('SIGTERM');
  }

  getClusterStats() {
    return {
      totalWorkers: this.workers.size,
      healthyWorkers: Array.from(this.workers.values()).filter(w => w.isHealthy).length,
      avgPerformanceScore: this.calculateAveragePerformanceScore(),
      avgLoad: this.calculateAverageLoad(),
      systemMetrics: this.systemMetrics,
      uptime: Date.now() - (this.workers.values().next().value?.startTime || Date.now()),
      workers: Array.from(this.workers.entries()).map(([id, data]) => ({
        id,
        pid: data.pid,
        healthy: data.isHealthy,
        load: data.load,
        requests: data.requestCount,
        errors: data.errorCount,
        avgResponseTime: data.avgResponseTime,
        memoryUsage: data.memoryUsage
      }))
    };
  }
}

if (cluster.isPrimary) {
  const clusterManager = new ClusterManager();
  clusterManager.initialize().catch(error => {
    logger.error('❌ Cluster manager initialization failed:', error);
    process.exit(1);
  });

  // Expose cluster stats endpoint for monitoring
  const monitoringServer = http.createServer((req, res) => {
    if (req.url === '/cluster/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(clusterManager.getClusterStats(), null, 2));
    } else if (req.url === '/cluster/health') {
      const stats = clusterManager.getClusterStats();
      const isHealthy = stats.healthyWorkers > 0 && stats.avgPerformanceScore > 50;
      res.writeHead(isHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        healthy: isHealthy, 
        workers: stats.healthyWorkers, 
        totalWorkers: stats.totalWorkers,
        avgPerformance: stats.avgPerformanceScore 
      }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  monitoringServer.listen(3001, () => {
    logger.info('📊 Cluster monitoring available at http://localhost:3001/cluster/stats');
  });

  // Primary doesn't run server logic - exit here
  process.exit(0);
}

// Enhanced performance monitoring for workers
class WorkerPerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.totalResponseTime = 0;
    this.memoryAlerts = 0;
    this.cpuAlerts = 0;
    this.lastHealthCheck = Date.now();
    
    this.startMonitoring();
  }

  startMonitoring() {
    // Send health updates to master
    setInterval(() => {
      this.sendHealthUpdate();
    }, 5000); // Every 5 seconds

    // Memory monitoring
    setInterval(() => {
      this.checkMemoryUsage();
    }, 10000); // Every 10 seconds

    // Performance monitoring
    setInterval(() => {
      this.checkPerformance();
    }, 30000); // Every 30 seconds
  }

  recordRequest(responseTime, hasError = false) {
    this.requestCount++;
    this.totalResponseTime += responseTime;
    
    if (hasError) {
      this.errorCount++;
      this.sendMessage({
        type: 'request_error',
        responseTime,
        timestamp: Date.now()
      });
    } else {
      this.sendMessage({
        type: 'request_complete',
        responseTime,
        timestamp: Date.now()
      });
    }
  }

  sendHealthUpdate() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.sendMessage({
      type: 'health',
      memory: memUsage.heapUsed,
      cpu: this.calculateCpuPercent(cpuUsage),
      load: this.calculateLoadScore(),
      healthy: this.isHealthy(),
      requests: this.requestCount,
      errors: this.errorCount,
      avgResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
      timestamp: Date.now()
    });
  }

  calculateCpuPercent(cpuUsage) {
    // Simplified CPU calculation
    return Math.min(((cpuUsage.user + cpuUsage.system) / 1000000) / process.uptime() * 100, 100);
  }

  calculateLoadScore() {
    const memUsage = process.memoryUsage();
    const memoryScore = (memUsage.heapUsed / WORKER_MEMORY_LIMIT) * 100;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    const avgResponseTime = this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0;
    
    // Calculate composite load score (0-100, higher = more loaded)
    let loadScore = 0;
    loadScore += Math.min(memoryScore, 50); // Memory can contribute up to 50%
    loadScore += Math.min(errorRate * 2, 25); // Error rate can contribute up to 25%
    loadScore += Math.min(avgResponseTime / 100, 25); // Response time can contribute up to 25%
    
    return Math.min(loadScore, 100);
  }

  isHealthy() {
    const memUsage = process.memoryUsage();
    const memoryOk = memUsage.heapUsed < WORKER_MEMORY_LIMIT * 0.9;
    const errorRateOk = this.requestCount === 0 || (this.errorCount / this.requestCount) < 0.1;
    
    return memoryOk && errorRateOk;
  }

  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const memoryUsagePercent = (memUsage.heapUsed / WORKER_MEMORY_LIMIT) * 100;
    
    if (memoryUsagePercent > 90) {
      this.memoryAlerts++;
      this.sendMessage({
        type: 'performance_alert',
        severity: 'critical',
        metric: 'memory',
        value: memUsage.heapUsed,
        threshold: WORKER_MEMORY_LIMIT * 0.9,
        message: `Memory usage at ${memoryUsagePercent.toFixed(1)}%`
      });
      
      // Force garbage collection if available
      if (global.gc) {
        try {
          global.gc();
          logger.info('🗑️ Forced garbage collection due to high memory usage');
        } catch (error) {
          logger.warn('Failed to force garbage collection:', error);
        }
      }
    } else if (memoryUsagePercent > 75) {
      this.sendMessage({
        type: 'performance_alert',
        severity: 'warning',
        metric: 'memory',
        value: memUsage.heapUsed,
        threshold: WORKER_MEMORY_LIMIT * 0.75,
        message: `Memory usage at ${memoryUsagePercent.toFixed(1)}%`
      });
    }
  }

  checkPerformance() {
    const avgResponseTime = this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0;
    
    if (avgResponseTime > 2000) { // > 2 seconds
      this.sendMessage({
        type: 'performance_alert',
        severity: 'warning',
        metric: 'response_time',
        value: avgResponseTime,
        threshold: 2000,
        message: `Average response time: ${avgResponseTime.toFixed(0)}ms`
      });
    }
  }

  sendMessage(message) {
    if (process.send) {
      try {
        process.send(message);
      } catch (error) {
        logger.warn('Failed to send message to master:', error);
      }
    }
  }

  getStats() {
    return {
      uptime: Date.now() - this.startTime,
      requests: this.requestCount,
      errors: this.errorCount,
      avgResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
      memoryAlerts: this.memoryAlerts,
      cpuAlerts: this.cpuAlerts
    };
  }
}

const performanceMonitor = new WorkerPerformanceMonitor();

// Worker process continues with server logic
logger.info(`🚀 Worker ${process.pid} starting with enhanced monitoring...`);
logger.info(`📊 Performance monitoring enabled`);
logger.info(`🔄 Adaptive scaling: ${ADAPTIVE_SCALING_ENABLED ? 'enabled' : 'disabled'}`);

// Enhanced Redis-based caching system with ioredis (better performance)
let redisClient;
const CACHE_TTL = {
  health: 5000,      // 5 seconds for health checks
  metrics: 10000,    // 10 seconds for metrics
  api: 300000,       // 5 minutes for API responses
  static: 3600000    // 1 hour for static content
};

// Initialize Redis connection with ioredis (better performance and connection pooling)
const initializeRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisConfig = {
      retryDelayOnFailover: 300,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4, // IPv4
      connectTimeout: 5000,
      commandTimeout: 5000,
      retryDelayOnClusterDown: 300,
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production'
    };
    
    // Parse Redis URL if provided, otherwise use localhost
    if (redisUrl.startsWith('redis://')) {
      redisClient = new Redis(redisUrl, redisConfig);
    } else {
      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
        ...redisConfig
      });
    }
    
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err.message);
    });
    
    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });
    
    redisClient.on('reconnecting', (delay) => {
      logger.info(`🔄 Redis attempting to reconnect in ${delay}ms...`);
    });
    
    redisClient.on('ready', () => {
      logger.info('✅ Redis ready to accept commands');
    });
    
    redisClient.on('close', () => {
      logger.warn('🔴 Redis connection closed');
    });
    
    // Test the connection
    await redisClient.ping();
    return true;
  } catch (error) {
    logger.warn(`⚠️ Redis initialization failed: ${error.message}`);
    logger.warn('❌ Redis connection failed, using in-memory cache only');
    redisClient = null;
    return false;
  }
};

// Enhanced multi-layer caching (L1: NodeCache, L2: Redis)
const cache = {
  async get(key) {
    // L1 Cache: Check NodeCache first (fastest)
    const localValue = memCache.get(key);
    if (localValue !== undefined) {
      return localValue;
    }
    
    // L2 Cache: Check Redis if available
    try {
      if (redisClient && redisClient.status === 'ready') {
        const value = await redisClient.get(key);
        if (value !== null) {
          const parsedValue = JSON.parse(value);
          // Store in L1 cache for future requests
          memCache.set(key, parsedValue, Math.floor(CACHE_TTL.api / 1000));
          return parsedValue;
        }
      }
    } catch (error) {
      logger.warn('Redis get error:', error.message);
    }
    
    return null;
  },
  
  async set(key, value, ttl = CACHE_TTL.api) {
    // Store in L1 cache (NodeCache) - fastest access
    memCache.set(key, value, Math.floor(ttl / 1000));
    
    // Store in L2 cache (Redis) - shared across workers
    try {
      if (redisClient && redisClient.status === 'ready') {
        await redisClient.setex(key, Math.floor(ttl / 1000), JSON.stringify(value));
      }
    } catch (error) {
      logger.warn('Redis set error:', error.message);
    }
  },
  
  async del(key) {
    // Delete from both cache layers
    memCache.del(key);
    
    try {
      if (redisClient && redisClient.status === 'ready') {
        await redisClient.del(key);
      }
    } catch (error) {
      logger.warn('Redis delete error:', error.message);
    }
  },
  
  // Cache statistics for monitoring
  getStats() {
    return {
      l1_cache: {
        keys: memCache.keys().length,
        hits: memCache.getStats().hits,
        misses: memCache.getStats().misses
      },
      l2_cache: redisClient ? { 
        status: redisClient.status,
        connected: redisClient.status === 'ready'
      } : { status: 'disabled', connected: false }
    };
  }
};

// Initialize Redis connection
initializeRedis();

// Enhanced health check endpoint with Redis caching
const healthCheck = async (req, res) => {
  const cacheKey = `health_check:${process.pid}`;
  
  try {
    // Try to get cached health data
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=5',
        'X-Worker-ID': process.pid.toString(),
        'X-Cache': 'HIT'
      });
      res.end(JSON.stringify(cached));
      
      // Send health heartbeat to master
      if (process.send) {
        process.send({ type: 'health', pid: process.pid });
      }
      return;
    }
  } catch (error) {
    console.warn('Health check cache error:', error.message);
  }
  
  // Generate fresh health data
  const memUsage = process.memoryUsage();
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    },
    cpu: {
      loadAverage: require('os').loadavg(),
      usage: process.cpuUsage()
    },
    version: process.version,
    environment: process.env.NODE_ENV || 'development',
    worker_id: process.pid,
    cluster_size: OPTIMAL_WORKERS,
    redis_connected: redisClient && redisClient.isOpen
  };
  
  // Cache the health data
  await cache.set(cacheKey, healthData, CACHE_TTL.health);
  
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=5',
    'X-Worker-ID': process.pid.toString(),
    'X-Cache': 'MISS'
  });
  res.end(JSON.stringify(healthData, null, 2));
  
  // Send health heartbeat to master
  if (process.send) {
    process.send({ type: 'health', pid: process.pid });
  }
};

// Optimized metrics endpoint with reduced CPU overhead
class MetricsCollector {
  constructor() {
    this.baseMetrics = null;
    this.lastCpuUsage = process.cpuUsage();
    this.requestCount = 0;
    this.responseTimeSum = 0;
    this.lastMetricsTime = Date.now();
  }
  
  recordRequest(responseTime) {
    this.requestCount++;
    this.responseTimeSum += responseTime;
  }
  
  generateMetrics() {
    const now = Date.now();
    const timeSinceLastMetrics = now - this.lastMetricsTime;
    
    // Only recalculate expensive metrics every few seconds
    if (!this.baseMetrics || timeSinceLastMetrics > 5000) {
      const memUsage = process.memoryUsage();
      const currentCpuUsage = process.cpuUsage();
      const cpuDelta = process.cpuUsage(this.lastCpuUsage);
      const loadAvg = require('os').loadavg();
      const rateLimiterStats = rateLimiter.getStats();
      
      this.baseMetrics = {
        memory: memUsage,
        cpu: {
          user: currentCpuUsage.user / 1000000,
          system: currentCpuUsage.system / 1000000,
          userDelta: cpuDelta.user / 1000000,
          systemDelta: cpuDelta.system / 1000000
        },
        uptime: process.uptime(),
        loadAverage: loadAvg,
        rateLimiter: rateLimiterStats
      };
      
      this.lastCpuUsage = currentCpuUsage;
      this.lastMetricsTime = now;
    }
    
    const avgResponseTime = this.requestCount > 0 ? this.responseTimeSum / this.requestCount : 0;
    
    return [
      '# HELP nodejs_memory_usage_bytes Memory usage in bytes',
      '# TYPE nodejs_memory_usage_bytes gauge',
      `nodejs_memory_usage_bytes{type="rss",worker="${process.pid}"} ${this.baseMetrics.memory.rss}`,
      `nodejs_memory_usage_bytes{type="heapTotal",worker="${process.pid}"} ${this.baseMetrics.memory.heapTotal}`,
      `nodejs_memory_usage_bytes{type="heapUsed",worker="${process.pid}"} ${this.baseMetrics.memory.heapUsed}`,
      `nodejs_memory_usage_bytes{type="external",worker="${process.pid}"} ${this.baseMetrics.memory.external}`,
      '',
      '# HELP nodejs_cpu_usage_seconds_total CPU usage in seconds',
      '# TYPE nodejs_cpu_usage_seconds_total counter',
      `nodejs_cpu_usage_seconds_total{type="user",worker="${process.pid}"} ${this.baseMetrics.cpu.user}`,
      `nodejs_cpu_usage_seconds_total{type="system",worker="${process.pid}"} ${this.baseMetrics.cpu.system}`,
      '',
      '# HELP nodejs_request_total Total number of requests',
      '# TYPE nodejs_request_total counter',
      `nodejs_request_total{worker="${process.pid}"} ${this.requestCount}`,
      '',
      '# HELP nodejs_request_duration_seconds Average request duration',
      '# TYPE nodejs_request_duration_seconds gauge',
      `nodejs_request_duration_seconds{worker="${process.pid}"} ${avgResponseTime / 1000}`,
      '',
      '# HELP nodejs_uptime_seconds Process uptime in seconds',
      '# TYPE nodejs_uptime_seconds counter',
      `nodejs_uptime_seconds{worker="${process.pid}"} ${this.baseMetrics.uptime}`,
      '',
      '# HELP nodejs_load_average System load average',
      '# TYPE nodejs_load_average gauge',
      `nodejs_load_average{period="1m"} ${this.baseMetrics.loadAverage[0]}`,
      `nodejs_load_average{period="5m"} ${this.baseMetrics.loadAverage[1]}`,
      `nodejs_load_average{period="15m"} ${this.baseMetrics.loadAverage[2]}`,
      '',
      '# HELP rate_limiter_store_size Current rate limiter store size',
      '# TYPE rate_limiter_store_size gauge',
      `rate_limiter_store_size{worker="${process.pid}"} ${this.baseMetrics.rateLimiter.storeSize}`,
      '',
      '# HELP redis_connection_status Redis connection status',
      '# TYPE redis_connection_status gauge',
      `redis_connection_status{worker="${process.pid}"} ${redisClient && redisClient.isOpen ? 1 : 0}`
    ].join('\n');
  }
}

const metricsCollector = new MetricsCollector();

const metrics = async (req, res) => {
  const cacheKey = `metrics:${process.pid}`;
  
  try {
    // Try to get cached metrics
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.writeHead(200, { 
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'X-Cache': 'HIT',
        'X-Worker-ID': process.pid.toString()
      });
      res.end(cached);
      return;
    }
  } catch (error) {
    console.warn('Metrics cache error:', error.message);
  }
  
  // Generate efficient metrics
  const metricsData = metricsCollector.generateMetrics();
  
  // Cache the metrics
  await cache.set(cacheKey, metricsData, CACHE_TTL.metrics);
  
  res.writeHead(200, { 
    'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    'X-Cache': 'MISS',
    'X-Worker-ID': process.pid.toString()
  });
  res.end(metricsData);
};

// Rate limiting configuration
// Unused function - commented out for now
/* const createRateLimiter = () => {
  return {
    windowMs: 60 * 1000, // 1 minute window
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many requests, please try again later' }));
    }
  };
}; */

// Optimized sliding window rate limiter with memory bounds
class OptimizedRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute
    this.maxRequests = options.maxRequests || 100;
    this.maxStoreSize = options.maxStoreSize || 10000; // Prevent memory leaks
    this.store = new Map();
    this.cleanupCounter = 0;
    this.cleanupInterval = 100; // Cleanup every 100 requests
  }

  // Efficient sliding window algorithm
  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get or create request log for this identifier
    let requests = this.store.get(identifier);
    if (!requests) {
      requests = [];
      this.store.set(identifier, requests);
    }
    
    // Remove expired requests (binary search for efficiency)
    const firstValidIndex = this.binarySearchFirst(requests, windowStart);
    if (firstValidIndex > 0) {
      requests.splice(0, firstValidIndex);
    }
    
    // Check rate limit
    if (requests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    requests.push(now);
    
    // Periodic cleanup to prevent memory leaks
    this.cleanupCounter++;
    if (this.cleanupCounter >= this.cleanupInterval) {
      this.periodicCleanup(now);
      this.cleanupCounter = 0;
    }
    
    return true;
  }
  
  // Binary search to find first valid timestamp
  binarySearchFirst(arr, target) {
    let left = 0;
    let right = arr.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid] < target) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return left;
  }
  
  // Efficient periodic cleanup
  periodicCleanup(now) {
    const windowStart = now - this.windowMs;
    const toDelete = [];
    
    // Mark entries for deletion
    for (const [key, requests] of this.store.entries()) {
      const validRequests = requests.filter(timestamp => timestamp >= windowStart);
      if (validRequests.length === 0) {
        toDelete.push(key);
      } else {
        this.store.set(key, validRequests);
      }
    }
    
    // Delete empty entries
    toDelete.forEach(key => this.store.delete(key));
    
    // Emergency cleanup if store gets too large
    if (this.store.size > this.maxStoreSize) {
      const entries = Array.from(this.store.entries());
      const sortedEntries = entries.sort((a, b) => {
        const lastRequestA = a[1][a[1].length - 1] || 0;
        const lastRequestB = b[1][b[1].length - 1] || 0;
        return lastRequestA - lastRequestB;
      });
      
      // Remove oldest 25% of entries
      const removeCount = Math.floor(this.maxStoreSize * 0.25);
      for (let i = 0; i < removeCount; i++) {
        this.store.delete(sortedEntries[i][0]);
      }
    }
  }
  
  getStats() {
    return {
      storeSize: this.store.size,
      totalRequests: Array.from(this.store.values()).reduce((sum, reqs) => sum + reqs.length, 0),
      avgRequestsPerIP: this.store.size > 0 ? 
        Array.from(this.store.values()).reduce((sum, reqs) => sum + reqs.length, 0) / this.store.size : 0
    };
  }
}

const rateLimiter = new OptimizedRateLimiter({
  windowMs: 60 * 1000,   // 1 minute window
  maxRequests: 100,       // 100 requests per window
  maxStoreSize: 10000     // Maximum IPs to track
});

const rateLimitMiddleware = (req, res) => {
  // SECURITY: Sanitize and validate IP address extraction
  let ip = req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress;
  
  // Handle X-Forwarded-For chain (take first IP)
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  
  // Enhanced IP validation with proper IPv4/IPv6 support
  const validateIP = (ip) => {
    if (!ip || typeof ip !== 'string') return false;
    
    // IPv4 validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Regex.test(ip)) return true;
    
    // IPv6 validation (simplified but more accurate)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    if (ipv6Regex.test(ip)) return true;
    
    // IPv6 compressed forms
    const ipv6CompressedRegex = /^(([0-9a-fA-F]{1,4}:)*)?::?(([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4})?$/;
    if (ipv6CompressedRegex.test(ip) && ip.split('::').length <= 2) return true;
    
    return false;
  };

  if (!validateIP(ip)) {
    ip = '127.0.0.1'; // Fallback for invalid IPs
  }
  
  if (!rateLimiter.isAllowed(ip)) {
    res.writeHead(429, { 
      'Content-Type': 'application/json',
      'Retry-After': '60',
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': Math.ceil(Date.now() / 1000) + 60
    });
    res.end(JSON.stringify({ 
      error: 'Too many requests, please try again later',
      retryAfter: 60
    }));
    return false;
  }
  
  return true;
};

// Main application handler
const appHandler = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Must Be Viral V2</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 800px; margin: 0 auto; }
            .status { color: #28a745; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Must Be Viral V2</h1>
            <p class="status">✅ Application is running</p>
            <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
            <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
            <p>Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB</p>
            <hr>
            <h2>Available Endpoints:</h2>
            <ul>
                <li><a href="/health">/health</a> - Health check</li>
                <li><a href="/metrics">/metrics</a> - Prometheus metrics</li>
            </ul>
        </div>
    </body>
    </html>
  `);
};

// Enhanced request router with async support and security headers
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Apply rate limiting
  if (!rateLimitMiddleware(req, res)) {
    return; // Request was rate limited
  }
  
  // Enhanced security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Improved CSP with environment-specific policies
  const generateCSP = () => {
    const isDev = process.env.NODE_ENV === 'development';
    const basePolicy = "default-src 'self'";
    const scriptSrc = isDev ? 
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : 
      "script-src 'self' 'strict-dynamic'";
    const styleSrc = "style-src 'self' 'unsafe-inline'";
    const imgSrc = "img-src 'self' data: https:";
    const connectSrc = isDev ? 
      "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:*" : 
      "connect-src 'self' https:";
    const fontSrc = "font-src 'self' data:";
    const objectSrc = "object-src 'none'";
    const mediaSrc = "media-src 'self'";
    const frameSrc = "frame-src 'none'";
    
    return [basePolicy, scriptSrc, styleSrc, imgSrc, connectSrc, fontSrc, objectSrc, mediaSrc, frameSrc].join('; ');
  };
  
  res.setHeader('Content-Security-Policy', generateCSP());
  
  // CORS headers for API endpoints - secure by default
  const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean);
  const origin = req.headers.origin;
  
  if (allowedOrigins.length === 0) {
    // Default to local development only if no CORS_ORIGIN is set
    const defaultOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];
    if (process.env.NODE_ENV === 'development' && origin && defaultOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Request logging for monitoring
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  
  // Log request (in production, use proper logging framework)
  console.log(`[${new Date().toISOString()}] ${requestId} ${req.method} ${path} - ${req.connection.remoteAddress}`);
  
  try {
    switch (path) {
      case '/health':
        await healthCheck(req, res);
        break;
      case '/metrics':
        await metrics(req, res);
        break;
      case '/favicon.ico':
        // Serve a simple favicon to reduce 404s
        res.writeHead(200, { 'Content-Type': 'image/x-icon' });
        res.end();
        break;
      case '/robots.txt':
        // Basic robots.txt
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('User-agent: *\nDisallow: /health\nDisallow: /metrics\n');
        break;
      default:
        appHandler(req, res);
        break;
    }
    
    // Log response time and record metrics
    const responseTime = Date.now() - startTime;
    metricsCollector.recordRequest(responseTime);
    performanceMonitor.recordRequest(responseTime, false);
    console.log(`[${new Date().toISOString()}] ${requestId} completed in ${responseTime}ms`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ${requestId} Error:`, error);
    
    // Record error in performance monitoring
    const responseTime = Date.now() - startTime;
    performanceMonitor.recordRequest(responseTime, true);
    
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Internal Server Error',
        requestId: requestId,
        timestamp: new Date().toISOString()
      }));
    }
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Must Be Viral V2 running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  console.log(`📈 Metrics: http://${HOST}:${PORT}/metrics`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
