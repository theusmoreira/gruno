/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import light from 'themes/light/light';
import appReducer from 'providers/ReduxStore/slices/app';
import gitReducer from 'providers/ReduxStore/slices/git';
import GitPanel from './index';

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'uid-1'
}));

const collection = { uid: 'col-1', pathname: '/repo/collections/api' };
const collectionPath = collection.pathname;

const repoStatus = (overrides = {}) => ({
  isRepo: true,
  hasRemote: true,
  branch: 'main',
  ahead: 0,
  behind: 0,
  staged: [],
  unstaged: [],
  conflicted: [],
  tooManyFiles: false,
  ...overrides
});

const renderPanel = ({ gitVersion = 'git version 2.43.0' } = {}) => {
  const store = configureStore({
    reducer: {
      app: appReducer,
      git: gitReducer,
      collections: () => ({ collections: [collection] })
    },
    preloadedState: {
      app: { ...appReducer(undefined, { type: 'init' }), gitVersion }
    }
  });

  render(
    <Provider store={store}>
      <ThemeProvider theme={light}>
        <GitPanel collection={collection} />
      </ThemeProvider>
    </Provider>
  );
  return store;
};

describe('GitPanel', () => {
  let invoke;

  beforeEach(() => {
    invoke = jest.fn();
    window.ipcRenderer = { invoke };
  });

  it('offers to initialise a repository when the collection is not in one', async () => {
    invoke.mockResolvedValueOnce({ isRepo: false }).mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce(repoStatus());
    renderPanel();

    fireEvent.click(await screen.findByTestId('git-init-button'));

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('renderer:git-init', { collectionPath }));
    expect(await screen.findByTestId('git-panel-branch')).toHaveTextContent('main');
  });

  it('stages a changed file and commits it with the typed message', async () => {
    const file = { path: 'collections/api/get-user.bru', fileIndex: ' ', working_dir: 'M' };
    invoke
      .mockResolvedValueOnce(repoStatus({ unstaged: [file] }))
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce(repoStatus({ staged: [{ ...file, fileIndex: 'M', working_dir: ' ' }] }))
      .mockResolvedValueOnce({ hash: 'abc', summary: {} })
      .mockResolvedValueOnce(repoStatus({ ahead: 1 }));
    renderPanel();

    expect(await screen.findByTestId('git-commit-button')).toBeDisabled();
    fireEvent.click(await screen.findByTestId('git-stage-all'));
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('renderer:git-stage', { collectionPath, files: [file.path] })
    );

    await screen.findByTestId('git-staged-changes');
    fireEvent.change(screen.getByTestId('git-commit-message'), { target: { value: 'update user request' } });
    fireEvent.click(screen.getByTestId('git-commit-button'));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('renderer:git-commit', { collectionPath, message: 'update user request' })
    );
    await waitFor(() => expect(screen.getByTestId('git-commit-message')).toHaveValue(''));
    expect(screen.getByTestId('git-push-button')).toBeEnabled();
    expect(screen.getByTestId('git-push-button')).toHaveTextContent('Push (1)');
  });

  it('shows a failed push in the error banner and keeps the panel usable', async () => {
    invoke
      .mockResolvedValueOnce(repoStatus({ ahead: 1 }))
      .mockRejectedValueOnce(new Error('Error invoking remote method \'renderer:git-push\': Error: Authentication failed. Configure your Git credentials.'))
      .mockResolvedValueOnce(repoStatus({ ahead: 1 }));
    renderPanel();

    fireEvent.click(await screen.findByTestId('git-push-button'));

    expect(await screen.findByTestId('git-error')).toHaveTextContent('Authentication failed. Configure your Git credentials.');
    expect(screen.getByTestId('git-push-button')).toBeEnabled();
  });

  it('disables pull and push and explains why when there is no remote', async () => {
    invoke.mockResolvedValue(repoStatus({ hasRemote: false, ahead: 2 }));
    renderPanel();

    expect(await screen.findByTestId('git-no-remote')).toBeInTheDocument();
    expect(screen.getByTestId('git-pull-button')).toBeDisabled();
    expect(screen.getByTestId('git-push-button')).toBeDisabled();
    expect(screen.getByTestId('git-push-button')).toHaveTextContent(/^Push$/);
  });

  it('explains that Git is missing instead of calling it', async () => {
    invoke.mockResolvedValue(repoStatus());
    renderPanel({ gitVersion: null });

    expect(await screen.findByTestId('git-not-installed')).toBeInTheDocument();
    expect(screen.queryByTestId('git-commit-button')).not.toBeInTheDocument();
  });
});
