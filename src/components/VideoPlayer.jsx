import React, { useRef, useState } from 'react';
import VideoControls from './video/VideoControls';
import VideoMarkers from './video/VideoMarkers';
import VideoOverlay from './video/VideoOverlay';

const playbackOptions = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function VideoPlayer({   videoUrl, 
  markers, 
  handleSetMarkers, 
  onNewPair, 
  showPair, 
  seekTime, 
  onSeeked, 
  onExitShowPair, 
  onShootTime, 
  isPaused, 
  setIsPaused,
  mode, // 新增 mode prop
  editingPairIndex // 新增 editingPairIndex prop
}) {
  const videoRef = useRef();
  const containerRef = useRef();
  const [rerender, setRerender] = useState(0);
  const [mousePos, setMousePos] = useState(null);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRateRef = useRef(1);
  const [videoMeta, setVideoMeta] = useState({ width: 640, height: 360 });
  const lastKeyTime = useRef({ left: 0, right: 0 });
  const DOUBLE_PRESS_INTERVAL = 300;

  // 修正：只有 view 模式才用 showPair，其餘都用 markers
  const displayMarkers = (mode === 'view' && showPair) ? [showPair.hit, showPair.land] : markers;

  // 跳轉影片到指定時間
  React.useEffect(() => {
    if (seekTime != null && videoRef.current) {
      videoRef.current.currentTime = seekTime;
      if (onSeeked) onSeeked();
    }
  }, [seekTime, onSeeked]);

  // 控制影片播放/暫停
  React.useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPaused]);

  // 影片時間監聽
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    const update = () => setCurrent(v.currentTime);
    const loaded = () => {
      setDuration(v.duration || 0);
      if (v.videoWidth && v.videoHeight) {
        setVideoMeta({ width: v.videoWidth, height: v.videoHeight });
      }
      
      // 嘗試取得影片拍攝時間
      let shootTime = 0;
      try {
        const src = v.currentSrc || v.src;
        const match = src && src.match(/timestamp_(\d{10,})/);
        if (match) {
          shootTime = parseInt(match[1], 10);
        }
      } catch (e) {}
      if (typeof onShootTime === 'function') {
        onShootTime(shootTime);
      }
    };

    v.addEventListener('timeupdate', update);
    v.addEventListener('durationchange', loaded);
    v.addEventListener('loadedmetadata', loaded);
    v.playbackRate = playbackRate;

    return () => {
      v.removeEventListener('timeupdate', update);
      v.removeEventListener('durationchange', loaded);
      v.removeEventListener('loadedmetadata', loaded);
    };
  }, [videoRef.current, playbackRate, onShootTime]);

  // 鍵盤快捷鍵監聽
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement !== containerRef.current) return;
      if (!videoRef.current) return;
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const now = Date.now();      
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused(preIsPaused => !preIsPaused); 
        return; 
      }

      if (e.code === 'ArrowLeft') {
        if (now - lastKeyTime.current.left < DOUBLE_PRESS_INTERVAL) {
          handleStep('backward1s');
        } else {
          handleStep('backward1f');
        }
        lastKeyTime.current.left = now;
        e.preventDefault();
        return;
      }

      if (e.code === 'ArrowRight') {
        if (now - lastKeyTime.current.right < DOUBLE_PRESS_INTERVAL) {
          handleStep('forward1s');
        } else {
          handleStep('forward1f');
        }
        lastKeyTime.current.right = now;
        e.preventDefault();
        return;
      }

      if (e.key === 'a' || e.key === 'A') {
        const idx = playbackOptions.indexOf(playbackRateRef.current);
        if (idx > 0) {
          const newRate = playbackOptions[idx - 1];
          setPlaybackRate(newRate);
          playbackRateRef.current = newRate;
          if (videoRef.current) videoRef.current.playbackRate = newRate;
        }
        e.preventDefault();
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        const idx = playbackOptions.indexOf(playbackRateRef.current);
        if (idx < playbackOptions.length - 1) {
          const newRate = playbackOptions[idx + 1];
          setPlaybackRate(newRate);
          playbackRateRef.current = newRate;
          if (videoRef.current) videoRef.current.playbackRate = newRate;
        }
        e.preventDefault();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoRef.current]);

  // 影片縮放監聽
  React.useEffect(() => {
    if (!videoRef.current) return;
    let resizeObserver = null;
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => setRerender(x => x + 1));
      resizeObserver.observe(videoRef.current);
    } else {
      const onResize = () => setRerender(x => x + 1);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    return () => {
      if (resizeObserver && videoRef.current) resizeObserver.disconnect();
    };
  }, [videoRef, videoUrl]);
  const handleVideoClick = (e) => {
    if (!videoRef.current) return;
    const rect = videoRef.current.getBoundingClientRect();
    const x_disp = e.clientX - rect.left;
    const y_disp = e.clientY - rect.top;
    const x = Math.round(x_disp * (videoMeta.width / rect.width));
    const y = Math.round(y_disp * (videoMeta.height / rect.height));
    const currentTime = videoRef.current.currentTime;
    const nextType = markers.length % 2 === 0 ? 'hit' : 'land';
    
    // 標記點時暫停影片
    setIsPaused(true);
    
    const newMarkers = [
      ...markers,
      { x, y, time: currentTime, type: nextType }
    ];
    handleSetMarkers(newMarkers);
    if (nextType === 'land' && onNewPair && mode === 'mark') {
      const hit = newMarkers[newMarkers.length - 2];
      const land = newMarkers[newMarkers.length - 1];
      onNewPair({ hit, land });
    }
  };

  const handleStep = (action) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const frameRate = 30;
    const frameTime = 1 / frameRate;

    switch (action) {
      case 'backward1f':
        video.currentTime = Math.max(0, video.currentTime - frameTime);
        break;
      case 'forward1f':
        video.currentTime = Math.min(video.duration, video.currentTime + frameTime);
        break;
      case 'backward1s':
        video.currentTime = Math.max(0, video.currentTime - 1);
        break;
      case 'forward1s':
        video.currentTime = Math.min(video.duration, video.currentTime + 1);
        break;
      default:
        break;
    }
  };

  const handleSeekBar = e => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrent(val);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{outline: 'none'}}
      onClick={e => {
        // 只有點擊非表單元件才自動 focus
        const tag = e.target.tagName;
        if (!['SELECT', 'INPUT', 'TEXTAREA', 'BUTTON', 'OPTION'].includes(tag)) {
          containerRef.current && containerRef.current.focus();
        }
      }}
    >
      {videoUrl && (
        <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
          <video
            ref={videoRef}
            src={videoUrl}
            style={{ width: '100%', height: 'auto', cursor: 'crosshair', display: 'block' }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setVideoMeta({ 
                  width: videoRef.current.videoWidth, 
                  height: videoRef.current.videoHeight 
                });
              }
            }}
            onMouseMove={e => {
              if (!videoRef.current) return setMousePos(null);
              const rect = videoRef.current.getBoundingClientRect();
              const x_disp = e.clientX - rect.left;
              const y_disp = e.clientY - rect.top;
              const x = Math.round(x_disp * (videoMeta.width / rect.width));
              const y = Math.round(y_disp * (videoMeta.height / rect.height));
              if (
                x >= 0 && x <= videoMeta.width &&
                y >= 0 && y <= videoMeta.height
              ) {
                setMousePos({ x, y });
              } else {
                setMousePos(null);
              }
            }}
            onMouseLeave={() => setMousePos(null)}
            onClick={handleVideoClick}
          />

          <VideoOverlay
            videoRef={videoRef}
            mousePos={mousePos}
            showPair={showPair}
            videoMeta={videoMeta}
            displayMarkers={displayMarkers}
          />          <VideoMarkers 
            videoRef={videoRef}
            displayMarkers={displayMarkers}
            videoMeta={videoMeta}
            markers={markers}
            handleSetMarkers={handleSetMarkers}
            mode={mode}
            editingPairIndex={typeof editingPairIndex === 'number' ? editingPairIndex : null}
          /><VideoControls
            videoRef={videoRef}
            current={current}
            duration={duration}
            playbackRate={playbackRate}
            setPlaybackRate={setPlaybackRate}
            onSeekChange={handleSeekBar}
            onStepClick={handleStep}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
          />
        </div>
      )}
    </div>
  );
}

// 格式化秒數為 mm:ss
function formatTime(sec) {
  if (!isFinite(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default VideoPlayer;
