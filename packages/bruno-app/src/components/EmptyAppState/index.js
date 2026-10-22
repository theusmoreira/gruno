import React from 'react';
import { IconAppWindow } from '@tabler/icons';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const EmptyAppState = ({ title = 'No app yet', hint, onAddCode }) => {
  return (
    <StyledWrapper data-testid="empty-app-state">
      <div className="empty-app-inner">
        <IconAppWindow size={32} strokeWidth={1.25} />
        <div className="empty-app-title">{title}</div>
        {hint ? <div className="empty-app-hint">{hint}</div> : null}
        {onAddCode ? (
          <div className="empty-app-actions">
            <Button
              size="sm"
              variant="filled"
              color="primary"
              onClick={onAddCode}
              data-testid="empty-app-add-code"
            >
              Add app code
            </Button>
          </div>
        ) : null}
      </div>
    </StyledWrapper>
  );
};

export default EmptyAppState;
