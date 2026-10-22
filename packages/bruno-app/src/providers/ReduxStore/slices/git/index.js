import { createSlice } from '@reduxjs/toolkit';

const emptyCollectionGitState = () => ({
  isRepo: false,
  branch: null,
  ahead: 0,
  behind: 0,
  staged: [],
  unstaged: [],
  conflicted: [],
  tooManyFiles: false,
  loading: false,
  operation: null,
  operationUid: null,
  error: null,
  lastRefreshedAt: null
});

const ensureCollection = (state, collectionUid) => {
  if (!state.byCollection[collectionUid]) {
    state.byCollection[collectionUid] = emptyCollectionGitState();
  }
  return state.byCollection[collectionUid];
};

const initialState = {
  isPanelOpen: false,
  byCollection: {}
};

export const gitSlice = createSlice({
  name: 'git',
  initialState,
  reducers: {
    toggleGitPanel: (state) => {
      state.isPanelOpen = !state.isPanelOpen;
    },
    closeGitPanel: (state) => {
      state.isPanelOpen = false;
    },
    clearGitError: (state, action) => {
      const collectionGit = state.byCollection[action.payload.collectionUid];
      if (collectionGit) {
        collectionGit.error = null;
      }
    },
    gitStatusRequested: (state, action) => {
      ensureCollection(state, action.payload.collectionUid).loading = true;
    },
    gitStatusReceived: (state, action) => {
      const { collectionUid, status, refreshedAt } = action.payload;
      const collectionGit = ensureCollection(state, collectionUid);
      Object.assign(collectionGit, emptyCollectionGitState(), {
        ...status,
        operation: collectionGit.operation,
        operationUid: collectionGit.operationUid,
        error: collectionGit.error,
        loading: false,
        lastRefreshedAt: refreshedAt
      });
    },
    gitStatusFailed: (state, action) => {
      const { collectionUid, error } = action.payload;
      const collectionGit = ensureCollection(state, collectionUid);
      collectionGit.loading = false;
      collectionGit.error = error;
    },
    gitOperationStarted: (state, action) => {
      const { collectionUid, operation, operationUid = null } = action.payload;
      const collectionGit = ensureCollection(state, collectionUid);
      collectionGit.operation = operation;
      collectionGit.operationUid = operationUid;
      collectionGit.error = null;
    },
    gitOperationFinished: (state, action) => {
      const { collectionUid, error = null } = action.payload;
      const collectionGit = ensureCollection(state, collectionUid);
      collectionGit.operation = null;
      collectionGit.error = error;
    }
  }
});

export const {
  toggleGitPanel,
  closeGitPanel,
  clearGitError,
  gitStatusRequested, gitStatusReceived, gitStatusFailed, gitOperationStarted, gitOperationFinished } = gitSlice.actions;

export default gitSlice.reducer;
