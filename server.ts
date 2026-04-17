import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
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
    const stripe = stripeKey ? new Stripe(stripeKey) : null;

    // Mock mode for demo purposes if Stripe is not configured
    if (!stripe) {
      console.warn("Stripe is not configured. Using mock mode for demo.");
      return res.json({ 
        clientSecret: "mock_secret_" + Math.random().toString(36).substring(7),
        isMock: true 
      });
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe expects amount in cents/paise
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

  // Vite middleware for development
  // Default to production if NODE_ENV is not explicitly set to something else
  const isDev = process.env.NODE_ENV === "development" || (!process.env.NODE_ENV && process.env.VITE_DEV === "true");
  
  if (isDev) {
    console.log("Starting in DEVELOPMENT mode");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode");
    const distPath = __dirname;
    console.log(`Serving static files from: ${distPath}`);
    
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
