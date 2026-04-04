/**
 * Returns true when READ_ONLY_MODE=true is set in the environment.
 * All user-initiated write operations (trades + feed) should check this
 * before touching the DB and return an appropriate error if true.
 */
export function isReadOnlyMode(): boolean {
  return process.env.READ_ONLY_MODE === 'true';
}
