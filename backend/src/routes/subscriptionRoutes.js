import { Router } from "express";
import * as controller from "../controllers/subscriptionController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin, requireUser } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { paymentCheckoutLimiter } from "../middleware/rateLimit.middleware.js";
import { validateCheckout, validateMockPayment } from "../validators/subscriptionValidator.js";

export const subscriptionRoutes = Router();
subscriptionRoutes.use(authenticate, requireUser);
subscriptionRoutes.get("/me", controller.mine);
subscriptionRoutes.post(
  "/checkout",
  paymentCheckoutLimiter,
  validate(validateCheckout),
  controller.checkout,
);
subscriptionRoutes.get("/payment-history", controller.history);
subscriptionRoutes.get("/payments/:orderId", controller.paymentStatus);
subscriptionRoutes.post(
  "/payments/:orderId/mock-confirm",
  paymentCheckoutLimiter,
  validate(validateMockPayment),
  controller.confirmMockPayment,
);

export const paymentRoutes = Router();
paymentRoutes.post("/midtrans/webhook", controller.webhook);

export const subscriptionAdminRoutes = Router();
subscriptionAdminRoutes.use(authenticate, requireAdmin);
subscriptionAdminRoutes.get("/subscriptions", controller.adminSubscriptions);
subscriptionAdminRoutes.get("/payments", controller.adminPayments);
