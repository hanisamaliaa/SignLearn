import { query } from "../config/database.js";

/**
 * Repository pengguna — satu-satunya lapisan yang mengetahui nama kolom SQL.
 *
 * Service dan controller bekerja dengan objek camelCase; pemetaan terjadi di
 * sini (API Contract §2.5). Seluruh query BERPARAMETER — tidak pernah ada
 * interpolasi string ke dalam SQL.
 */

const USER_COLUMNS = `
  u.id, u.name, u.email, u.phone, u.avatar, u.profile, u.status, u.auth_version,
  u.email_verified_at,
  u.failed_login_attempts, u.locked_until,
  u.join_date, u.created_at, u.updated_at,
  r.name AS role
`;

const ADMIN_SUBSCRIPTION_COLUMNS = `
  (SELECT MAX(s.end_date)
     FROM subscriptions s
    WHERE s.user_id = u.id
      AND s.status = 'active'
      AND s.end_date > NOW()) AS premium_until
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
  const dto = {
    id: String(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone ?? null,
    avatar: row.avatar ?? null,
    profile: row.profile,
    status: row.status,
    emailVerified: Boolean(row.email_verified_at),
    emailVerifiedAt: row.email_verified_at?.toISOString?.() ?? null,
    joinDate: row.join_date
      ? new Date(row.join_date).toISOString().slice(0, 10)
      : null,
    createdAt: row.created_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };

  if (Object.prototype.hasOwnProperty.call(row, "premium_until")) {
    dto.isPremium = Boolean(row.premium_until);
    dto.premiumUntil = row.premium_until?.toISOString?.() ?? null;
  }

  // Diperlukan untuk menandatangani JWT dan sengaja non-enumerable agar tidak
  // menjadi bagian dari kontrak atau respons JSON pengguna.
  Object.defineProperty(dto, "authVersion", {
    value: Number(row.auth_version ?? 0),
    enumerable: false,
  });

  return dto;
}

/**
 * Mengambil pengguna BESERTA hash kata sandi dan status penguncian.
 *
 * Hanya untuk alur login. Namanya panjang dan eksplisit supaya tidak ada yang
 * memakainya secara tidak sengaja lalu membocorkan hash ke respons API.
 */
export async function findByEmailWithSecret(email, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `SELECT ${USER_COLUMNS}, u.password_hash
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1`,
    [email],
  );
  if (!rows[0]) return null;

  const user = toUserDto(rows[0]);
  user.passwordHash = rows[0].password_hash;
  user.failedLoginAttempts = rows[0].failed_login_attempts;
  user.lockedUntil = rows[0].locked_until;
  return user;
}

export async function findById(id, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `SELECT ${USER_COLUMNS}, ${ADMIN_SUBSCRIPTION_COLUMNS}
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      LIMIT 1`,
    [id],
  );
  return toUserDto(rows[0]);
}

/**
 * Status autentikasi terkini untuk middleware pada setiap request terlindungi.
 * Query ini sengaja ramping: middleware tidak memerlukan profil lengkap.
 */
export async function findAuthStateById(id) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.status, u.auth_version, u.email_verified_at, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      LIMIT 1`,
    [id],
  );
  const row = rows[0];
  return row
    ? {
        id: String(row.id),
        email: row.email,
        role: row.role,
        status: row.status,
        authVersion: Number(row.auth_version ?? 0),
        emailVerified: Boolean(row.email_verified_at),
      }
    : null;
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
  const user = toUserDto(rows[0]);
  user.passwordHash = rows[0].password_hash;
  return user;
}

export async function emailExists(email, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
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
export async function create(
  { name, email, passwordHash, profile = "general", role = "user" },
  client,
) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `INSERT INTO users (role_id, name, email, password_hash, profile)
     VALUES ((SELECT id FROM roles WHERE name = $1), $2, LOWER($3), $4, $5)
     RETURNING id`,
    [role, name.trim(), email.trim(), passwordHash, profile],
  );
  return findById(rows[0].id, client);
}

export async function markEmailVerified(userId, client) {
  const run = client ? client.query.bind(client) : query;
  const { rowCount } = await run(
    `UPDATE users
        SET email_verified_at = COALESCE(email_verified_at, NOW()),
            updated_at = NOW()
      WHERE id = $1`,
    [userId],
  );
  return rowCount === 1;
}

