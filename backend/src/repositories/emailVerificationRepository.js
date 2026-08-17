import { query } from "../config/database.js";

const runner = (client) => (client ? client.query.bind(client) : query);

export async function insert({ userId, tokenHash, expiresAt }, client) {
  const { rows } = await runner(client)(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, tokenHash, expiresAt],
  );
  return String(rows[0].id);
}

export async function findActiveForUser(userId, client) {
  const { rows } = await runner(client)(
    `SELECT id, user_id, token_hash, attempts, expires_at, created_at
       FROM email_verification_tokens
      WHERE user_id = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY id DESC
      LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  return row
    ? {
        id: String(row.id),
        userId: String(row.user_id),
        tokenHash: row.token_hash,
        attempts: Number(row.attempts),
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      }
    : null;
}

export async function latestForUser(userId, client) {
  const { rows } = await runner(client)(
    `SELECT created_at
       FROM email_verification_tokens
      WHERE user_id = $1
      ORDER BY id DESC
      LIMIT 1`,
    [userId],
  );
  return rows[0]?.created_at ?? null;
}

export async function invalidateForUser(userId, client) {
  await runner(client)(
    `UPDATE email_verification_tokens
        SET used_at = NOW()
      WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );
}

export async function registerFailedAttempt(id, maxAttempts) {
  const { rows } = await query(
    `UPDATE email_verification_tokens
        SET attempts = attempts + 1,
            used_at = CASE WHEN attempts + 1 >= $2 THEN NOW() ELSE used_at END
      WHERE id = $1
      RETURNING attempts, used_at`,
    [id, maxAttempts],
  );
  return {
    attempts: Number(rows[0]?.attempts ?? 0),
    burned: Boolean(rows[0]?.used_at),
  };
}

export async function consume(id, userId, client) {
  const { rowCount } = await runner(client)(
    `UPDATE email_verification_tokens
        SET used_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND used_at IS NULL
        AND expires_at > NOW()`,
    [id, userId],
  );
  return rowCount === 1;
}
