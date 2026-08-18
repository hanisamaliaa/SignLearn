import { query, withTransaction } from "../config/database.js";
import {
  buildExtensionPolicy,
  MILLISECONDS_PER_DAY,
  PREMIUM_MAX_ADVANCE_DAYS,
  PREMIUM_EXTENSION_TOLERANCE_MS,
} from "../constants/subscription.js";

const iso = (value) => value?.toISOString?.() ?? value ?? null;

export async function activeSubscription(userId, client = { query }) {
  await client.query(
    "UPDATE subscriptions SET status='expired' WHERE user_id=$1 AND status='active' AND end_date<=NOW()",
    [userId],
  );
  const { rows } = await client.query(
    `SELECT s.*, p.name plan_name, p.price, p.duration_days
       FROM subscriptions s JOIN subscription_plans p ON p.id=s.plan_id
      WHERE s.user_id=$1 AND s.status='active' AND s.end_date>NOW()
      ORDER BY s.end_date DESC LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  return row ? {
    id: String(row.id), plan: row.plan_name, status: row.status,
    startDate: iso(row.start_date), endDate: iso(row.end_date),
    price: Number(row.price), durationDays: Number(row.duration_days),
  } : null;
}

export async function subscriptionMe(userId) {
  const active = await activeSubscription(userId);
  const { rows } = await query(
    "SELECT id,name,price,duration_days FROM subscription_plans WHERE status='active' ORDER BY price",
  );
  const plans = rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    price: Number(row.price),
    durationDays: Number(row.duration_days),
  }));
  return {
    isPremium: Boolean(active), subscription: active,
    plans,
    extensionPolicy: buildExtensionPolicy(active, plans),
  };
}

export async function createPendingPayment(userId, planId, orderId, provider) {
  return withTransaction(async (client) => {
    // Seluruh checkout pengguna diserialisasi agar dua tab tidak dapat
    // melewati batas masa aktif secara bersamaan.
    const owner = await client.query(
      "SELECT id FROM users WHERE id=$1 FOR UPDATE",
      [userId],
    );
    if (!owner.rowCount) return null;

    const plan = await client.query(
      "SELECT * FROM subscription_plans WHERE id=$1 AND status='active' FOR UPDATE",
      [planId],
    );
    if (!plan.rowCount) return null;

    // Checkout lama tidak boleh memblokir akun selamanya. Order internal yang
    // tidak diselesaikan dalam 30 menit ditutup sebelum membuat order baru.
    const stale = await client.query(
      `UPDATE payments
          SET transaction_status='expired', processed_at=NOW()
        WHERE user_id=$1 AND transaction_status='pending'
          AND created_at < NOW() - INTERVAL '30 minutes'
        RETURNING subscription_id`,
      [userId],
    );
    if (stale.rowCount) {
      await client.query(
        "UPDATE subscriptions SET status='expired' WHERE id=ANY($1::bigint[]) AND status='pending'",
        [stale.rows.map((row) => row.subscription_id)],
      );
    }

    const pending = await client.query(
      `SELECT order_id FROM payments
        WHERE user_id=$1 AND transaction_status='pending'
        ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    if (pending.rowCount) {
      return { pendingExists: true, orderId: pending.rows[0].order_id };
    }

    const current = await activeSubscription(userId, client);
    const nowMs = Date.now();
    const startMs = Math.max(nowMs, current?.endDate ? Date.parse(current.endDate) : nowMs);
    const projectedEndMs = startMs + Number(plan.rows[0].duration_days) * MILLISECONDS_PER_DAY;
    const maxEndMs = nowMs + PREMIUM_MAX_ADVANCE_DAYS * MILLISECONDS_PER_DAY;
    if (projectedEndMs > maxEndMs + PREMIUM_EXTENSION_TOLERANCE_MS) {
      return {
        limitExceeded: true,
        maxAdvanceDays: PREMIUM_MAX_ADVANCE_DAYS,
        currentEndDate: current?.endDate ?? null,
      };
    }

    const subscription = await client.query(
      "INSERT INTO subscriptions(user_id,plan_id,status) VALUES($1,$2,'pending') RETURNING id",
      [userId, planId],
    );
    const payment = await client.query(
      `INSERT INTO payments(user_id,subscription_id,order_id,amount,provider)
       VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [userId, subscription.rows[0].id, orderId, plan.rows[0].price, provider],
    );
    return { id: String(payment.rows[0].id), amount: Number(plan.rows[0].price), plan: plan.rows[0] };
  });
}

export const saveSnap = (orderId, token, redirectUrl) =>
  query("UPDATE payments SET snap_token=$2,redirect_url=$3 WHERE order_id=$1", [orderId, token, redirectUrl]);

export async function paymentHistory(userId) {
  const { rows } = await query(
    `SELECT pay.*,p.name plan_name FROM payments pay
       JOIN subscriptions s ON s.id=pay.subscription_id JOIN subscription_plans p ON p.id=s.plan_id
      WHERE pay.user_id=$1 ORDER BY pay.created_at DESC`,
    [userId],
  );
  return rows.map((row) => ({ id:String(row.id), orderId:row.order_id, plan:row.plan_name,
    amount:Number(row.amount), paymentMethod:row.payment_method, status:row.transaction_status,
    provider:row.provider, paidAt:iso(row.paid_at), createdAt:iso(row.created_at), redirectUrl:row.redirect_url }));
}

export async function findUserPayment(userId, orderId) {
  const { rows } = await query(
    `SELECT pay.*,p.name plan_name FROM payments pay
       JOIN subscriptions s ON s.id=pay.subscription_id JOIN subscription_plans p ON p.id=s.plan_id
      WHERE pay.user_id=$1 AND pay.order_id=$2 LIMIT 1`,
    [userId, orderId],
  );
  const row=rows[0];
  return row ? { id:String(row.id),orderId:row.order_id,plan:row.plan_name,amount:Number(row.amount),
    paymentMethod:row.payment_method,status:row.transaction_status,paidAt:iso(row.paid_at),
    provider:row.provider,createdAt:iso(row.created_at),redirectUrl:row.redirect_url } : null;
}

export async function markCheckoutFailed(orderId, reason) {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE payments
          SET transaction_status='failed', processed_at=NOW(), raw_notification=$2
        WHERE order_id=$1 AND transaction_status='pending'
        RETURNING subscription_id`,
      [orderId, { reason }],
    );
    if (rows[0]) {
      await client.query(
        "UPDATE subscriptions SET status='cancelled' WHERE id=$1 AND status='pending'",
        [rows[0].subscription_id],
      );
    }
  });
}

