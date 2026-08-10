/**
 * Consistent JSON response helpers.
 */
export function success(res, data, message = "OK", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function created(res, data, message = "Created") {
  return res.status(201).json({ success: true, message, data });
}

/**
 * 204 No Content — TANPA body.
 *
 * RFC 9110 §15.3.5 melarang 204 membawa payload. Versi sebelumnya memanggil
 * `.json()`, sehingga header `Content-Type: application/json` terkirim untuk
 * respons yang tubuhnya dibuang Node. Sebagian klien HTTP (dan proxy yang
 * ketat) menganggap kombinasi itu sebagai respons rusak.
 *
 * Catatan: endpoint yang perlu mengabarkan keberhasilan sebaiknya memakai
 * `success(res, null, "...")` dengan 200 — envelope kontrak §2.2 tetap utuh
 * dan frontend tidak perlu bercabang pada status kosong.
 */
export function noContent(res) {
  return res.status(204).end();
}
