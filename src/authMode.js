// Temporary auth bypass switch.
// Set this to false when you're ready to turn the login gate back on.
export const AUTH_BYPASS_ENABLED = (import.meta.env.VITE_AUTH_BYPASS ?? 'false') === 'true'
