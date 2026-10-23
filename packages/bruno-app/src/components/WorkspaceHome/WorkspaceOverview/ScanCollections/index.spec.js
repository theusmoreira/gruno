import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import ScanCollections from './index';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn()
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('providers/ReduxStore/slices/workspaces/actions', () => ({
  scanWorkspaceCollectionsAction: jest.fn((uid) => ({ type: 'scan', uid })),
  getWorkspaceScanRootAction: jest.fn((path) => ({ type: 'get-root', path })),
  setWorkspaceScanRootAction: jest.fn((path, root) => ({ type: 'set-root', path, root }))
}));

const summary = {
  found: 7,
  added: 5,
  alreadyExisted: 2,
  absent: [{ name: 'billing', path: '/repos/billing/gruno' }],
  problems: [{ path: '/repos/locked', reason: 'No read permission' }]
};

const baseWorkspace = { uid: 'ws1', pathname: '/ws' };

describe('ScanCollections', () => {
  let scanRoot;
  let scanResult;
  let browseResult;

  beforeEach(() => {
    scanRoot = '/repos';
    scanResult = summary;
    browseResult = '/picked';
    useDispatch.mockReturnValue(async (action) => {
      if (action.type === 'get-root') return scanRoot;
      if (action.type === 'scan') return scanResult;
      return undefined;
    });
    window.ipcRenderer = { invoke: jest.fn(async () => browseResult) };
  });

  it('is disabled and shows the scanning state while a scan runs', () => {
    render(<ScanCollections workspace={{ ...baseWorkspace, scan: { scanning: true } }} />);
    const button = screen.getByTestId('scan-collections-button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Scanning...');
  });

  it('scans and toasts the summary when a scan folder is configured', async () => {
    render(<ScanCollections workspace={baseWorkspace} />);
    fireEvent.click(screen.getByTestId('scan-collections-button'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('7 found, 5 added, 2 already existed'));
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });

  it('asks for a folder first when none is configured', async () => {
    scanRoot = null;
    render(<ScanCollections workspace={baseWorkspace} />);
    fireEvent.click(screen.getByTestId('scan-collections-button'));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:browse-directory');
  });

  it('does not scan when the folder dialog is cancelled', async () => {
    scanRoot = null;
    browseResult = null;
    render(<ScanCollections workspace={baseWorkspace} />);
    fireEvent.click(screen.getByTestId('scan-collections-button'));
    await waitFor(() => expect(window.ipcRenderer.invoke).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('renders the summary, problems and absent lists, and can be dismissed', () => {
    render(<ScanCollections workspace={{ ...baseWorkspace, scan: { scanning: false, summary } }} />);
    expect(screen.getByTestId('scan-summary')).toHaveTextContent('7 found, 5 added, 2 already existed');
    expect(screen.getAllByTestId('scan-problem-item')).toHaveLength(1);
    expect(screen.getByTestId('scan-problems-list')).toHaveTextContent('No read permission');
    expect(screen.getByTestId('scan-absent-list')).toHaveTextContent('/repos/billing/gruno');

    fireEvent.click(screen.getByTestId('scan-dismiss'));
    expect(screen.queryByTestId('scan-summary')).not.toBeInTheDocument();
  });

  it('omits the lists when there is nothing to report', () => {
    const clean = { found: 1, added: 1, alreadyExisted: 0, absent: [], problems: [] };
    render(<ScanCollections workspace={{ ...baseWorkspace, scan: { scanning: false, summary: clean } }} />);
    expect(screen.getByTestId('scan-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('scan-problems-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('scan-absent-list')).not.toBeInTheDocument();
  });
});
