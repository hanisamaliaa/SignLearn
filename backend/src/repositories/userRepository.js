import { query } from "../config/database.js";

/**
 * Repository pengguna — satu-satunya lapisan yang mengetahui nama kolom SQL.
 *
 * Service dan controller bekerja dengan objek camelCase; pemetaan terjadi di
 * sini (API Contract §2.5). Seluruh query BERPARAMETER — tidak pernah ada
 * interpolasi string ke dalam SQL.
 */

const USER_COLUMNS = `
  u.id, u.name, u.email, u.phone, u.avatar, u.profile, u.status,
  u.failed_login_attempts, u.locked_until,
  u.join_date, u.created_at, u.updated_at,
  r.name AS role
`;

/**
 * Memetakan baris DB ke DTO API.
 *
 * `id` dikembalikan sebagai STRING: BIGINT Postgres melebihi
 * `Number.MAX_SAFE_INTEGER`, dan mengubahnya menjadi number akan membulatkan
 * diam-diam sehingga dua pengguna berbeda dapat berakhir dengan id yang sama.
 *
 * `passwordHash` TIDAK PERNAH ikut. Ia hanya dikembalikan oleh
 * `findByEmailWithSecret`, yang namanya sengaja dibuat mencolok.
 */
export function toUserDto(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone ?? null,
    avatar: row.avatar ?? null,
    profile: row.profile,
    status: row.status,
    joinDate: row.join_date
      ? new Date(row.join_date).toISOString().slice(0, 10)
      : null,
    createdAt: row.created_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}

/**
 * Mengambil pengguna BESERTA hash kata sandi dan status penguncian.
 *
 * Hanya untuk alur login. Namanya panjang dan eksplisit supaya tidak ada yang
 * memakainya secara tidak sengaja lalu membocorkan hash ke respons API.
 */
export async function findByEmailWithSecret(email) {
  const { rows } = await query(
    `SELECT ${USER_COLUMNS}, u.password_hash
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1`,
    [email],
  );
  if (!rows[0]) return null;

  return {
    ...toUserDto(rows[0]),
    passwordHash: rows[0].password_hash,
    failedLoginAttempts: rows[0].failed_login_attempts,
    lockedUntil: rows[0].locked_until,
  };
}

export async function findById(id) {
  const { rows } = await query(
    `SELECT ${USER_COLUMNS}
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      LIMIT 1`,
    [id],
  );
  return toUserDto(rows[0]);
}

export async function findByIdWithSecret(id) {
  const { rows } = await query(
    `SELECT ${USER_COLUMNS}, u.password_hash
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      LIMIT 1`,
    [id],
  );
  if (!rows[0]) return null;
  return { ...toUserDto(rows[0]), passwordHash: rows[0].password_hash };
}

export async function emailExists(email) {
  const { rows } = await query(
    `SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email],
  );
  return rows.length > 0;
}

/**
 * Membuat pengguna baru.
 *
 * `role` di-resolve lewat sub-select ke tabel roles, sehingga peran yang
 * tidak dikenal menghasilkan pelanggaran NOT NULL alih-alih membuat pengguna
 * tanpa peran.
 */
export async function create({ name, email, passwordHash, profile = "general", role = "user" }) {
  const { rows } = await query(
    `INSERT INTO users (role_id, name, email, password_hash, profile)
     VALUES ((SELECT id FROM roles WHERE name = $1), $2, LOWER($3), $4, $5)
     RETURNING id`,
    [role, name.trim(), email.trim(), passwordHash, profile],
  );
  return findById(rows[0].id);
}

export async function updatePassword(userId, passwordHash) {
  await query(
    `UPDATE users
        SET password_hash = $2,
            failed_login_attempts = 0,
            locked_until = NULL
      WHERE id = $1`,
    [userId, passwordHash],
  );
}

/**
 * Menaikkan penghitung gagal login, mengunci akun bila melewati ambang.
 *
 * Dilakukan dalam SATU pernyataan agar aman terhadap balapan: dua percobaan
 * bersamaan tidak dapat sama-sama membaca nilai lama lalu menulis nilai yang
 * sama, yang akan membuat penghitung selalu tertinggal.
 */
export async function registerFailedLogin(userId, maxAttempts, lockoutMinutes) {
  const { rows } = await query(
    `UPDATE users
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE
              WHEN failed_login_attempts + 1 >= $2
              THEN NOW() + ($3 || ' minutes')::INTERVAL
              ELSE locked_until
            END
      WHERE id = $1
      RETURNING failed_login_attempts, locked_until`,
    [userId, maxAttempts, String(lockoutMinutes)],
  );
  return rows[0] ?? null;
}

export async function clearFailedLogins(userId) {
  await query(
    `UPDATE users
        SET failed_login_attempts = 0, locked_until = NULL
      WHERE id = $1 AND (failed_login_attempts > 0 OR locked_until IS NOT NULL)`,
    [userId],
  );
}

export async function updateProfile(userId, fields) {
  // Allowlist. Field di luar daftar ini diabaikan diam-diam, sehingga klien
  // tidak dapat menaikkan perannya sendiri lewat mass assignment.
  const allowed = ["name", "phone", "avatar", "profile"];
  const sets = [];
  const values = [userId];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      values.push(fields[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }

  if (sets.length === 0) return findById(userId);

  await query(`UPDATE users SET ${sets.join(", ")} WHERE id = $1`, values);
  return findById(userId);
}
