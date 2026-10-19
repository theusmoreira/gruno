import { useDispatch } from 'react-redux';
import { IconArrowDown, IconArrowUp } from '@tabler/icons';
import Button from 'ui/Button';
import { pullGitBranch, pushGitBranch } from 'providers/ReduxStore/slices/git/actions';

const GitSyncActions = ({ collectionUid, gitState }) => {
  const dispatch = useDispatch();
  const { operation, ahead, behind, branch } = gitState;
  const busy = Boolean(operation);

  // Failures are already shown by the panel's error banner.
  const handlePull = () => dispatch(pullGitBranch(collectionUid)).catch(() => {});
  const handlePush = () => dispatch(pushGitBranch(collectionUid)).catch(() => {});

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        color="secondary"
        fullWidth
        icon={<IconArrowDown size={14} strokeWidth={1.5} />}
        disabled={busy || !branch}
        loading={operation === 'pull'}
        onClick={handlePull}
        data-testid="git-pull-button"
      >
        Pull{behind > 0 ? ` (${behind})` : ''}
      </Button>
      <Button
        size="sm"
        variant="outline"
        color="secondary"
        fullWidth
        icon={<IconArrowUp size={14} strokeWidth={1.5} />}
        disabled={busy || !branch || ahead === 0}
        loading={operation === 'push'}
        onClick={handlePush}
        data-testid="git-push-button"
      >
        Push{ahead > 0 ? ` (${ahead})` : ''}
      </Button>
    </div>
  );
};

export default GitSyncActions;
