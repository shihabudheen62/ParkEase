import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import Stripe from "stripe";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // PORT MUST be 3000 as per environment constraints
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Stripe PaymentIntent route
  app.post("/api/create-payment-intent", async (req, res) => {
    const { amount, currency = "inr" } = req.body;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    // Lazy initialization of Stripe
    let stripe = null;
    if (stripeKey) {
      try {
        stripe = new Stripe(stripeKey);
      } catch (err) {
        console.error("Failed to initialize Stripe:", err);
      }
    }

    if (!stripe) {
      console.warn("Stripe is not configured or failed to initialize. Using mock mode for demo.");
      return res.json({ 
        clientSecret: "mock_secret_" + Math.random().toString(36).substring(7),
        isMock: true 
      });
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret, isMock: false });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Determine mode
  const isProd = process.env.NODE_ENV === "production";
  const isDev = !isProd && (process.env.NODE_ENV === "development" || process.env.VITE_DEV === "true");
  
  if (isDev) {
    console.log("Starting in DEVELOPMENT mode");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("Failed to load Vite dev server:", e);
      process.exit(1);
    }
  } else {
    console.log("Starting in PRODUCTION mode");
    
    // Robust path detection
    // If bundled into dist/server.js, __dirname is root/dist
    // If running server.ts directly, __dirname is root/
    const currentDir = __dirname;
    const isInsideDist = path.basename(currentDir) === "dist";
    
    const rootPath = isInsideDist ? path.resolve(currentDir, "..") : currentDir;
    const distPath = isInsideDist ? currentDir : path.resolve(currentDir, "dist");
    const indexPath = path.resolve(distPath, "index.html");
    const imgPath = path.resolve(rootPath, "img");
    
    console.log(`Current directory: ${process.cwd()}`);
    console.log(`__dirname: ${currentDir}`);
    console.log(`rootPath: ${rootPath}`);
    console.log(`distPath: ${distPath}`);
    console.log(`indexPath: ${indexPath}`);
    
    if (!fs.existsSync(distPath)) {
      console.warn(`WARNING: dist directory not found at ${distPath}`);
      // List root directory to see what's there
      console.log("Root directory contents:", fs.readdirSync(rootPath));
    }
    
    if (!fs.existsSync(indexPath)) {
      console.warn(`WARNING: index.html not found at ${indexPath}`);
      if (fs.existsSync(distPath)) {
        console.log("Dist directory contents:", fs.readdirSync(distPath));
      }
    }
    
    // Serve static assets from dist
    app.use(express.static(distPath, { index: false }));
    
    // Serve img folder from root if it exists
    if (fs.existsSync(imgPath)) {
      console.log(`Serving images from: ${imgPath}`);
      app.use("/img", express.static(imgPath));
    }
    
    // SPA fallback
    app.get('*', (req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application build files not found. Please ensure the build process completed successfully.");
      }
    });
  }

  // Always bind to 0.0.0.0 for Cloud Run
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
  });
}

startServer().catch((error) => {
  console.error("CRITICAL: Failed to start server:", error);
  process.exit(1);
});
