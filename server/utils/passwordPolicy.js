const MIN_LENGTH = 10;
const MAX_LENGTH = 128;

export function validatePasswordStrength(password) {
  const value = String(password || "");
  const issues = [];

  if (value.length < MIN_LENGTH) issues.push(`at least ${MIN_LENGTH} characters`);
  if (value.length > MAX_LENGTH) issues.push(`at most ${MAX_LENGTH} characters`);
  if (!/[A-Z]/.test(value)) issues.push("one uppercase letter");
  if (!/[a-z]/.test(value)) issues.push("one lowercase letter");
  if (!/[0-9]/.test(value)) issues.push("one number");
  if (!/[^A-Za-z0-9]/.test(value)) issues.push("one special character");
  if (/\s/.test(value)) issues.push("no spaces");

  return {
    valid: issues.length === 0,
    issues,
  };
}

export const PASSWORD_POLICY_TEXT =
  "Password must be 10-128 chars and include uppercase, lowercase, number, and special character (no spaces).";
