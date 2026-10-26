jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

jest.mock('../collections/actions', () => ({
  createCollection: jest.fn(() => () => Promise.resolve()),
  openMultipleCollections: jest.fn(() => () => Promise.resolve({ opened: [], failed: [], invalid: [] })),
  openScratchCollectionEvent: jest.fn(() => () => Promise.resolve()),
  mountCollection: jest.fn(() => () => Promise.resolve()),
  hydrateCollectionWithUiStateSnapshot: jest.fn(() => () => Promise.resolve())
}));

import { configureStore } from '@reduxjs/toolkit';
import workspacesReducer from './index';
import collectionsReducer from '../collections';
import chatReducer from '../chat';
import appReducer from '../app';
import tabsReducer from '../tabs';
import globalEnvironmentsReducer from '../global-environments';

const WS = 'workspace-a';
const WS_PATH = '/tmp/workspace-a';

const makeSummary = (overrides = {}) => ({
  found: 3,
  added: 2,
  alreadyExisted: 1,
  absent: [],
  problems: [],
  ...overrides
});

const createStore = () => {
  return configureStore({
    reducer: {
      workspaces: workspacesReducer,
      collections: collectionsReducer,
      chat: chatReducer,
      app: appReducer,
      tabs: tabsReducer,
      globalEnvironments: globalEnvironmentsReducer
    },
    preloadedState: {
      workspaces: {
        workspaces: [{ uid: WS, name: WS, pathname: WS_PATH, collections: [] }],
        activeWorkspaceUid: WS
      }
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false, immutableCheck: false })
  });
};

const defaultInvoke = (channel) => {
  if (channel === 'renderer:get-global-environments') {
    return Promise.resolve({ globalEnvironments: [], activeGlobalEnvironmentUid: null });
  }
  if (channel === 'renderer:mock-server-list-instances') {
    return Promise.resolve({ success: true, instances: [] });
  }
  return Promise.resolve(null);
};

describe('collection discovery in the renderer', () => {
  let actions;

  beforeAll(async () => {
    window.ipcRenderer = { invoke: jest.fn(defaultInvoke) };
    actions = await import('./actions');
  });

  beforeEach(() => {
    // actions.js captures `const { ipcRenderer } = window` at import time, so mutate the existing object.
    window.ipcRenderer.invoke = jest.fn(defaultInvoke);
  });

  describe('scanWorkspaceCollectionsAction', () => {
    it('marks the workspace as scanning while the scan runs and returns the summary', async () => {
      let finishScan;
      window.ipcRenderer.invoke = jest.fn((channel) => {
        if (channel === 'renderer:scan-workspace-collections') {
          return new Promise((resolve) => {
            finishScan = resolve;
          });
        }
        return defaultInvoke(channel);
      });
      const store = createStore();

      const pending = store.dispatch(actions.scanWorkspaceCollectionsAction(WS));
      expect(store.getState().workspaces.workspaces[0].scan.scanning).toBe(true);
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:scan-workspace-collections', WS_PATH);

      finishScan(makeSummary());

      await expect(pending).resolves.toEqual(makeSummary());
      expect(store.getState().workspaces.workspaces[0].scan.scanning).toBe(false);
    });

    it('does not start a second scan while one is running', async () => {
      let finishScan;
      window.ipcRenderer.invoke = jest.fn((channel) => {
        if (channel === 'renderer:scan-workspace-collections') {
          return new Promise((resolve) => {
            finishScan = resolve;
          });
        }
        return defaultInvoke(channel);
      });
      const store = createStore();

      const first = store.dispatch(actions.scanWorkspaceCollectionsAction(WS));
      const second = await store.dispatch(actions.scanWorkspaceCollectionsAction(WS));
      finishScan(makeSummary());
      await first;

      expect(second).toBeNull();
      const scanCalls = window.ipcRenderer.invoke.mock.calls.filter(([channel]) => channel === 'renderer:scan-workspace-collections');
      expect(scanCalls).toHaveLength(1);
    });

    it('clears the scanning flag when the scan fails', async () => {
      window.ipcRenderer.invoke = jest.fn((channel) => {
        if (channel === 'renderer:scan-workspace-collections') {
          return Promise.reject(new Error('boom'));
        }
        return defaultInvoke(channel);
      });
      const store = createStore();

      await expect(store.dispatch(actions.scanWorkspaceCollectionsAction(WS))).rejects.toThrow('boom');
      expect(store.getState().workspaces.workspaces[0].scan.scanning).toBe(false);
    });
  });

  describe('workspaceScanCompletedEvent', () => {
    it('stores the summary announced by the main process', () => {
      const store = createStore();
      const summary = makeSummary({ problems: [{ path: '/tmp/repos/x', reason: 'no read permission' }] });

      store.dispatch(actions.workspaceScanCompletedEvent(WS_PATH, WS, summary));

      expect(store.getState().workspaces.workspaces[0].scan).toEqual({ scanning: false, summary });
    });
  });

  describe('createWorkspaceAction', () => {
    const mockCreateFlow = () => {
      window.ipcRenderer.invoke = jest.fn((channel) => {
        if (channel === 'renderer:create-workspace') {
          return Promise.resolve({ workspaceConfig: { name: 'New' }, workspaceUid: 'new-ws', workspacePath: '/tmp/new-ws' });
        }
        if (channel === 'renderer:scan-workspace-collections') {
          return Promise.resolve(makeSummary());
        }
        return defaultInvoke(channel);
      });
    };

    it('saves the scan folder and scans it after creating the workspace', async () => {
      mockCreateFlow();
      const store = createStore();

      await store.dispatch(actions.createWorkspaceAction('New', 'new', '/tmp', '/tmp/repos'));

      const channels = window.ipcRenderer.invoke.mock.calls.map(([channel]) => channel);
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:set-workspace-scan-root', '/tmp/new-ws', '/tmp/repos');
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:scan-workspace-collections', '/tmp/new-ws');
      expect(channels.indexOf('renderer:set-workspace-scan-root')).toBeLessThan(channels.indexOf('renderer:scan-workspace-collections'));
    });

    it('does not scan when no scan folder was chosen', async () => {
      mockCreateFlow();
      const store = createStore();

      await store.dispatch(actions.createWorkspaceAction('New', 'new', '/tmp'));

      const channels = window.ipcRenderer.invoke.mock.calls.map(([channel]) => channel);
      expect(channels).not.toContain('renderer:set-workspace-scan-root');
      expect(channels).not.toContain('renderer:scan-workspace-collections');
    });

    it('still creates the workspace when the scan fails', async () => {
      window.ipcRenderer.invoke = jest.fn((channel) => {
        if (channel === 'renderer:create-workspace') {
          return Promise.resolve({ workspaceConfig: { name: 'New' }, workspaceUid: 'new-ws', workspacePath: '/tmp/new-ws' });
        }
        if (channel === 'renderer:scan-workspace-collections') {
          return Promise.reject(new Error('boom'));
        }
        return defaultInvoke(channel);
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const store = createStore();

      await expect(store.dispatch(actions.createWorkspaceAction('New', 'new', '/tmp', '/tmp/repos'))).resolves.toBeDefined();

      expect(store.getState().workspaces.workspaces.some((w) => w.uid === 'new-ws')).toBe(true);
      consoleError.mockRestore();
    });
  });
});
