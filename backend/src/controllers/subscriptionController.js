import { asyncHandler } from "../utils/asyncHandler.js";
import { success, created } from "../utils/apiResponse.js";
import * as service from "../services/subscriptionService.js";

export const mine = asyncHandler(async (req, res) =>
  success(res, await service.getMine(req.user.id)));

export const checkout = asyncHandler(async (req, res) =>
  created(
    res,
    { checkout: await service.checkout(req.user, req.body.planId) },
    "Checkout dibuat.",
  ));

export const history = asyncHandler(async (req, res) =>
  success(res, { items: await service.history(req.user.id) }));

export const paymentStatus = asyncHandler(async (req, res) =>
  success(res, await service.paymentStatus(req.user.id, req.params.orderId)));

export const confirmMockPayment = asyncHandler(async (req, res) =>
  success(
    res,
    await service.confirmMockPayment(req.user.id, req.params.orderId, req.body.action),
    "Simulasi pembayaran diproses.",
  ));

export const webhook = asyncHandler(async (req, res) =>
  success(res, await service.webhook(req.body), "Notifikasi pembayaran diproses."));

export const adminSubscriptions = asyncHandler(async (_req, res) =>
  success(res, { items: await service.adminSubscriptions() }));

export const adminPayments = asyncHandler(async (_req, res) =>
  success(res, { items: await service.adminPayments() }));
