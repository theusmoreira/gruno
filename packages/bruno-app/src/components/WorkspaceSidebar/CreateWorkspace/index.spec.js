import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { createWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import CreateWorkspace from './index';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectory: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/workspaces/actions', () => ({
  createWorkspaceAction: jest.fn(() => ({ type: 'createWorkspace' }))
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('components/Help', () => () => null);

jest.mock('components/Modal', () => (props) => (
  <div>
    {props.children}
    <button type="button" onClick={props.handleConfirm}>{props.confirmText}</button>
  </div>
));

const renderForm = () => render(
  <ThemeProvider theme={themes.light}>
    <CreateWorkspace onClose={jest.fn()} />
  </ThemeProvider>
);

const chooseFolder = async (path) => {
  browseDirectory.mockReturnValueOnce({ type: 'browse', path });
  fireEvent.click(screen.getByTestId('workspace-scan-folder-browse'));
  await waitFor(() => expect(screen.getByTestId('workspace-scan-folder-input')).toHaveValue(path));
};

const submit = async () => {
  fireEvent.change(document.getElementById('workspace-name'), { target: { value: 'Team' } });
  fireEvent.click(screen.getByText('Create Workspace'));
  await waitFor(() => expect(createWorkspaceAction).toHaveBeenCalled());
};

describe('CreateWorkspace folder to scan', () => {
  beforeEach(() => {
    useSelector.mockImplementation((selector) => selector({
      app: { preferences: { general: { defaultLocation: '/home/dev/workspaces' } } }
    }));
    useDispatch.mockReturnValue((action) => (action && action.type === 'browse' ? Promise.resolve(action.path) : Promise.resolve()));
  });

  it('passes the chosen folder as the scan root on submit', async () => {
    renderForm();
    await chooseFolder('/home/dev/repos');
    await submit();

    expect(createWorkspaceAction).toHaveBeenCalledWith('Team', 'Team', '/home/dev/workspaces', '/home/dev/repos');
  });

  it('does not pass a scan root when the field is left empty', async () => {
    renderForm();
    await submit();

    const args = createWorkspaceAction.mock.calls[0];
    expect(args.slice(0, 3)).toEqual(['Team', 'Team', '/home/dev/workspaces']);
    expect(args[3]).toBeUndefined();
  });

  it('clears the chosen folder', async () => {
    renderForm();
    expect(screen.queryByTestId('workspace-scan-folder-clear')).not.toBeInTheDocument();
    await chooseFolder('/home/dev/repos');

    fireEvent.click(screen.getByTestId('workspace-scan-folder-clear'));
    await waitFor(() => expect(screen.getByTestId('workspace-scan-folder-input')).toHaveValue(''));
    expect(screen.queryByTestId('workspace-scan-folder-clear')).not.toBeInTheDocument();

    await submit();
    expect(createWorkspaceAction.mock.calls[0][3]).toBeUndefined();
  });
});
