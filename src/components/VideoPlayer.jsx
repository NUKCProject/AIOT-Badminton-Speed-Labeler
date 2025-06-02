import React, { useRef, useState } from 'react';

import { Button, Box, Paper } from '@mui/material';

function PlayPauseButton({ videoRef }) {
  const [playing, setPlaying] = useState(false);

  const handleClick = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  // 同步狀態（影片被手動暫停/播放時）
  React.useEffect(() => {
    if (!videoRef.current) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    videoRef.current.addEventListener('play', onPlay);
    videoRef.current.addEventListener('pause', onPause);
    return () => {
      videoRef.current.removeEventListener('play', onPlay);
      videoRef.current.removeEventListener('pause', onPause);
    };
  }, [videoRef]);

  return (
    <Button
      variant={playing ? 'outlined' : 'contained'}
      color="primary"
      onClick={handleClick}
      sx={{ minWidth: 44, minHeight: 44, borderRadius: 2, p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      title={playing ? '暫停' : '播放'}
    >
      <i
        className={playing ? 'fa-solid fa-pause' : 'fa-solid fa-play'}
        style={{ fontSize: 22, color: 'white' }}
      ></i>
    </Button>
  );
}

function VideoPlayer({ videoUrl, markers, setMarkers, onNewPair, showPair, seekTime, onSeeked, onExitShowPair, onShootTime }) {
  const videoRef = useRef();
  const containerRef = useRef(); // 新增: 用於聚焦與鍵盤監聽
  // 強制重繪用
  const [rerender, setRerender] = useState(0);

  // 顯示游標座標
  const [mousePos, setMousePos] = useState(null);

  // --- 快捷鍵狀態 ---
  const lastKeyTime = useRef({ left: 0, right: 0 });
  const DOUBLE_PRESS_INTERVAL = 300; // ms

  const playbackOptions = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // 僅在主播放器區域有焦點時觸發
      if (document.activeElement !== containerRef.current) return;
      if (!videoRef.current) return;
      // 避免輸入框誤觸
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const now = Date.now();
      if (e.code === 'Space') {
        e.preventDefault();
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
        return;
      }
      // 左鍵
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
      // 右鍵
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
      // 播放速率快捷鍵（A: 較小，D: 較大）
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
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoRef]);

  // 影片縮放時強制重繪SVG與標記點
  React.useEffect(() => {
    if (!videoRef.current) return;
    let resizeObserver = null;
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => setRerender(x => x + 1));
      resizeObserver.observe(videoRef.current);
    } else {
      // fallback: window resize
      const onResize = () => setRerender(x => x + 1);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    return () => {
      if (resizeObserver && videoRef.current) resizeObserver.disconnect();
    };
  }, [videoRef, videoUrl]);
  // 進度條狀態
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRateRef = useRef(1);
  React.useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);
  // 影片原始寬高
  const [videoMeta, setVideoMeta] = useState({ width: 640, height: 360 });
  // 若 showPair 存在則優先顯示該組點與線
  const displayMarkers = showPair ? [showPair.hit, showPair.land] : markers;

  // 跳轉影片到指定時間
  React.useEffect(() => {
    if (seekTime != null && videoRef.current) {
      videoRef.current.currentTime = seekTime;
      if (onSeeked) onSeeked();
    }
    // eslint-disable-next-line
  }, [seekTime]);



  // 影片時間監聽
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const update = () => setCurrent(v.currentTime);
    const loaded = () => {
      setDuration(v.duration || 0);
      // 取得原始影片寬高
      if (v.videoWidth && v.videoHeight) {
        setVideoMeta({ width: v.videoWidth, height: v.videoHeight });
      }
      // 嘗試取得影片拍攝時間（EXIF/metadata）
      let shootTime = 0;
      try {
        // 只針對本地檔案，有些瀏覽器支援 videoRef.current.currentSrc
        // 但 HTML5 video 沒有標準 API 取得 EXIF 拍攝時間，只能用 name/自訂格式
        // 這裡示範：若檔名含有 timestamp_1681234567.mp4 會自動解析
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
    // 設定播放速度
    v.playbackRate = playbackRate;
    return () => {
      v.removeEventListener('timeupdate', update);
      v.removeEventListener('durationchange', loaded);
      v.removeEventListener('loadedmetadata', loaded);
    };
  }, [videoUrl, playbackRate]);

  // 拖曳進度條
  const handleSeekBar = e => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrent(val);
    }
  };

  const handleVideoClick = (e) => {
    if (!videoRef.current) return;
    const rect = videoRef.current.getBoundingClientRect();
    // 取得顯示區域座標
    const x_disp = e.clientX - rect.left;
    const y_disp = e.clientY - rect.top;
    // 依顯示區域與原始影片比例換算成原始影片座標
    const x = Math.round(x_disp * (videoMeta.width / rect.width));
    const y = Math.round(y_disp * (videoMeta.height / rect.height));
    const currentTime = videoRef.current.currentTime;
    const nextType = markers.length % 2 === 0 ? 'hit' : 'land';
    const newMarkers = [
      ...markers,
      {
        x,
        y,
        time: currentTime,
        type: nextType,
      },
    ];
    setMarkers(newMarkers);
    // 如果剛好標記完一組，回傳給父元件
    if (nextType === 'land' && onNewPair) {
      const hit = newMarkers[newMarkers.length - 2];
      const land = newMarkers[newMarkers.length - 1];
      onNewPair({ hit, land });
    }
  };


  // 控制列按鈕 handler
  const handleStep = (type) => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    let frameSec = 1 / 30; // 預設一幀 1/30 秒
    // 嘗試取得影片實際幀率
    if (v.getVideoPlaybackQuality && v.getVideoPlaybackQuality().totalVideoFrames && v.duration) {
      const totalFrames = v.getVideoPlaybackQuality().totalVideoFrames;
      if (totalFrames && v.duration) frameSec = v.duration / totalFrames;
    }
    switch (type) {
      case 'backward1s':
        v.currentTime = Math.max(0, v.currentTime - 1);
        break;
      case 'backward1f':
        v.currentTime = Math.max(0, v.currentTime - frameSec);
        break;
      case 'forward1s':
        v.currentTime = Math.min(v.duration || 0, v.currentTime + 1);
        break;
      case 'forward1f':
        v.currentTime = Math.min(v.duration || 0, v.currentTime + frameSec);
        break;
      default:
        break;
    }
  };

  // 讓主容器可聚焦
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
          {/* 標記模式下顯示游標座標 */}
          {/* {showPair === null && mousePos && ( */}
          {mousePos && (
            <div style={{
              position: 'absolute',
              left: 12,
              top: 12,
              background: 'rgba(30,30,30,0.7)',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 14,
              zIndex: 10,
              pointerEvents: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)'
            }}>
              游標座標: ({mousePos.x}, {mousePos.y})
            </div>
          )}
           <video
             ref={videoRef}
             src={videoUrl}
             style={{ width: '100%', height: 'auto', cursor: 'crosshair', display: 'block' }}
             onLoadedMetadata={() => {
               if (videoRef.current) {
                 setVideoMeta({ width: videoRef.current.videoWidth, height: videoRef.current.videoHeight });
               }
             }}
             onMouseMove={e => {
               if (!videoRef.current) return setMousePos(null);
               const rect = videoRef.current.getBoundingClientRect();
               const x_disp = e.clientX - rect.left;
               const y_disp = e.clientY - rect.top;
               // 依顯示區域與原始影片比例換算成原始影片座標
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
             onClick={handleVideoClick} // 新增這裡
           />
          {/* 控制列容器 */}
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
            <PlayPauseButton videoRef={videoRef} />
            {/* 功能按鈕 */}
            <button onClick={() => handleStep('backward1s')} title="倒退1秒" style={{padding: '6px 10px', borderRadius: 6, marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer'}}>
              <i className="fa-solid fa-backward" style={{fontSize: 18, color: 'white'}}></i>
            </button>
            <button onClick={() => handleStep('backward1f')} title="倒退1幀" style={{padding: '6px 10px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer'}}>
              <i className="fa-solid fa-backward-step" style={{fontSize: 18, color: 'white'}}></i>
            </button>
            <button onClick={() => handleStep('forward1f')} title="前進1幀" style={{padding: '6px 10px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer'}}>
              <i className="fa-solid fa-forward-step" style={{fontSize: 18, color: 'white'}}></i>
            </button>
            <button onClick={() => handleStep('forward1s')} title="前進1秒" style={{padding: '6px 10px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer'}}>
              <i className="fa-solid fa-forward" style={{fontSize: 18, color: 'white'}}></i>
            </button>
            {/* 播放速度調整 */}
            <select
              value={playbackRate}
              onChange={e => {
                const rate = parseFloat(e.target.value);
                setPlaybackRate(rate);
                if (videoRef.current) videoRef.current.playbackRate = rate;
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
              onChange={handleSeekBar}
              style={{ flex: 1, margin: '0 8px' }}
              disabled={!duration}
            />
            <span style={{
              fontSize: 13,
              color: '#fff',
              minWidth: 80,
              textAlign: 'right',
              background: 'rgba(34,34,34,0.85)',
              borderRadius: 8,
              padding: '2px 10px',
              fontWeight: 500,
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              alignSelf: 'center',
              marginLeft: 'auto',
              flexShrink: 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}>
              {formatTime(Number.isFinite(current) ? current : 0)} / {formatTime(Number.isFinite(duration) ? duration : 0)}
            </span>
          </div>
          {/* 點擊標記覆蓋層 */}
          {showPair ? (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: videoRef.current ? videoRef.current.clientWidth : '100%',
                height: videoRef.current ? videoRef.current.clientHeight : 'auto',
                cursor: 'pointer',
                zIndex: 3,
                background: 'rgba(0,0,0,0)',
                pointerEvents: 'none' // 修改這裡
              }}
              title="點擊回到標記模式"
              // onClick={handleVideoClick} // 移除這裡
            >
              {/* SVG標註層 */}
              <svg
                width={videoRef.current ? videoRef.current.clientWidth : 0}
                height={videoRef.current ? videoRef.current.clientHeight : 0}
                style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
              >
                {(() => {
                  if (displayMarkers.length !== 2) return null;
                  const [hit, land] = displayMarkers;
                  if (hit.type === 'hit' && land.type === 'land') {
                    // 原始影片座標 -> 顯示區域座標
                    const scaleX = videoRef.current ? videoRef.current.clientWidth / videoMeta.width : 1;
                    const scaleY = videoRef.current ? videoRef.current.clientHeight / videoMeta.height : 1;
                    return (
                      <line
                        key={0}
                        x1={hit.x * scaleX}
                        y1={hit.y * scaleY}
                        x2={land.x * scaleX}
                        y2={land.y * scaleY}
                        stroke="#ff9800"
                        strokeWidth={2}
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  }
                  return null;
                })()}
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">
                    <path d="M2,2 L2,6 L7,4 L2,2" fill="#ff9800" />
                  </marker>
                </defs>
              </svg>
            </div>
          ) : (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: videoRef.current ? videoRef.current.clientWidth : 0,
                height: videoRef.current ? videoRef.current.clientHeight : 0,
                cursor: 'crosshair',
                zIndex: 2,
                pointerEvents: 'none' // 修改這裡
              }}
              // onClick={handleVideoClick} // 移除這裡
            >
              {/* SVG標註層 */}
              <svg
                width={videoRef.current ? videoRef.current.clientWidth : 0}
                height={videoRef.current ? videoRef.current.clientHeight : 0}
                style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
              >
                {(() => {
                  if (displayMarkers.length !== 2) return null;
                  const [hit, land] = displayMarkers;
                  if (hit.type === 'hit' && land.type === 'land') {
                    // 原始影片座標 -> 顯示區域座標
                    const scaleX = videoRef.current ? videoRef.current.clientWidth / videoMeta.width : 1;
                    const scaleY = videoRef.current ? videoRef.current.clientHeight / videoMeta.height : 1;
                    return (
                      <line
                        key={0}
                        x1={hit.x * scaleX}
                        y1={hit.y * scaleY}
                        x2={land.x * scaleX}
                        y2={land.y * scaleY}
                        stroke="#ff9800"
                        strokeWidth={2}
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  }
                  return null;
                })()}
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">
                    <path d="M2,2 L2,6 L7,4 L2,2" fill="#ff9800" />
                  </marker>
                </defs>
              </svg>
            </div>
          )}
          {/* 連線SVG層 */}
          <svg
            width={videoRef.current ? videoRef.current.clientWidth : 0}
            height={videoRef.current ? videoRef.current.clientHeight : 0}
            style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
          >
            {(() => {
              if (displayMarkers.length !== 2) return null;
              const [hit, land] = displayMarkers;
              if (hit.type === 'hit' && land.type === 'land') {
                // 原始影片座標 -> 顯示區域座標
                const scaleX = videoRef.current ? videoRef.current.clientWidth / videoMeta.width : 1;
                const scaleY = videoRef.current ? videoRef.current.clientHeight / videoMeta.height : 1;
                return (
                  <line
                    key={0}
                    x1={hit.x * scaleX}
                    y1={hit.y * scaleY}
                    x2={land.x * scaleX}
                    y2={land.y * scaleY}
                    stroke="#ff9800"
                    strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                  />
                );
              }
              return null;
            })()}
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M2,2 L2,6 L7,4 L2,2" fill="#ff9800" />
              </marker>
            </defs>
          </svg>
          {/* 標記點顯示 */}
          {displayMarkers.map((m, idx) => {
            // 原始影片座標 -> 顯示區域座標（與svg一致）
            const scaleX = videoRef.current ? videoRef.current.clientWidth / videoMeta.width : 1;
            const scaleY = videoRef.current ? videoRef.current.clientHeight / videoMeta.height : 1;
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: m.x * scaleX - 6,
                  top: m.y * scaleY - 6,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: m.type === 'hit' ? 'red' : 'blue',
                  border: '2px solid #fff',
                  cursor: showPair ? 'default' : 'pointer',
                  zIndex: 5,
                  boxShadow: '0 0 6px rgba(0,0,0,0.3)',
                  transition: 'transform 0.1s',
                }}
                title={showPair ? undefined : `點擊刪除 ${m.type} @ ${m.time.toFixed(2)}s`}
                onClick={showPair ? undefined : (e => {
                  e.stopPropagation();
                  setMarkers(markers.filter((_, i) => i !== idx));
                })}
                onMouseOver={e => !showPair && (e.currentTarget.style.transform = 'scale(1.2)')}
                onMouseOut={e => !showPair && (e.currentTarget.style.transform = 'scale(1)')}
              />
            );
          })}
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
