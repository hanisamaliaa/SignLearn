import { request } from "./api";
export const getSubscription=()=>request({url:"/subscription/me"});
export const checkout=(planId)=>request({method:"post",url:"/subscription/checkout",data:{planId}});
export const getPaymentHistory=()=>request({url:"/subscription/payment-history"});
export const getPaymentStatus=(orderId)=>request({url:`/subscription/payments/${encodeURIComponent(orderId)}`});
export const confirmPayment=(orderId,action)=>request({method:"post",url:`/subscription/payments/${encodeURIComponent(orderId)}/confirm`,data:{action}});
export const adminGetSubscriptions=()=>request({url:"/admin/subscriptions"});
export const adminGetPayments=()=>request({url:"/admin/payments"});
