import React, { useRef, useState } from 'react';

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
    <button
      style={{ minWidth: 60 }}
      onClick={handleClick}
      type="button"
    >
      {playing ? '暫停' : '播放'}
    </button>
  );
}

function VideoPlayer({ markers, setMarkers, onNewPair, showPair, seekTime, onSeeked, onExitShowPair }) {
  const videoRef = useRef();
  const [videoUrl, setVideoUrl] = useState(null);
  // 進度條狀態
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoUrl(URL.createObjectURL(file));
    }
  };

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

  return (
    <div>
      <input type="file" accept="video/*" onChange={handleFileChange} />
      {videoUrl && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <video
            ref={videoRef}
            src={videoUrl}
            width={640}
            height={360}
            style={{ cursor: 'crosshair', display: 'block' }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setVideoMeta({ width: videoRef.current.videoWidth, height: videoRef.current.videoHeight });
              }
            }}
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
            width: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
          }}>
            <PlayPauseButton videoRef={videoRef} />
            {/* 功能按鈕 */}
            <button onClick={() => handleStep('backward1s')} title="倒退1秒" style={{padding: '4px 8px', borderRadius: 6, marginLeft: 4}}>⏪ 1秒</button>
            <button onClick={() => handleStep('backward1f')} title="倒退1幀" style={{padding: '4px 8px', borderRadius: 6}}>◀ 1幀</button>
            <button onClick={() => handleStep('forward1f')} title="前進1幀" style={{padding: '4px 8px', borderRadius: 6}}>1幀 ▶</button>
            <button onClick={() => handleStep('forward1s')} title="前進1秒" style={{padding: '4px 8px', borderRadius: 6}}>1秒 ⏩</button>
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
              <option value={0.25}>0.25</option>
              <option value={0.5}>0.5</option>
              <option value={0.75}>0.75</option>
              <option value={1}>1</option>
              <option value={1.25}>1.25</option>
              <option value={1.5}>1.5</option>
              <option value={1.75}>1.75</option>
              <option value={2}>2</option>
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
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
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
                width: 640,
                height: 360,
                cursor: 'pointer',
                zIndex: 3,
                background: 'rgba(0,0,0,0)',
              }}
              title="點擊回到標記模式"
              onClick={onExitShowPair}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 640,
                height: 360,
                cursor: 'crosshair',
                zIndex: 2,
              }}
              onClick={handleVideoClick}
            />
          )}
          {/* 連線SVG層 */}
          <svg
            width={640}
            height={360}
            style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
          >
            {(() => {
              if (displayMarkers.length !== 2) return null;
              const [hit, land] = displayMarkers;
              if (hit.type === 'hit' && land.type === 'land') {
                // 原始影片座標 -> 顯示區域座標
                const scaleX = 640 / videoMeta.width;
                const scaleY = 360 / videoMeta.height;
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
            // 原始影片座標 -> 顯示區域座標
            const scaleX = 640 / videoMeta.width;
            const scaleY = 360 / videoMeta.height;
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
