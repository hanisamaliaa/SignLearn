import { ApiError } from "../utils/ApiError.js";

/**
 * Menjalankan validator terhadap request.
 *
 * Validator mengembalikan `Array<{field, message}>`; array kosong = valid.
 *
 * Versi sebelumnya menggabungkan pesan dengan `errors.join(" ")`, sehingga
 * frontend menerima satu string panjang dan tidak dapat mengetahui field mana
 * yang bermasalah. Form register menampilkan seluruh pesan menumpuk di satu
 * tempat, bukan di bawah masing-masing input.
 */
export function validate(validator) {
  return (req, _res, next) => {
    const errors = validator(req.body, req.params, req.query);

    if (Array.isArray(errors) && errors.length > 0) {
      return next(ApiError.validation("Data yang dikirim tidak valid.", errors));
    }
    return next();
  };
}
