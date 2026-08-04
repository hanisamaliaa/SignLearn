import { ApiError } from "../utils/ApiError.js";

/**
 * Runs a validator function against the request. The validator should
 * return either `null` (valid) or an array of error strings.
 */
export function validate(validator) {
  return (req, _res, next) => {
    const errors = validator(req.body, req.params, req.query);
    if (errors && errors.length > 0) {
      return next(new ApiError(422, errors.join(" ")));
    }
    return next();
  };
}
