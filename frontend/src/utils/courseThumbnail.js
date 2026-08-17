/** Thumbnail kini selalu berasal dari database/object storage terpusat. */
export function getCourseThumbnail(course) {
  return course?.thumbnail || "";
}
