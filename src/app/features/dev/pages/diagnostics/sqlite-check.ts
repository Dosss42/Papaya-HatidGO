import { AppSettingsRepository } from '../../../../core/database/app-settings.repository';

/** One line of the CRUD test result. */
export interface CrudStep {
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * DEV ONLY (Phase 6): create → read → update → delete through the REAL AppSettingsRepository,
 * so on a phone it exercises the real SQLite file, schema and plugin. Uses the key 'diag_test'
 * and always removes it again, so it leaves no data behind.
 */
export async function runSettingsCrud(settings: AppSettingsRepository): Promise<CrudStep[]> {
  const steps: CrudStep[] = [];
  const check = async (label: string, action: () => Promise<string | null>, expected: string | null) => {
    try {
      const actual = await action();
      steps.push({
        label,
        ok: actual === expected,
        detail: `expected ${show(expected)}, got ${show(actual)}`,
      });
    } catch (err) {
      steps.push({ label, ok: false, detail: err instanceof Error ? err.message : String(err) });
    }
  };

  const stamp = new Date().toISOString(); // a unique value, so an old leftover can't fake a pass

  await check('Create', async () => {
    await settings.set('diag_test', `created ${stamp}`);
    return settings.get('diag_test');
  }, `created ${stamp}`);

  await check('Read', () => settings.get('diag_test'), `created ${stamp}`);

  await check('Update', async () => {
    await settings.set('diag_test', `updated ${stamp}`);
    return settings.get('diag_test');
  }, `updated ${stamp}`);

  await check('Delete', async () => {
    await settings.remove('diag_test');
    return settings.get('diag_test');
  }, null);

  return steps;
}

function show(value: string | null): string {
  return value === null ? 'nothing' : `"${value}"`;
}
