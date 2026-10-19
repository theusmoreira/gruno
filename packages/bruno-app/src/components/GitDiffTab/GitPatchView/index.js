import StyledWrapper from './StyledWrapper';

/*
 * Turns a unified diff into display rows. The file header (diff --git, index, ---, +++) is dropped:
 * the tab already names the file, and the header paths are absolute for untracked files.
 */
export const parsePatchLines = (patch) => {
  const rows = [];
  let inHunk = false;

  patch.split(/\r?\n/).forEach((line) => {
    if (line.startsWith('@@')) {
      inHunk = true;
      rows.push({ kind: 'hunk', text: line });
      return;
    }
    if (!inHunk) {
      if (line.startsWith('Binary files')) {
        rows.push({ kind: 'meta', text: line });
      }
      return;
    }
    if (line.startsWith('+')) {
      rows.push({ kind: 'added', text: line.slice(1) });
    } else if (line.startsWith('-')) {
      rows.push({ kind: 'deleted', text: line.slice(1) });
    } else if (line.startsWith('\\')) {
      rows.push({ kind: 'meta', text: line });
    } else if (line.startsWith('diff --git')) {
      inHunk = false;
    } else {
      rows.push({ kind: 'context', text: line.slice(1) });
    }
  });

  while (rows.length > 0 && rows[rows.length - 1].kind === 'context' && rows[rows.length - 1].text === '') {
    rows.pop();
  }
  return rows;
};

const ROW_MARKERS = { added: '+', deleted: '-', context: ' ', hunk: '', meta: '' };

const GitPatchView = ({ patch }) => {
  const rows = parsePatchLines(patch);

  return (
    <StyledWrapper data-testid="git-patch-view">
      {rows.map((row, index) => (
        <div key={index} className={`patch-row ${row.kind}`}>
          <span className="patch-marker">{ROW_MARKERS[row.kind]}</span>
          <span className="patch-text">{row.text}</span>
        </div>
      ))}
    </StyledWrapper>
  );
};

export default GitPatchView;
