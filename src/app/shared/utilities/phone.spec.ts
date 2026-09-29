import { formatPhoneLocal } from './phone';

describe('formatPhoneLocal', () => {
  it('shows +639XXXXXXXXX the way people write it locally', () => {
    expect(formatPhoneLocal('+639171234567')).toBe('0917 123 4567');
  });

  it('leaves anything unexpected unchanged, and empty values empty', () => {
    expect(formatPhoneLocal('12345')).toBe('12345');
    expect(formatPhoneLocal(null)).toBe('');
  });
});
