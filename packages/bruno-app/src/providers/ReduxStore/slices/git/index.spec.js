let mockUidCounter = 0;
jest.mock('nanoid', () => ({
  customAlphabet: () => () => `uid-${++mockUidCounter}`
}));

import { configureStore } from '@reduxjs/toolkit';
import appReducer, { updateGitOperationProgress } from 'providers/ReduxStore/slices/app';
import gitReducer from './index';
import {
  refreshGitStatus,
  commitGitChanges,
  pushGitBranch,
  stageGitFiles,
  scheduleGitStatusRefresh,
  scheduleGitStatusRefreshForAll
} from './actions';

const collectionUid = 'col-1';
const collectionPath = '/repo/collections/api';

const cleanStatus = {
  isRepo: true,
  branch: 'main',
  ahead: 0,
  behind: 0,
  staged: [],
  unstaged: [],
  conflicted: [],
  tooManyFiles: false
};

const createStore = () =>
  configureStore({
    reducer: {
      app: appReducer,
      git: gitReducer,
      collections: () => ({ collections: [{ uid: collectionUid, pathname: collectionPath }] })
    }
  });

const remoteError = (message) => new Error(`Error invoking remote method 'renderer:git-commit': Error: ${message}`);

describe('git slice', () => {
  let invoke;

  beforeEach(() => {
    invoke = jest.fn();
    window.ipcRenderer = { invoke };
  });

  describe('refreshGitStatus', () => {
    it('stores the status returned for the collection path', async () => {
      invoke.mockResolvedValue({ ...cleanStatus, ahead: 2, unstaged: [{ path: 'collections/api/a.bru' }] });
      const store = createStore();

      await store.dispatch(refreshGitStatus(collectionUid));

      expect(invoke).toHaveBeenCalledWith('renderer:git-status', { collectionPath });
      expect(store.getState().git.byCollection[collectionUid]).toMatchObject({
        isRepo: true,
        branch: 'main',
        ahead: 2,
        unstaged: [{ path: 'collections/api/a.bru' }],
        loading: false
      });
      expect(store.getState().git.byCollection[collectionUid].lastRefreshedAt).toEqual(expect.any(Number));
    });

    it('stores a collection outside any repository', async () => {
      invoke.mockResolvedValue({ isRepo: false });
      const store = createStore();

      await store.dispatch(refreshGitStatus(collectionUid));

      expect(store.getState().git.byCollection[collectionUid]).toMatchObject({ isRepo: false, branch: null, staged: [] });
    });

    it('keeps the error without the Electron prefix', async () => {
      invoke.mockRejectedValue(remoteError('Collection is not open'));
      const store = createStore();

      await store.dispatch(refreshGitStatus(collectionUid));

      expect(store.getState().git.byCollection[collectionUid]).toMatchObject({
        loading: false,
        error: 'Collection is not open'
      });
    });
  });

  describe('operations', () => {
    it('stages files and refreshes the status afterwards', async () => {
      invoke.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce(cleanStatus);
      const store = createStore();

      await store.dispatch(stageGitFiles(collectionUid, ['collections/api/a.bru']));

      expect(invoke).toHaveBeenNthCalledWith(1, 'renderer:git-stage', { collectionPath, files: ['collections/api/a.bru'] });
      expect(invoke).toHaveBeenNthCalledWith(2, 'renderer:git-status', { collectionPath });
      expect(store.getState().git.byCollection[collectionUid]).toMatchObject({ operation: null, error: null });
    });

    it('records a failed commit, rethrows it readable and still refreshes', async () => {
      invoke.mockRejectedValueOnce(remoteError('Commit message is required')).mockResolvedValueOnce(cleanStatus);
      const store = createStore();

      await expect(store.dispatch(commitGitChanges(collectionUid, ' '))).rejects.toThrow('Commit message is required');

      expect(invoke).toHaveBeenLastCalledWith('renderer:git-status', { collectionPath });
      expect(store.getState().git.byCollection[collectionUid]).toMatchObject({
        operation: null,
        error: 'Commit message is required'
      });
    });

    it('sends a process uid with push and clears the previous progress log', async () => {
      invoke.mockResolvedValue({ ok: true });
      const store = createStore();

      await store.dispatch(pushGitBranch(collectionUid));
      const firstUid = store.getState().git.byCollection[collectionUid].operationUid;
      expect(invoke).toHaveBeenCalledWith('renderer:git-push', { collectionPath, processUid: firstUid });

      store.dispatch(updateGitOperationProgress({ uid: firstUid, data: 'Writing objects: 100%' }));
      expect(store.getState().app.gitOperationProgress[firstUid].progressData).toEqual(['Writing objects: 100%']);

      await store.dispatch(pushGitBranch(collectionUid));

      expect(store.getState().app.gitOperationProgress[firstUid]).toBeUndefined();
      expect(store.getState().git.byCollection[collectionUid].operationUid).not.toBe(firstUid);
    });
  });

  describe('scheduled refreshes', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('ignores collections whose status was never loaded', () => {
      const store = createStore();

      store.dispatch(scheduleGitStatusRefresh(collectionUid));
      store.dispatch(scheduleGitStatusRefreshForAll());
      jest.runAllTimers();

      expect(invoke).not.toHaveBeenCalled();
    });

    it('coalesces a burst of changes into one refresh', async () => {
      invoke.mockResolvedValue(cleanStatus);
      const store = createStore();
      await store.dispatch(refreshGitStatus(collectionUid));
      invoke.mockClear();

      store.dispatch(scheduleGitStatusRefresh(collectionUid));
      store.dispatch(scheduleGitStatusRefresh(collectionUid));
      store.dispatch(scheduleGitStatusRefreshForAll());
      jest.advanceTimersByTime(999);
      expect(invoke).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(invoke).toHaveBeenCalledTimes(1);
      expect(invoke).toHaveBeenCalledWith('renderer:git-status', { collectionPath });
    });
  });
});
