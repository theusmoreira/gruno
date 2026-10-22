import { useState } from 'react';
import { useDispatch } from 'react-redux';
import Button from 'ui/Button';
import { commitGitChanges } from 'providers/ReduxStore/slices/git/actions';
import StyledWrapper from './StyledWrapper';

const GitCommitBox = ({ collectionUid, gitState }) => {
  const dispatch = useDispatch();
  const [message, setMessage] = useState('');
  const { operation, staged } = gitState;
  const canCommit = !operation && staged.length > 0 && message.trim().length > 0;

  const handleCommit = async () => {
    if (!canCommit) {
      return;
    }
    try {
      await dispatch(commitGitChanges(collectionUid, message));
      setMessage('');
    } catch {
      // The panel's error banner shows the failure; the message is kept so it can be retried.
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleCommit();
    }
  };

  return (
    <StyledWrapper className="flex flex-col gap-2">
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Commit message (Ctrl/Cmd + Enter to commit)"
        rows={3}
        data-testid="git-commit-message"
      />
      <Button
        size="sm"
        fullWidth
        disabled={!canCommit}
        loading={operation === 'commit'}
        onClick={handleCommit}
        data-testid="git-commit-button"
      >
        Commit{staged.length > 0 ? ` ${staged.length} file${staged.length === 1 ? '' : 's'}` : ''}
      </Button>
    </StyledWrapper>
  );
};

export default GitCommitBox;
