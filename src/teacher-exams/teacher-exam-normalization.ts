export function normalizeParticipantValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
}

export function cleanParticipantValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
