/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import light from 'themes/light/light';
import gitReducer, { gitStatusReceived } from 'providers/ReduxStore/slices/git';
import GitDiffTab from './index';
import { parsePatchLines } from './GitPatchView';

const collection = { uid: 'col-1', pathname: '/repo/collections/api' };
const gitDiff = { path: 'collections/api/get-user.bru', changeType: 'unstaged' };

const request = (url) => ({ name: 'get user', request: { method: 'GET', url, params: [], headers: [] } });
const patch = [
  'diff --git /repo/collections/api/get-user.bru /repo/collections/api/get-user.bru',
  'index 1111111..2222222 100644',
  '--- /repo/collections/api/get-user.bru',
  '+++ /repo/collections/api/get-user.bru',
  '@@ -6,3 +6,3 @@ meta {',
  ' get {',
  '-  url: https://api.example.com/users/1',
  '+  url: https://api.example.com/users/2',
  ' }',
  ''
].join('\n');

const renderTab = () => {
  const store = configureStore({ reducer: { git: gitReducer } });
  render(
    <Provider store={store}>
      <ThemeProvider theme={light}>
        <GitDiffTab collection={collection} gitDiff={gitDiff} />
      </ThemeProvider>
    </Provider>
  );
  return store;
};

describe('parsePatchLines', () => {
  it('drops the file header and classifies hunk, context, added and deleted lines', () => {
    expect(parsePatchLines(patch)).toEqual([
      { kind: 'hunk', text: '@@ -6,3 +6,3 @@ meta {' },
      { kind: 'context', text: 'get {' },
      { kind: 'deleted', text: '  url: https://api.example.com/users/1' },
      { kind: 'added', text: '  url: https://api.example.com/users/2' },
      { kind: 'context', text: '}' }
    ]);
  });
});

describe('GitDiffTab', () => {
  let invoke;

  beforeEach(() => {
    invoke = jest.fn();
    window.ipcRenderer = { invoke };
  });

  it('opens on the visual diff of a request and switches to the text patch', async () => {
    invoke.mockResolvedValue({
      ...gitDiff,
      patch,
      isTooLarge: false,
      oldParsed: request('https://api.example.com/users/1'),
      newParsed: request('https://api.example.com/users/2')
    });
    renderTab();

    expect(await screen.findByText('URL')).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith('renderer:git-file-diff', {
      collectionPath: collection.pathname,
      file: gitDiff.path,
      changeType: 'unstaged'
    });

    fireEvent.click(screen.getByRole('radio', { name: 'Text' }));

    expect(screen.getByTestId('git-patch-view')).toHaveTextContent('url: https://api.example.com/users/2');
  });

  it('shows the text patch for a file that is not a request', async () => {
    invoke.mockResolvedValue({ ...gitDiff, path: 'collections/api/notes.txt', patch, isTooLarge: false, oldParsed: null, newParsed: null });
    renderTab();

    expect(await screen.findByTestId('git-patch-view')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Visual' })).toBeDisabled();
  });

  it('points to the text view when only scripts or docs changed', async () => {
    const unchanged = request('https://api.example.com/users/1');
    invoke.mockResolvedValue({ ...gitDiff, patch, isTooLarge: false, oldParsed: unchanged, newParsed: unchanged });
    renderTab();

    expect(await screen.findByTestId('git-diff-no-visual-changes')).toBeInTheDocument();
  });

  it('reloads the diff when the Git status refreshes', async () => {
    invoke.mockResolvedValue({ ...gitDiff, patch: '', isTooLarge: false, oldParsed: null, newParsed: null });
    const store = renderTab();
    expect(await screen.findByTestId('git-diff-empty')).toBeInTheDocument();

    invoke.mockResolvedValue({ ...gitDiff, patch, isTooLarge: false, oldParsed: null, newParsed: null });
    act(() => {
      store.dispatch(gitStatusReceived({ collectionUid: collection.uid, status: { isRepo: true }, refreshedAt: 2 }));
    });

    expect(await screen.findByTestId('git-patch-view')).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('shows the error when the diff cannot be read', async () => {
    invoke.mockRejectedValue(new Error('Error invoking remote method \'renderer:git-file-diff\': Error: File is outside the collection: x'));
    renderTab();

    expect(await screen.findByTestId('git-diff-error')).toHaveTextContent('File is outside the collection: x');
  });
});
