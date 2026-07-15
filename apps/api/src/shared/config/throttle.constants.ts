/** Shared with AppModule ThrottlerModule and regression-oriented tests. */
export const USERS_WRITE_THROTTLE = {
  name: 'default' as const,
  ttl: 60_000,
  limit: 20,
};
