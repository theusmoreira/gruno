import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { IconRefresh, IconSettings, IconX } from '@tabler/icons';
import toast from 'react-hot-toast';
import {
  scanWorkspaceCollectionsAction,
  getWorkspaceScanRootAction,
  setWorkspaceScanRootAction
} from 'providers/ReduxStore/slices/workspaces/actions';
import { formatScanSummary, hasScanDetails } from './utils';
import StyledWrapper from './StyledWrapper';

const ScanCollections = ({ workspace }) => {
  const dispatch = useDispatch();
  const [dismissedSummary, setDismissedSummary] = useState(null);

  const scanning = !!workspace?.scan?.scanning;
  const summary = workspace?.scan?.summary;
  const showPanel = !!summary && summary !== dismissedSummary;

  const browseForScanRoot = async () => {
    const folder = await window.ipcRenderer.invoke('renderer:browse-directory');
    if (!folder) return null;
    await dispatch(setWorkspaceScanRootAction(workspace.pathname, folder));
    return folder;
  };

  const handleScan = async () => {
    if (scanning || !workspace?.pathname) return;
    try {
      let scanRoot = await dispatch(getWorkspaceScanRootAction(workspace.pathname));
      if (!scanRoot) {
        scanRoot = await browseForScanRoot();
        if (!scanRoot) return;
      }
      const result = await dispatch(scanWorkspaceCollectionsAction(workspace.uid));
      if (result) {
        toast.success(formatScanSummary(result));
      }
    } catch (error) {
      console.error('Collection scan failed', error);
      toast.error('Collection scan failed');
    }
  };

  const handleChangeFolder = async () => {
    if (!workspace?.pathname) return;
    try {
      const folder = await browseForScanRoot();
      if (folder) {
        toast.success('Scan folder updated');
      }
    } catch (error) {
      console.error('Could not save the scan folder', error);
      toast.error('Could not save the scan folder');
    }
  };

  return (
    <StyledWrapper>
      <div className="scan-actions">
        <button
          type="button"
          className="scan-button"
          data-testid="scan-collections-button"
          disabled={scanning}
          onClick={handleScan}
        >
          <IconRefresh size={14} strokeWidth={1.5} />
          <span>{scanning ? 'Scanning...' : 'Scan now'}</span>
        </button>
        <button
          type="button"
          className="scan-button"
          data-testid="scan-folder-change"
          title="Change scan folder"
          aria-label="Change scan folder"
          disabled={scanning}
          onClick={handleChangeFolder}
        >
          <IconSettings size={14} strokeWidth={1.5} />
        </button>
      </div>

      {showPanel && (
        <div className="scan-panel">
          <div className="scan-panel-header">
            <span data-testid="scan-summary">{formatScanSummary(summary)}</span>
            <button
              type="button"
              className="scan-dismiss"
              data-testid="scan-dismiss"
              aria-label="Dismiss scan summary"
              onClick={() => setDismissedSummary(summary)}
            >
              <IconX size={14} strokeWidth={1.5} />
            </button>
          </div>

          {hasScanDetails(summary) && (
            <>
              {(summary.problems || []).length > 0 && (
                <>
                  <div className="scan-section-title">Problems</div>
                  <ul className="scan-list" data-testid="scan-problems-list">
                    {summary.problems.map((problem, index) => (
                      <li key={`${problem.path}-${index}`} className="scan-item" data-testid="scan-problem-item">
                        <div>{problem.path}</div>
                        <div className="scan-item-detail">{problem.reason}</div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {(summary.absent || []).length > 0 && (
                <>
                  <div className="scan-section-title">Absent from disk</div>
                  <ul className="scan-list" data-testid="scan-absent-list">
                    {summary.absent.map((item) => (
                      <li key={item.path} className="scan-item" data-testid="scan-absent-item">
                        <div>{item.name}</div>
                        <div className="scan-item-detail">{item.path}</div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      )}
    </StyledWrapper>
  );
};

export default ScanCollections;
