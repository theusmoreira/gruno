import { useDispatch } from 'react-redux';
import Button from 'ui/Button';
import { initGitRepository } from 'providers/ReduxStore/slices/git/actions';

const GitEmptyState = ({ collectionUid, busy }) => {
  const dispatch = useDispatch();

  // A failure is already shown by the panel's error banner.
  const handleInit = () => dispatch(initGitRepository(collectionUid)).catch(() => {});

  return (
    <div className="flex flex-col gap-3" data-testid="git-empty-state">
      <div className="git-panel-notice">This collection is not inside a Git repository.</div>
      <Button size="sm" onClick={handleInit} loading={busy} data-testid="git-init-button">
        Initialize repository
      </Button>
    </div>
  );
};

export default GitEmptyState;
