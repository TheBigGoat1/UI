export const PASSWORD_POLICY_TEXT =
  "Use 10+ characters with uppercase, lowercase, number, and special character.";

export function passwordChecks(password) {
  const value = String(password || "");
  return {
    minLength: value.length >= 10,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
    noSpaces: !/\s/.test(value),
  };
}

export function isStrongPassword(password) {
  const checks = passwordChecks(password);
  return Object.values(checks).every(Boolean);
}