/**
 * Mengganti kata sandi, sekaligus membuka kunci akun.
 *
 * `client` OPSIONAL — bila diberikan, query berjalan pada koneksi transaksi
 * itu; bila tidak, pada pool. Konvensi yang sama dipakai
 * `refreshTokenRepository` dan `passwordResetRepository`.
 *
 * ── Kenapa parameter ini penting ──────────────────────────────────────
 *
 * `authService.resetPassword` membungkus fungsi ini dan `resetRepo.consume`
 * dalam satu `withTransaction`. Selama fungsi ini mengabaikan `client`, ia
 * berjalan di koneksi LAIN dari pool — di luar transaksi. Transaksinya tetap
 * ada, tetapi tidak memuat apa yang dikira: bila `consume` gagal, ROLLBACK
 * hanya membatalkan penandaan token, sementara kata sandi sudah terlanjur
 * berubah. Pengguna berakhir dengan kata sandi baru DAN token reset yang
 * masih sah untuk dipakai ulang.
 *
 * Penghitung gagal login dan `locked_until` ikut direset: seseorang yang baru
 * saja mereset kata sandinya karena lupa hampir pasti sudah salah beberapa
 * kali sebelum itu, dan membiarkannya tetap terkunci membuat reset itu sia-sia.
 */
export async function updatePassword(userId, passwordHash, client) {
  const run = client ? client.query.bind(client) : query;
  const { rowCount } = await run(
    `UPDATE users
        SET password_hash = $2,
            failed_login_attempts = 0,
            locked_until = NULL,
            auth_version = auth_version + 1,
            updated_at = NOW()
      WHERE id = $1
      RETURNING id`,
    [userId, passwordHash],
  );
  return rowCount === 1;
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
      values.push(key === "name" ? String(fields[key]).trim() : fields[key]);
      sets.push(`${key} = $${values.length}`);
      if (key === "avatar") sets.push("avatar_public_id = NULL");
    }
  }

  if (sets.length === 0) return findById(userId);

  await query(`UPDATE users SET ${sets.join(", ")} WHERE id = $1`, values);
  return findById(userId);
}

export async function findAvatarMedia(userId) {
  const { rows } = await query(
    "SELECT avatar, avatar_public_id FROM users WHERE id = $1 LIMIT 1",
    [userId],
  );
  if (!rows[0]) return null;
  return { url: rows[0].avatar ?? null, publicId: rows[0].avatar_public_id ?? null };
}

export async function updateAvatarMedia(userId, url, publicId, expectedPublicId) {
  const { rowCount } = await query(
    `UPDATE users
        SET avatar = $2, avatar_public_id = $3
      WHERE id = $1 AND avatar_public_id IS NOT DISTINCT FROM $4`,
    [userId, url, publicId, expectedPublicId],
  );
  return rowCount > 0 ? findById(userId) : null;
}

// ─── Administrasi pengguna (API Contract §7.3-7.6) ───────────────────────

/**
 * Allowlist kolom pengurutan.
 *
 * `sortBy` TIDAK PERNAH diinterpolasi langsung ke SQL. Kunci dari klien
 * dicocokkan ke peta ini; yang tidak cocok tidak pernah sampai ke query.
 * Tanpa ini, `?sortBy=` menjadi jalur SQL injection (API Contract §2.8).
 */
const SORTABLE = Object.freeze({
  name: "u.name",
  email: "u.email",
  joinDate: "u.join_date",
  createdAt: "u.created_at",
});

/** Membangun klausa WHERE + parameter dari filter listing. */
function buildFilters({ q, role, status }, startIndex = 1) {
  const clauses = [];
  const values = [];
  let i = startIndex;

  if (q && String(q).trim().length >= 2) {
    // `%` dan `_` adalah wildcard LIKE dan harus di-escape sebelum dibungkus
    // wildcard kita sendiri. Parameterisasi mencegah SQL injection, TIDAK
    // mencegah ini: mencari "100%" tanpa escape mengembalikan seluruh baris.
    const escaped = String(q).trim().replace(/[\\%_]/g, (ch) => `\\${ch}`);
    values.push(`%${escaped}%`);
    clauses.push(`(u.name ILIKE $${i} ESCAPE '\\' OR u.email ILIKE $${i} ESCAPE '\\')`);
    i++;
  }
  if (role) {
    values.push(role);
    clauses.push(`r.name = $${i++}`);
  }
  if (status) {
    values.push(status);
    clauses.push(`u.status = $${i++}`);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
    nextIndex: i,
  };
}

