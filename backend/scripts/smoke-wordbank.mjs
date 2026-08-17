#!/usr/bin/env node
/**
 * Smoke test Bank Kata / Kamus BISINDO.
 *
 *   npm run smoke:wordbank
 *
 * ── Kenapa suite ini ada ──────────────────────────────────────────────
 *
 * Modul ini punya satu kegagalan yang sudah terbukti terjadi di produksi:
 * tautan HALAMAN YouTube tersimpan di kolom `sign_image`, lolos validasi, lalu
 * tampil sebagai gambar rusak kepada anak. Validator kini menolaknya, dan
 * penolakan itu perlu dijaga terhadap server yang sungguh berjalan — bukan
 * hanya terhadap fungsi validatornya, yang bisa saja tidak lagi terpasang di
 * rute.
 *
 * Yang diperiksa: kontrol akses, penolakan media yang salah jenis, pencarian
 * satu huruf, pengelompokan kategori, dan pencarian lewat alias.
 */

import {
  call, check, section, summary, requireServer,
  registerUser, loginAdmin, closeHarnessDatabase, c,
} from "./lib/harness.mjs";

async function main() {
  console.log(`\n${c.b("SignLearn — smoke test Bank Kata & Kamus")}`);
  await requireServer();

  const admin = await loginAdmin();
  const learner = await registerUser("murid");
  const stamp = Date.now();
  const word = `Ujicoba${stamp}`;

  // ── Kontrol akses ──────────────────────────────────────────────────────
  section("Bank Kata — kontrol akses");

  const anonCreate = await call("/translations", {
    method: "POST", body: { word, translation: "U-J-I" },
  });
  check("anon tidak dapat menambah kata", anonCreate.status === 401, `${anonCreate.status}`);

  const userCreate = await call("/translations", {
    token: learner.token, method: "POST", body: { word, translation: "U-J-I" },
  });
  check("peran user tidak dapat menambah kata", userCreate.status === 403, `${userCreate.status}`);

  // ── Penolakan media salah jenis ────────────────────────────────────────
  section("Bank Kata — validasi media");

  const youtubeAsImage = await call("/translations", {
    token: admin.token,
    method: "POST",
    body: {
      word, translation: "U-J-I",
      signImage: "https://www.youtube.com/watch?v=kXYrQys-Me8",
    },
  });
  check("tautan YouTube ditolak di kolom gambar", youtubeAsImage.status === 422,
    `${youtubeAsImage.status}`);
  check("penolakan menyebut field yang salah",
    youtubeAsImage.body?.errors?.[0]?.field === "signImage",
    youtubeAsImage.body?.errors?.[0]?.field);

  const extensionless = await call("/translations", {
    token: admin.token,
    method: "POST",
    body: { word, translation: "U-J-I", signImage: "https://example.test/tanpa-ekstensi" },
  });
  check("URL gambar tanpa ekstensi ditolak", extensionless.status === 422,
    `${extensionless.status}`);

  const xss = await call("/translations", {
    token: admin.token,
    method: "POST",
    body: { word, translation: "U-J-I", signImage: "javascript:alert(1)" },
  });
  check("protokol javascript: ditolak", xss.status === 422, `${xss.status}`);

  const youtubeAsVideo = await call("/translations", {
    token: admin.token,
    method: "POST",
    body: {
      word, translation: "U-J-I", category: "Ujicoba",
      signVideo: "https://youtu.be/kXYrQys-Me8",
    },
  });
  check("tautan YouTube diterima di kolom video", youtubeAsVideo.status === 201,
    `${youtubeAsVideo.status}`);
  const createdId = youtubeAsVideo.data?.translation?.id;

  // ── Bacaan publik ──────────────────────────────────────────────────────
  section("Kamus — bacaan untuk siswa");

  const list = await call("/translations?limit=100", { token: learner.token });
  check("siswa dapat membaca daftar kata", list.status === 200, `${list.status}`);
  const items = list.data?.items ?? [];
  check("daftar berisi kata hasil seed", items.length >= 30, `${items.length} kata`);

  const brokenMedia = items.filter(
    (item) => item.signImage && !/\.(jpe?g|png|webp|gif|svg|avif)(\?|$)/i.test(item.signImage),
  );
  check("tidak ada entri dengan gambar yang tak dapat dirender",
    brokenMedia.length === 0,
    brokenMedia.map((item) => item.word).join(", "));

  const spelledWrong = items.filter(
    (item) => !/^[A-Z](-[A-Z])*( [A-Z](-[A-Z])*)*$/.test(item.translation ?? ""),
  );
  check("setiap kata punya ejaan yang dapat dirender dari abjad",
    spelledWrong.length === 0,
    spelledWrong.map((item) => item.word).join(", "));

  const single = await call("/translations?q=a", { token: learner.token });
  check("pencarian satu huruf diterima", single.status === 200, `${single.status}`);

  const categories = await call("/translations/categories", { token: learner.token });
  check("kategori dapat dibaca", categories.status === 200, `${categories.status}`);
  check("kata terkelompok dalam beberapa kategori",
    (categories.data?.items?.length ?? 0) >= 4,
    `${categories.data?.items?.length} kategori`);

  const lookup = await call("/translations/lookup?word=halo");
  check("lookup kata menemukan entri", lookup.status === 200, `${lookup.status}`);
  check("baris 'halo' yang dulu rusak kini bersih media",
    !lookup.data?.translation?.signImage && !lookup.data?.translation?.signVideo,
    `${lookup.data?.translation?.signImage ?? "-"} / ${lookup.data?.translation?.signVideo ?? "-"}`);

  const alias = await call("/translations/lookup?word=makasih");
  check("lookup lewat alias menemukan kata induknya",
    alias.status === 200 && alias.data?.translation?.word === "Terima kasih",
    alias.data?.translation?.word);

  const missing = await call("/translations/lookup?word=zzzbukankata");
  check("kata tak dikenal menjawab 404, bukan galat server",
    missing.status === 404, `${missing.status}`);

  // ── Bersih-bersih ──────────────────────────────────────────────────────
  section("Bank Kata — bersih-bersih");

  if (createdId) {
    const removed = await call(`/translations/${createdId}`, {
      token: admin.token, method: "DELETE",
    });
    check("kata ujicoba terhapus", [200, 204].includes(removed.status), `${removed.status}`);
  }

  return summary("Bank Kata & Kamus");
}

main()
  .then((ok) => { process.exitCode = ok ? 0 : 1; })
  .finally(() => closeHarnessDatabase());
