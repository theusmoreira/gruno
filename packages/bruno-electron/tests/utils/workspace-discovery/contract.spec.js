const { describe, it, expect } = require('@jest/globals');

const {
  COLLECTION_FOLDER_NAMES,
  createEmptySummary
} = require('../../../src/utils/workspace-discovery');

describe('workspace discovery contract', () => {
  it('uses gruno, bruno, collection as the folder priority, in that order', () => {
    expect(COLLECTION_FOLDER_NAMES).toEqual(['gruno', 'bruno', 'collection']);
  });

  it('creates an empty summary with independent lists on every call', () => {
    const first = createEmptySummary();
    const second = createEmptySummary();

    first.problems.push({ path: '/a', reason: 'no permission' });

    expect(second).toEqual({ found: 0, added: 0, alreadyExisted: 0, absent: [], problems: [] });
  });
});
