/**
 * The API stores numbers as +639XXXXXXXXX; people in Papaya write and read them as 09XX XXX XXXX.
 * Display only: never send the formatted value back to the API.
 */
export function formatPhoneLocal(phone: string | null | undefined): string {
  if (!phone) {
    return '';
  }
  const match = /^\+63(9\d{2})(\d{3})(\d{4})$/.exec(phone);
  return match ? `0${match[1]} ${match[2]} ${match[3]}` : phone;
}
