import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/apiResponse.js";
import * as aiService from "../services/aiService.js";

/**
 * AI controller — pembuatan subtitle & kuis otomatis (API Contract §10.8).
 *
 * ── Kenapa memanggil service yang untuk sekarang pasti melempar 501 ───
 *
 * Versi sebelumnya membalas `200 {"data": null, "message": "not implemented"}`
 * tanpa menyentuh service sama sekali. Dari sudut pandang frontend, 200 berarti
 * BERHASIL: UI menampilkan "subtitle sedang dibuat" untuk proses yang tidak
 * pernah berjalan, dan tidak ada yang tahu fitur itu belum ada sampai
 * seseorang mencarinya di produksi.
 *
 * `501 NOT_IMPLEMENTED` mengatakan yang sebenarnya, dan `code` yang stabil
 * membuat frontend dapat menyembunyikan tombolnya alih-alih menebak dari pesan.
 * Ketika integrasinya nanti dikerjakan, controller ini tidak perlu berubah —
 * cukup nyalakan bendera `AI_SUBTITLE_ENABLED` dan isi service-nya.
 */

// ─── POST /admin/ai/subtitles/:lessonId ──────────────────────────────────
export const generateSubtitles = asyncHandler(async (req, res) => {
  const result = await aiService.generateSubtitles(req.params.lessonId);
  success(res, result, "Subtitle berhasil dibuat.");
});

// ─── POST /admin/ai/quiz/:lessonId ───────────────────────────────────────
export const generateQuiz = asyncHandler(async (req, res) => {
  const result = await aiService.generateQuiz(req.params.lessonId);
  success(res, result, "Kuis berhasil dibuat.");
});
