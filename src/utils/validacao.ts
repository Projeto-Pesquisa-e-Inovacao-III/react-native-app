export function validatePassword(password: string): string {
  let response = '';

  if (!/[a-z]/.test(password)) {
    response += 'A senha deve conter pelo menos uma letra minúscula.\n';
  }

  if (!/[A-Z]/.test(password)) {
    response += 'A senha deve conter pelo menos uma letra maiúscula.\n';
  }

  if (!/[0-9]/.test(password)) {
    response += 'A senha deve conter pelo menos um número.\n';
  }

  if (!/[\W_]/.test(password)) {
    response += 'A senha deve conter pelo menos um caractere especial.\n';
  }

  if (password.length < 8) {
    response += 'A senha deve ter no mínimo 8 caracteres.\n';
  }

  return response || 'password válida!';
}

export function validateEmail(email: string): string {
  const parts = email.split('@');
  let response = '';

  if (parts.length !== 2) {
    response += "O email deve conter exatamente um '@'.\n";
    return response;
  }

  const user = parts[0];
  const domain = parts[1];

  const regexUser = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
  if (!regexUser.test(user)) {
    response += 'A parte do usuário contém caracteres inválidos.\n';
  }

  const regexDomain = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*(?:\.[a-z]{2,})$/i;
  if (!regexDomain.test(domain)) {
    response += 'O domínio do email é inválido.\n';
  }

  return response || 'Email válido!';
}

export type HeightWeightLimits = {
  minHeightCm: number;
  maxHeightCm: number;
  minWeightKg: number;
  maxWeightKg: number;
};

export const parseNumericValue = (value: string): number =>
  Number(value.trim().replace(',', '.'));

export const validateHeightWeightValues = (
  heightValue: number,
  weightValue: number,
  limits: HeightWeightLimits
): string | null => {
  if (Number.isNaN(heightValue) || Number.isNaN(weightValue)) {
    return 'Altura e peso precisam ser números válidos.';
  }

  if (heightValue <= 0 || weightValue <= 0) {
    return 'Altura e peso não podem ser zero ou negativos.';
  }

  if (heightValue < limits.minHeightCm || heightValue > limits.maxHeightCm) {
    return `A altura deve estar entre ${limits.minHeightCm} e ${limits.maxHeightCm} cm.`;
  }

  if (weightValue < limits.minWeightKg || weightValue > limits.maxWeightKg) {
    return `O peso deve estar entre ${limits.minWeightKg} e ${limits.maxWeightKg} kg.`;
  }

  return null;
};
