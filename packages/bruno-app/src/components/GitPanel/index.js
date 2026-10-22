import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconGitBranch, IconRefresh, IconX } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import ErrorBanner from 'ui/ErrorBanner';
import { closeGitPanel, clearGitError } from 'providers/ReduxStore/slices/git';
import { refreshGitStatus } from 'providers/ReduxStore/slices/git/actions';
import GitEmptyState from './GitEmptyState';
import GitCommitBox from './GitCommitBox';
import GitChangesList from './GitChangesList';
import GitSyncActions from './GitSyncActions';
import GitOperationLog from './GitOperationLog';
import StyledWrapper from './StyledWrapper';

const GitPanelContent = ({ collectionUid, gitState }) => {
  if (!gitState || (gitState.loading && !gitState.lastRefreshedAt)) {
    return <div className="git-panel-notice">Loading Git status…</div>;
  }

  if (!gitState.isRepo) {
    return <GitEmptyState collectionUid={collectionUid} busy={Boolean(gitState.operation)} />;
  }

  return (
    <>
      <GitSyncActions collectionUid={collectionUid} gitState={gitState} />
      <GitOperationLog operationUid={gitState.operationUid} />
      <GitCommitBox collectionUid={collectionUid} gitState={gitState} />
      <GitChangesList collectionUid={collectionUid} gitState={gitState} />
    </>
  );
};

const GitPanel = ({ collection }) => {
  const dispatch = useDispatch();
  const collectionUid = collection.uid;
  const gitVersion = useSelector((state) => state.app.gitVersion);
  const gitState = useSelector((state) => state.git.byCollection[collectionUid]);

  // The panel follows the active tab's collection; load that collection's status when it changes.
  useEffect(() => {
    dispatch(refreshGitStatus(collectionUid));
  }, [collectionUid, dispatch]);

  return (
    <StyledWrapper data-testid="git-panel">
      <div className="git-panel">
        <div className="git-panel-header">
          <div className="git-panel-title">
            <IconGitBranch size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>Git</span>
            {gitState?.branch && <span className="git-panel-branch" data-testid="git-panel-branch">{gitState.branch}</span>}
          </div>
          <div className="flex items-center gap-1">
            <ActionIcon
              label="Refresh Git status"
              size="sm"
              disabled={!gitVersion || gitState?.loading}
              onClick={() => dispatch(refreshGitStatus(collectionUid))}
              data-testid="git-refresh-button"
            >
              <IconRefresh size={14} strokeWidth={1.5} />
            </ActionIcon>
            <ActionIcon label="Close Git panel" size="sm" onClick={() => dispatch(closeGitPanel())} data-testid="git-panel-close">
              <IconX size={14} strokeWidth={1.5} />
            </ActionIcon>
          </div>
        </div>

        <div className="git-panel-body">
          {gitState?.error && (
            <div data-testid="git-error">
              <ErrorBanner
                errors={[{ title: 'Git', message: gitState.error }]}
                onClose={() => dispatch(clearGitError({ collectionUid }))}
              />
            </div>
          )}
          {gitVersion ? (
            <GitPanelContent collectionUid={collectionUid} gitState={gitState} />
          ) : (
            <div className="git-panel-notice" data-testid="git-not-installed">
              Git was not found on this computer. Install Git and restart the app to use this panel.
            </div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default GitPanel;
