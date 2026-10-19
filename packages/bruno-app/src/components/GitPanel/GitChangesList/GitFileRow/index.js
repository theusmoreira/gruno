import ActionIcon from 'ui/ActionIcon';

const STATUS_LABELS = {
  M: 'Modified',
  A: 'Added',
  D: 'Deleted',
  R: 'Renamed',
  U: 'Untracked',
  C: 'Conflicted'
};

const splitPath = (filePath) => {
  const separatorIndex = filePath.lastIndexOf('/');
  return separatorIndex === -1
    ? { name: filePath, directory: '' }
    : { name: filePath.slice(separatorIndex + 1), directory: filePath.slice(0, separatorIndex) };
};

const GitFileRow = ({ file, statusCode, actionLabel, actionIcon, onAction, disabled }) => {
  const { name, directory } = splitPath(file.path);

  return (
    <li className="git-file-row" title={file.path} data-testid={`git-file-${file.path}`}>
      <span className="git-file-name">{name}</span>
      {directory && <span className="git-file-directory">{directory}</span>}
      <span className={`git-file-status status-${statusCode}`} title={STATUS_LABELS[statusCode]}>
        {statusCode}
      </span>
      {onAction && (
        <ActionIcon label={actionLabel} size="sm" disabled={disabled} onClick={() => onAction(file)}>
          {actionIcon}
        </ActionIcon>
      )}
    </li>
  );
};

export default GitFileRow;
