/**
 * Brightloop Password Security Policy
 *
 * Requirements:
 * - Minimum length: 9 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 special character (!@#$%^&* etc.)
 */

export const PASSWORD_REQUIREMENTS = [
  { id: 'minLength', label: 'At least 9 characters long', test: (pwd) => pwd.length >= 9 },
  { id: 'hasUpper', label: 'At least one uppercase letter (A-Z)', test: (pwd) => /[A-Z]/.test(pwd) },
  { id: 'hasLower', label: 'At least one lowercase letter (a-z)', test: (pwd) => /[a-z]/.test(pwd) },
  {
    id: 'hasSpecial',
    label: 'At least one special character (!@#$%^&* etc.)',
    test: (pwd) => /[^A-Za-z0-9]/.test(pwd),
  },
];

/**
 * Validates a password against Brightloop security criteria.
 * @param {string} password
 * @returns {{
 *   isValid: boolean,
 *   criteria: Record<string, boolean>,
 *   score: number,
 *   strength: 'weak' | 'medium' | 'strong',
 *   errors: string[]
 * }}
 */
export function validatePassword(password = '') {
  const criteria = {};
  const errors = [];
  let passedCount = 0;

  for (const req of PASSWORD_REQUIREMENTS) {
    const passed = req.test(password);
    criteria[req.id] = passed;
    if (passed) {
      passedCount += 1;
    } else {
      errors.push(req.label);
    }
  }

  const isValid = passedCount === PASSWORD_REQUIREMENTS.length;

  let strength = 'weak';
  if (passedCount >= 4 && password.length >= 12) {
    strength = 'strong';
  } else if (passedCount >= 3) {
    strength = 'medium';
  }

  return {
    isValid,
    criteria,
    score: passedCount,
    maxScore: PASSWORD_REQUIREMENTS.length,
    strength,
    errors,
  };
}
