import { uuid } from 'utils/common';
import { formatIpcError } from 'utils/common/error';
import { findCollectionByUid } from 'utils/collections';
import { removeGitOperationProgress } from 'providers/ReduxStore/slices/app';
import {
  gitStatusRequested,
  gitStatusReceived,
  gitStatusFailed,
  gitOperationStarted,
  gitOperationFinished
} from './index';

const STATUS_REFRESH_DEBOUNCE_MS = 1000;

const getCollectionPathname = (state, collectionUid) => {
  const collection = findCollectionByUid(state.collections.collections, collectionUid);
  if (!collection) {
    throw new Error('Collection not found');
  }
  return collection.pathname;
};

export const refreshGitStatus = (collectionUid) => async (dispatch, getState) => {
  dispatch(gitStatusRequested({ collectionUid }));
  try {
    const collectionPath = getCollectionPathname(getState(), collectionUid);
    const status = await window.ipcRenderer.invoke('renderer:git-status', { collectionPath });
    dispatch(gitStatusReceived({ collectionUid, status, refreshedAt: Date.now() }));
  } catch (error) {
    dispatch(gitStatusFailed({ collectionUid, error: formatIpcError(error) }));
  }
};

/*
 * File changes and window focus arrive in bursts (a save touches several files, focus flips while
 * switching apps), so status refreshes are coalesced per collection. Only collections whose Git
 * status has been loaded once are refreshed: nothing runs git for a collection the panel never opened.
 */
const pendingRefreshes = new Map();

export const scheduleGitStatusRefresh = (collectionUid) => (dispatch, getState) => {
  if (!getState().git.byCollection[collectionUid]) {
    return;
  }
  clearTimeout(pendingRefreshes.get(collectionUid));
  pendingRefreshes.set(
    collectionUid,
    setTimeout(() => {
      pendingRefreshes.delete(collectionUid);
      dispatch(refreshGitStatus(collectionUid));
    }, STATUS_REFRESH_DEBOUNCE_MS)
  );
};

export const scheduleGitStatusRefreshForAll = () => (dispatch, getState) => {
  Object.keys(getState().git.byCollection).forEach((collectionUid) => {
    dispatch(scheduleGitStatusRefresh(collectionUid));
  });
};

const runGitOperation = ({ collectionUid, operation, channel, args = {}, withProgress = false }) => async (dispatch, getState) => {
  const previousOperationUid = getState().git.byCollection[collectionUid]?.operationUid;
  if (previousOperationUid) {
    dispatch(removeGitOperationProgress(previousOperationUid));
  }

  const operationUid = withProgress ? uuid() : null;
  dispatch(gitOperationStarted({ collectionUid, operation, operationUid }));

  try {
    const collectionPath = getCollectionPathname(getState(), collectionUid);
    const progressArgs = withProgress ? { processUid: operationUid } : {};
    const result = await window.ipcRenderer.invoke(channel, { collectionPath, ...args, ...progressArgs });
    dispatch(gitOperationFinished({ collectionUid }));
    return result;
  } catch (error) {
    const message = formatIpcError(error);
    dispatch(gitOperationFinished({ collectionUid, error: message }));
    throw new Error(message);
  } finally {
    await dispatch(refreshGitStatus(collectionUid));
  }
};

export const initGitRepository = (collectionUid) =>
  runGitOperation({ collectionUid, operation: 'init', channel: 'renderer:git-init' });

export const stageGitFiles = (collectionUid, files) =>
  runGitOperation({ collectionUid, operation: 'stage', channel: 'renderer:git-stage', args: { files } });

export const unstageGitFiles = (collectionUid, files) =>
  runGitOperation({ collectionUid, operation: 'unstage', channel: 'renderer:git-unstage', args: { files } });

export const commitGitChanges = (collectionUid, message) =>
  runGitOperation({ collectionUid, operation: 'commit', channel: 'renderer:git-commit', args: { message } });

export const pushGitBranch = (collectionUid) =>
  runGitOperation({ collectionUid, operation: 'push', channel: 'renderer:git-push', withProgress: true });

export const pullGitBranch = (collectionUid) =>
  runGitOperation({ collectionUid, operation: 'pull', channel: 'renderer:git-pull', withProgress: true });
