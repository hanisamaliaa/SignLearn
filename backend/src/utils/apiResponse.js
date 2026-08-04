/**
 * Consistent JSON response helpers.
 */
export function success(res, data, message = "OK", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function created(res, data, message = "Created") {
  return res.status(201).json({ success: true, message, data });
}

export function noContent(res) {
  return res.status(204).json({ success: true, message: "No content" });
}
