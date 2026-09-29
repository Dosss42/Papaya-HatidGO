import { MemoryAppSettingsRepository } from '../../../../core/database/app-settings.repository';
import { runSettingsCrud } from './sqlite-check';

describe('runSettingsCrud (dev diagnostics)', () => {
  it('passes all four steps and leaves no test data behind', async () => {
    const settings = new MemoryAppSettingsRepository();
    await settings.set('onboarding_seen', '1');

    const steps = await runSettingsCrud(settings);

    expect(steps.map((s) => s.label)).toEqual(['Create', 'Read', 'Update', 'Delete']);
    expect(steps.every((s) => s.ok)).toBe(true);
    expect(await settings.get('diag_test')).toBeNull();
    expect(await settings.get('onboarding_seen')).toBe('1'); // real settings untouched
  });

  it('reports a failing step instead of throwing', async () => {
    const broken = new MemoryAppSettingsRepository();
    broken.set = async () => {
      throw new Error('disk full');
    };

    const steps = await runSettingsCrud(broken);

    expect(steps[0]).toEqual({ label: 'Create', ok: false, detail: 'disk full' });
  });
});
