import { ApiError } from "../utils/ApiError.js";
import { activeSubscription } from "../repositories/subscriptionRepository.js";
export async function requirePremium(req,_res,next){try{const subscription=await activeSubscription(req.user.id);if(!subscription)return next(ApiError.forbidden("Langganan Premium aktif diperlukan."));req.subscription=subscription;return next();}catch(error){return next(error);}}
export async function requirePremiumOrAdmin(req,res,next){if(req.user?.role==="admin")return next();return requirePremium(req,res,next);}
