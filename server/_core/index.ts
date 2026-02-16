import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerSimpleAuthRoutes } from "./simpleAuthRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import webhookRouter from "../webhook";
import audioRouter from "../audioServer";
import path from "path";
import { initQueueProcessor } from "../queueProcessor";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Simple auth routes under /api/auth
  registerSimpleAuthRoutes(app);
  // Webhook endpoint for ElevenLabs
  app.use("/api/webhook", webhookRouter);
  // Audio streaming endpoint
  app.use("/api/audio", audioRouter);
  
  // Serve recordings directory
  app.use("/recordings", express.static("recordings"));
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is unavailable, using ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Initialize queue processor
    const apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (apiKey) {
      const processor = initQueueProcessor(apiKey);
      processor.start();
      console.log('[QueueProcessor] Initialized and started');
    } else {
      console.warn('[QueueProcessor] ELEVENLABS_API_KEY not set, queue processor not started');
    }
    
    // Start 3CX-based queue manager if configured
    const tcxApiUrl = process.env.TCX_API_URL || '';
    const tcxApiKey = process.env.TCX_API_KEY || '';
    if (tcxApiUrl && tcxApiKey) {
      import('../services/tcx-queue-manager').then(({ tcxQueueManager }) => {
        tcxQueueManager.start();
        console.log('[3CX] Queue manager started with automatic operator monitoring');
      }).catch(err => {
        console.error('[3CX] Failed to start queue manager:', err.message);
      });
    } else {
      console.warn('[3CX] TCX_API_URL or TCX_API_KEY not set, 3CX integration disabled');
    }
    
    // Start call monitoring for Telegram notifications
    if (apiKey) {
      import('../services/call-monitor').then(({ startCallMonitoring }) => {
        startCallMonitoring(apiKey, 30000); // Check every 30 seconds
        console.log('[CallMonitor] Started monitoring for completed calls');
      }).catch(err => {
        console.error('[CallMonitor] Failed to start:', err.message);
      });
    }
  });
}

startServer().catch(console.error);
