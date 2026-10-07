// Absolute frontend URL builder for auth landing pages.
//
// Better Auth resolves the email/social `callbackURL` against the API origin,
// so a relative path like "/dashboard" lands the user on :4000 (the API).
// Always pass absolute frontend URLs — window.location.origin adapts to
// every environment with zero config. Client components only.
export function frontendUrl(path: string): string {
  return `${window.location.origin}${path}`;
}