export async function count(filters = {}) {
  const { where, values } = buildFilters(filters);
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total
       FROM users u JOIN roles r ON r.id = u.role_id
       ${where}`,
    values,
  );
  return rows[0].total;
}

export async function findAll(
  filters = {},
  { limit = 20, offset = 0, sortBy = "createdAt", sortDir = "desc" } = {},
) {
  const column = SORTABLE[sortBy] ?? SORTABLE.createdAt;
  const direction = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

  const { where, values, nextIndex } = buildFilters(filters);
  values.push(limit, offset);

  const { rows } = await query(
    `SELECT ${USER_COLUMNS}, ${ADMIN_SUBSCRIPTION_COLUMNS}
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ${where}
      ORDER BY ${column} ${direction}, u.id ASC
      LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
    values,
  );
  return rows.map(toUserDto);
}

/**
 * Statistik belajar satu pengguna — §7.4.
 *
 * `lastActiveAt` mengambil yang paling baru di antara progres pelajaran dan
 * pengerjaan kuis. Memakai salah satunya saja membuat pengguna yang hanya
 * mengerjakan kuis terlihat tidak aktif sama sekali.
 */
export async function statsFor(userId) {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(DISTINCT l.course_id)::int
          FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
         WHERE lp.user_id = $1)                                   AS courses_started,
       (SELECT COUNT(*)::int FROM lesson_progress
         WHERE user_id = $1 AND status = 'completed')             AS lessons_completed,
       (SELECT COUNT(*)::int FROM quiz_results
         WHERE user_id = $1 AND passed)                           AS quizzes_passed,
       GREATEST(
         (SELECT MAX(updated_at) FROM lesson_progress WHERE user_id = $1),
         (SELECT MAX(taken_at)   FROM quiz_results    WHERE user_id = $1)
       )                                                          AS last_active`,
    [userId],
  );

  const r = rows[0];
  return {
    coursesStarted: Number(r.courses_started),
    lessonsCompleted: Number(r.lessons_completed),
    quizzesPassed: Number(r.quizzes_passed),
    lastActiveAt: r.last_active?.toISOString() ?? null,
  };
}

/**
 * Pembaruan oleh admin — §7.5.
 *
 * Allowlist terpisah dari `updateProfile` karena kewenangannya memang berbeda:
 * `role` dan `status` hanya boleh diubah dari sini. `email` dan `password_hash`
 * tidak ada di daftar mana pun, sehingga tidak dapat disentuh lewat jalur ini
 * seberapa pun kreatifnya body yang dikirim.
 *
 * `role` di-resolve lewat sub-select ke tabel roles, sehingga peran yang tidak
 * dikenal memicu pelanggaran NOT NULL alih-alih menyimpan pengguna tanpa peran.
 */
export async function adminUpdate(userId, fields) {
  const allowed = { name: "name", phone: "phone", avatar: "avatar", profile: "profile", status: "status" };
  const sets = [];
  const values = [userId];

  for (const [key, column] of Object.entries(allowed)) {
    if (fields[key] !== undefined) {
      values.push(key === "name" ? String(fields[key]).trim() : fields[key]);
      sets.push(`${column} = $${values.length}`);
      if (key === "avatar") sets.push("avatar_public_id = NULL");
    }
  }

  if (fields.role !== undefined) {
    values.push(fields.role);
    sets.push(`role_id = (SELECT id FROM roles WHERE name = $${values.length})`);
  }

  if (fields.status !== undefined || fields.role !== undefined) {
    sets.push("auth_version = auth_version + 1");
  }

  if (sets.length === 0) return findById(userId);

  await query(`UPDATE users SET ${sets.join(", ")} WHERE id = $1`, values);
  return findById(userId);
}

/**
 * Soft delete — §7.6. Baris TIDAK dihapus.
 *
 * `users` dirujuk `lesson_progress` dan `quiz_results` dengan ON DELETE CASCADE.
 * Hard delete karenanya menghapus seluruh riwayat belajar seseorang secara
 * permanen dalam satu klik, dan laporan admin kehilangan datanya tanpa jejak.
 * Menonaktifkan sudah cukup: `authService.login` menolak status non-aktif.
 */
export async function softDelete(userId) {
  const { rowCount } = await query(
    `UPDATE users
        SET status = 'inactive', auth_version = auth_version + 1
      WHERE id = $1`,
    [userId],
  );
  return rowCount > 0;
}

/** Jumlah admin yang masih aktif — penjaga agar sistem tidak kehilangan admin. */
export async function countActiveAdmins() {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total
       FROM users u JOIN roles r ON r.id = u.role_id
      WHERE r.name = 'admin' AND u.status = 'active'`,
  );
  return rows[0].total;
}
