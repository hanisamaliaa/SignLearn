import crypto from "node:crypto";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import * as repo from "../repositories/subscriptionRepository.js";

const authHeader=()=>`Basic ${Buffer.from(`${env.midtrans.serverKey}:`).toString("base64")}`;
const apiBase=()=>env.midtrans.isProduction?"https://api.midtrans.com":"https://api.sandbox.midtrans.com";

export async function getMine(userId){return{...(await repo.subscriptionMe(userId)),paymentConfigured:Boolean(env.midtrans.serverKey),paymentEnvironment:env.midtrans.isProduction?"production":"sandbox"};}
export const history=(userId)=>repo.paymentHistory(userId);
export const adminSubscriptions=()=>repo.adminSubscriptions();
export const adminPayments=()=>repo.adminPayments();

export async function checkout(user,planId){
  if(!env.midtrans.serverKey) throw new ApiError(503,"Pembayaran Midtrans belum dikonfigurasi.");
  const orderId=`SL-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const pending=await repo.createPendingPayment(user.id,planId,orderId);
  if(!pending) throw ApiError.notFound("Paket Premium tidak ditemukan.");
  const endpoint=env.midtrans.isProduction?"https://app.midtrans.com/snap/v1/transactions":"https://app.sandbox.midtrans.com/snap/v1/transactions";
  const response=await fetch(endpoint,{method:"POST",headers:{Authorization:authHeader(),"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({transaction_details:{order_id:orderId,gross_amount:pending.amount},customer_details:{first_name:user.name??"Pengguna SignLearn",email:user.email},item_details:[{id:String(pending.plan.id),price:pending.amount,quantity:1,name:`SignLearn Premium ${pending.plan.duration_days} hari`}],callbacks:{finish:`${env.frontendUrl}/premium/payment?order_id=${encodeURIComponent(orderId)}`}})});
  if(!response.ok) throw new ApiError(502,"Midtrans sedang tidak tersedia. Coba lagi nanti.");
  const snap=await response.json(); await repo.saveSnap(orderId,snap.token,snap.redirect_url);
  return {orderId,snapToken:snap.token,redirectUrl:snap.redirect_url};
}

async function verifyOrder(orderId){
  const response=await fetch(`${apiBase()}/v2/${encodeURIComponent(orderId)}/status`,{headers:{Authorization:authHeader(),Accept:"application/json"}});
  if(!response.ok) throw new ApiError(502,"Status pembayaran belum dapat diverifikasi ke Midtrans.");
  return response.json();
}

export async function paymentStatus(userId,orderId){
  let payment=await repo.findUserPayment(userId,orderId); if(!payment) throw ApiError.notFound("Transaksi tidak ditemukan.");
  if(payment.status==="pending" && env.midtrans.serverKey){const result=await repo.processNotification(await verifyOrder(orderId));if(result?.amountMismatch)throw ApiError.conflict("Nominal transaksi tidak cocok.");payment=await repo.findUserPayment(userId,orderId);}
  return {payment,subscription:await repo.subscriptionMe(userId)};
}

export async function webhook(body){
  const expected=crypto.createHash("sha512").update(`${body.order_id}${body.status_code}${body.gross_amount}${env.midtrans.serverKey}`).digest("hex");
  const received=String(body.signature_key??"");
  if(!env.midtrans.serverKey||received.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(received),Buffer.from(expected))) throw ApiError.unauthorized("Signature Midtrans tidak valid.");
  const verified=await verifyOrder(body.order_id); const result=await repo.processNotification(verified);
  if(!result) throw ApiError.notFound("Order pembayaran tidak ditemukan.");
  if(result.amountMismatch) throw ApiError.conflict("Nominal transaksi tidak cocok.");
  return result;
}
