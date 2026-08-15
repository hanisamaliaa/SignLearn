import { Router } from "express";
import * as controller from "../controllers/translationController.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  validateCreateTranslation,
  validateUpdateTranslation,
  validateTranslationQuery,
  validateLookup,
} from "../validators/translationValidator.js";

const router = Router();

router.get("/lookup", validate(validateLookup), controller.lookup);
router.get("/categories", optionalAuthenticate, controller.categories);
router.get("/", optionalAuthenticate, validate(validateTranslationQuery), controller.list);
router.get("/:id", optionalAuthenticate, controller.getById);
router.post("/", authenticate, requireAdmin, validate(validateCreateTranslation), controller.createItem);
router.put("/:id", authenticate, requireAdmin, validate(validateUpdateTranslation), controller.updateItem);
router.delete("/:id", authenticate, requireAdmin, controller.deleteItem);

export default router;
