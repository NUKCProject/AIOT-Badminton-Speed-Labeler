import React from 'react';
import { Button } from '@mui/material';

function PlayPauseButton({ videoRef, isPaused, setIsPaused }) {
  const handleClick = () => {
    if (!videoRef.current) return;
    setIsPaused(!isPaused);
  };

  return (
    <Button      variant={!isPaused ? 'outlined' : 'contained'}
      color="primary"
      onClick={handleClick}
      sx={{ minWidth: 44, minHeight: 44, borderRadius: 2, p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      title={!isPaused ? '暫停' : '播放'}
    >
      <i
        className={!isPaused ? 'fa-solid fa-pause' : 'fa-solid fa-play'}
        style={{ fontSize: 22, color: 'white' }}
      ></i>
    </Button>
  );
}

export default PlayPauseButton;
