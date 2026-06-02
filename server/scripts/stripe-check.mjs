/**
 * Quick Stripe test-key check — run: npm run stripe:check
 */
import "../config/env.js";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error("STRIPE_SECRET_KEY missing in .env");
  process.exit(1);
}
if (!key.startsWith("sk_test_")) {
  console.warn("Warning: not a sk_test_ key — use test keys for local QA");
}

const stripe = new Stripe(key);
try {
  const account = await stripe.accounts.retrieve();
  console.log("Stripe connected:", account.id);
  console.log("Mode: test");
  console.log("Publishable key set:", Boolean(process.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim()));
  console.log("Business name env:", process.env.STRIPE_BUSINESS_NAME || "(default Insidr)");
  console.log("API port:", process.env.PORT || "3001");
  console.log("Frontend:", process.env.FRONTEND_URL || "http://localhost:5173");
  console.log("\nNext: npm run dev:all → Plans → Start 7-day free trial");
  console.log("Card: 4242 4242 4242 4242 · any future expiry · any CVC");
} catch (err) {
  console.error("Stripe error:", err.message);
  process.exit(1);
}
