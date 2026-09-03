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
