/**
 * Checkout routes construct the official Stripe SDK with STRIPE_SECRET_KEY.
 * This file used to forward Stripe calls, including webhook creation, through
 * an external project host. SeedFeast no longer does that.
 */
export { default } from "stripe";
export { default as Stripe } from "stripe";
