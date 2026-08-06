-- ============================================================
-- Diagnostik — jalankan INI DULU sebelum menerapkan skema.
-- Hanya membaca. Tidak mengubah apa pun.
-- ============================================================

-- 1. Tabel apa yang sudah ada?
SELECT table_name
  FROM information_schema.tables
 WHERE table_schema = 'public'
 ORDER BY table_name;

-- 2. Berapa banyak baris di masing-masing? (ada data sungguhan?)
SELECT
  relname               AS tabel,
  n_live_tup            AS perkiraan_baris
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 3. Bentuk tabel courses saat ini — apakah punya sort_order?
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'courses'
 ORDER BY ordinal_position;

-- 4. Bentuk tabel users saat ini
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'users'
 ORDER BY ordinal_position;
