import { formatScanSummary, hasScanDetails, getAbsentPaths, isCollectionAbsent } from './utils';

describe('formatScanSummary', () => {
  it('describes found, added and already existed counts', () => {
    expect(formatScanSummary({ found: 7, added: 5, alreadyExisted: 2, absent: [], problems: [] }))
      .toBe('7 found, 5 added, 2 already existed');
  });

  it('returns an empty string without a summary', () => {
    expect(formatScanSummary(null)).toBe('');
  });
});

describe('hasScanDetails', () => {
  it('is false when there are no problems and no absent collections', () => {
    expect(hasScanDetails({ problems: [], absent: [] })).toBe(false);
  });

  it('is true when either list has items', () => {
    expect(hasScanDetails({ problems: [{ path: '/a', reason: 'x' }], absent: [] })).toBe(true);
    expect(hasScanDetails({ problems: [], absent: [{ name: 'a', path: '/a' }] })).toBe(true);
  });
});

describe('isCollectionAbsent', () => {
  it('flags collections that could not be opened from disk', () => {
    expect(isCollectionAbsent({ pathname: '/x', failedToOpen: true }, new Set())).toBe(true);
  });

  it('flags collections reported absent by the last scan', () => {
    const absentPaths = getAbsentPaths({ absent: [{ name: 'a', path: '/repos/a/gruno' }] });
    expect(isCollectionAbsent({ pathname: '/repos/a/gruno' }, absentPaths)).toBe(true);
  });

  it('does not flag present collections', () => {
    expect(isCollectionAbsent({ pathname: '/repos/b/gruno' }, getAbsentPaths(null))).toBe(false);
  });
});
