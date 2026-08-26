export type ParsedRole = 'personal' | 'admin' | 'personal-admin' | 'aluno' | null;

export function verifyRole(roles?: string[]): ParsedRole {
  if (!roles || roles.length === 0) return null;

  const normalized = roles.map((r) => r.toLowerCase());

  if (normalized.includes('personal') && !normalized.includes('admin')) {
    return 'personal';
  }
  if (normalized.includes('admin') && !normalized.includes('personal')) {
    return 'admin';
  }
  if (normalized.includes('admin') && normalized.includes('personal')) {
    return 'personal-admin';
  }
  if (normalized.includes('aluno') && !normalized.includes('admin') && !normalized.includes('personal')) {
    return 'aluno';
  }

  return null;
}
