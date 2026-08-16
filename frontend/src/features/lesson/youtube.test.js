import assert from "node:assert/strict";
import test from "node:test";
import { parseYouTubeId, thumbnailUrl, watchUrl, formatDuration } from "./youtube.js";

test("reads the id from every YouTube link shape an admin might paste", () => {
  const id = "Hx8IU6CfMIM";
  const shapes = [
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=35QC9JW3GC0_ShDg`,
    `https://www.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?v=${id}&t=42s`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
    // Ditempel tanpa skema, kebiasaan yang sangat umum.
    `youtu.be/${id}`,
    `www.youtube.com/watch?v=${id}`,
    // Sudah berupa id.
    id,
    `  ${id}  `,
  ];
  for (const shape of shapes) {
    assert.equal(parseYouTubeId(shape), id, `gagal mengurai: ${shape}`);
  }
});

test("keeps the whole seeded catalogue parseable", () => {
  const seeded = [
    "Hx8IU6CfMIM", "xnxydJPDD1M", "lio9OmhZa5I", "4icuKB1w5Z0", "lor4YdtK8tU",
    "MIIh0EVnbJI", "Cls9oklykKo", "5UN60jB4eKg", "mssWGGRUMiw", "Qhx0_ctwd_4",
  ];
  for (const id of seeded) {
    assert.equal(parseYouTubeId(`https://www.youtube.com/watch?v=${id}`), id);
  }
  assert.equal(new Set(seeded).size, seeded.length, "id video tidak boleh ganda");
});

test("refuses links that are not a playable YouTube video", () => {
  const rejected = [
    "",
    "   ",
    null,
    undefined,
    42,
    "not a url",
    "https://vimeo.com/12345678",
    // Domain yang menyerupai, sering dipakai penyalahgunaan.
    "https://youtube.com.evil.test/watch?v=Hx8IU6CfMIM",
    // Id dengan panjang salah.
    "https://youtu.be/tooShort",
    "https://www.youtube.com/watch?v=waytoolongforanid",
    // Halaman YouTube yang bukan video.
    "https://www.youtube.com/results?search_query=bisindo",
    "https://www.youtube.com/@okkehidayahkahfi",
  ];
  for (const value of rejected) {
    assert.equal(parseYouTubeId(value), null, `seharusnya ditolak: ${String(value)}`);
  }
});

test("builds thumbnail and watch links from the id", () => {
  assert.equal(
    thumbnailUrl("Hx8IU6CfMIM"),
    "https://img.youtube.com/vi/Hx8IU6CfMIM/maxresdefault.jpg",
  );
  assert.equal(
    thumbnailUrl("Hx8IU6CfMIM", "hqdefault"),
    "https://img.youtube.com/vi/Hx8IU6CfMIM/hqdefault.jpg",
  );
  assert.equal(watchUrl("Hx8IU6CfMIM"), "https://www.youtube.com/watch?v=Hx8IU6CfMIM");
});

test("formats the duration the player reports", () => {
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(9), "0:09");
  assert.equal(formatDuration(600), "10:00");
  assert.equal(formatDuration(3725), "1:02:05");
  // Pecahan detik dari getDuration() dibulatkan, bukan dipotong.
  assert.equal(formatDuration(59.6), "1:00");
});

test("shows nothing rather than a wrong duration when the player has not reported one", () => {
  for (const value of [0, -1, NaN, null, undefined, "abc"]) {
    assert.equal(formatDuration(value), null);
  }
});
