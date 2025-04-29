// CPF formatter
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length > 11) return digits.slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
}

// CPF validator
export function validateCPF(cpf: string): boolean {
  // Remove non-numeric characters
  const digits = cpf.replace(/\D/g, '');

  // Check length
  if (digits.length !== 11) return false;

  // Check for repeated digits
  if (/^(\d)\1+$/.test(digits)) return false;

  // Calculate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i)) * (10 - i);
  }
  let checkDigit1 = 11 - (sum % 11);
  if (checkDigit1 >= 10) checkDigit1 = 0;

  // Validate first check digit
  if (checkDigit1 !== parseInt(digits.charAt(9))) return false;

  // Calculate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i)) * (11 - i);
  }
  let checkDigit2 = 11 - (sum % 11);
  if (checkDigit2 >= 10) checkDigit2 = 0;

  // Validate second check digit
  return checkDigit2 === parseInt(digits.charAt(10));
}

// Password validation
export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (password.length < 6) {
    return { isValid: false, message: 'A senha deve ter pelo menos 6 caracteres' };
  }
  return { isValid: true, message: '' };
}

// Calculate annual price with 20% discount
export function calculateAnnualPrice(monthlyPrice: number): number {
  const annualPrice = monthlyPrice * 12;
  const discount = annualPrice * 0.2; // 20% discount
  return annualPrice - discount;
}