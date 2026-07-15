/** Default in-memory rate limit for API routes (per IP). Health uses @SkipThrottle(). */
export const API_THROTTLE = {
  name: 'default' as const,
  ttl: 60_000,
  limit: 20,
};

/** @deprecated Prefer API_THROTTLE — kept as alias for older references. */
export const USERS_WRITE_THROTTLE = API_THROTTLE;
