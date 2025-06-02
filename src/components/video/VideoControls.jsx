import React from 'react';
import PlayPauseButton from './PlayPauseButton';
import TimeDisplay from './TimeDisplay';

const playbackOptions = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function VideoControls({ 
  videoRef, 
  current, 
  duration, 
  playbackRate, 
  setPlaybackRate,
  onSeekChange,
  onStepClick,
  isPaused,
  setIsPaused
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      background: 'rgba(30,30,30,0.85)',
      padding: '8px 16px',
      borderRadius: 12,
      marginTop: 12,
      width: '100%',
      maxWidth: '100%',
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      overflow: 'hidden'
    }}>
      <PlayPauseButton videoRef={videoRef} isPaused={isPaused} setIsPaused={setIsPaused} />
      {/* 功能按鈕 */}
      <button onClick={() => onStepClick('backward1s')} title="倒退1秒" style={{padding: '6px 10px', borderRadius: 6, marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer'}}>
        <i className="fa-solid fa-backward" style={{fontSize: 18, color: 'white'}}></i>
      </button>
      <button onClick={() => onStepClick('backward1f')} title="倒退1幀" style={{padding: '6px 10px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer'}}>
        <i className="fa-solid fa-backward-step" style={{fontSize: 18, color: 'white'}}></i>
      </button>
      <button onClick={() => onStepClick('forward1f')} title="前進1幀" style={{padding: '6px 10px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer'}}>
        <i className="fa-solid fa-forward-step" style={{fontSize: 18, color: 'white'}}></i>
      </button>
      <button onClick={() => onStepClick('forward1s')} title="前進1秒" style={{padding: '6px 10px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer'}}>
        <i className="fa-solid fa-forward" style={{fontSize: 18, color: 'white'}}></i>
      </button>
      {/* 播放速度調整 */}      <select
        value={playbackRate}
        onChange={e => {
          const rate = parseFloat(e.target.value);
          const wasPlaying = videoRef.current && !videoRef.current.paused;
          setPlaybackRate(rate);
          if (videoRef.current) {
            videoRef.current.playbackRate = rate;
            // 如果之前在播放，確保繼續播放
            if (wasPlaying) {
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch(() => {});
              }
            }
          }
        }}
        style={{ marginRight: 8, padding: '4px 8px', borderRadius: 6 }}
        title="播放速度"
      >
        {playbackOptions.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={current}
        onChange={onSeekChange}
        style={{ flex: 1, margin: '0 8px' }}        disabled={!duration}
      />
      <TimeDisplay current={current} duration={duration} />
    </div>
  );
}

export default VideoControls;
