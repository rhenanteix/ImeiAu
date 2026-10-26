import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkImeiBlacklist, validateImeiFormatAndLuhn } from '../src/lib/imei';
test('IMEI rejeita formato e dígito inválidos', () => {
  for (const value of ['123', '000000000000000', '490154203237519']) assert.equal(validateImeiFormatAndLuhn(value).valid, false);
  assert.equal(validateImeiFormatAndLuhn('490154203237518').valid, true);
});
test('validação local não inventa resultado de consulta de bloqueio', async () => {
  const result = await checkImeiBlacklist('490154203237518');
  assert.equal(result.valid, true);
  assert.equal(result.blocked, false);
  assert.equal(result.details?.blacklistChecked, false);
  assert.equal(result.details?.status, 'not_checked');
});