export async function processNotification(notification) {
  return withTransaction(async (client) => {
    const found = await client.query(
      `SELECT pay.*,s.plan_id,p.duration_days FROM payments pay
       JOIN subscriptions s ON s.id=pay.subscription_id JOIN subscription_plans p ON p.id=s.plan_id
       WHERE pay.order_id=$1 FOR UPDATE OF pay`, [notification.order_id],
    );
    if (!found.rowCount) return null;
    const payment=found.rows[0];
    // Order mock hanya boleh berpindah dari pending ke satu status terminal.
    // Tanpa guard di dalam lock ini, dua request complete/cancel yang datang
    // bersamaan dapat saling menimpa walaupun pengecekan awal service benar.
    if (payment.provider === "mock" && payment.transaction_status !== "pending") {
      return {
        duplicate: true,
        activated: payment.transaction_status === "paid",
        status: payment.transaction_status,
      };
    }
    if (Math.round(Number(notification.gross_amount)) !== Math.round(Number(payment.amount))) return { amountMismatch:true };
    const paid=notification.transaction_status==="settlement" || (notification.transaction_status==="capture" && notification.fraud_status==="accept");
    const mapped=paid?"paid":({pending:"pending",expire:"expired",cancel:"cancelled",deny:"failed",failure:"failed",refund:"refunded"}[notification.transaction_status]??"failed");
    if (payment.processed_at && payment.transaction_status==="paid") return {duplicate:true,activated:true,status:"paid"};
    await client.query(
      `UPDATE payments SET transaction_status=$2,payment_method=$3,transaction_id=$4,
       paid_at=CASE WHEN $5 THEN COALESCE(paid_at,NOW()) ELSE paid_at END,processed_at=NOW(),raw_notification=$6 WHERE id=$1`,
      [payment.id,mapped,notification.payment_type,notification.transaction_id,paid,notification],
    );
    if (paid) {
      await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [payment.user_id]);
      const current=await activeSubscription(payment.user_id,client);
      const nowMs = Date.now();
      const startMs = Math.max(nowMs, current?.endDate ? Date.parse(current.endDate) : nowMs);
      const projectedEndMs = startMs + Number(payment.duration_days) * MILLISECONDS_PER_DAY;
      const maxEndMs = nowMs + PREMIUM_MAX_ADVANCE_DAYS * MILLISECONDS_PER_DAY;
      if (projectedEndMs > maxEndMs + PREMIUM_EXTENSION_TOLERANCE_MS) {
        await client.query(
          `UPDATE payments
              SET transaction_status='failed', processed_at=NOW(),
                  raw_notification=$2
            WHERE id=$1`,
          [payment.id, { ...notification, reason: "premium_extension_limit" }],
        );
        await client.query(
          "UPDATE subscriptions SET status='cancelled' WHERE id=$1",
          [payment.subscription_id],
        );
        return {
          duplicate: false,
          activated: false,
          status: "failed",
          limitExceeded: true,
          maxAdvanceDays: PREMIUM_MAX_ADVANCE_DAYS,
        };
      }
      const start=new Date(startMs).toISOString();
      await client.query(
        `UPDATE subscriptions SET status='active',start_date=$2::timestamptz,
         end_date=$2::timestamptz+($3||' days')::interval WHERE id=$1`,
        [payment.subscription_id,start,payment.duration_days],
      );
    } else if (["expired","cancelled","failed"].includes(mapped)) {
      await client.query("UPDATE subscriptions SET status=$2 WHERE id=$1",[payment.subscription_id,mapped==="expired"?"expired":"cancelled"]);
    }
    return {duplicate:false,activated:paid,status:mapped};
  });
}

export async function adminSubscriptions() {
  const {rows}=await query(`SELECT s.*,u.name user_name,u.email,p.name plan_name FROM subscriptions s JOIN users u ON u.id=s.user_id JOIN subscription_plans p ON p.id=s.plan_id ORDER BY s.created_at DESC`);
  return rows.map(r=>({id:String(r.id),user:{name:r.user_name,email:r.email},plan:r.plan_name,startDate:iso(r.start_date),endDate:iso(r.end_date),status:r.status}));
}

export async function adminPayments() {
  const {rows}=await query(`SELECT pay.*,u.name user_name,u.email,p.name plan_name FROM payments pay JOIN users u ON u.id=pay.user_id JOIN subscriptions s ON s.id=pay.subscription_id JOIN subscription_plans p ON p.id=s.plan_id ORDER BY pay.created_at DESC`);
  return rows.map(r=>({id:String(r.id),orderId:r.order_id,user:{name:r.user_name,email:r.email},plan:r.plan_name,amount:Number(r.amount),provider:r.provider,paymentMethod:r.payment_method,status:r.transaction_status,createdAt:iso(r.created_at),paidAt:iso(r.paid_at)}));
}
