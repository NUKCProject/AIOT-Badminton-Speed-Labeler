import React from 'react';

function VideoMarkers({ 
  videoRef,
  displayMarkers, 
  videoMeta,
  markers,
  handleSetMarkers,
  mode,
  editingPairIndex // 新增 prop
}) {
  if (!videoRef.current) return null;

  const scaleX = videoRef.current.clientWidth / videoMeta.width;
  const scaleY = videoRef.current.clientHeight / videoMeta.height;

  return (
    <>
      {/* SVG連線層 */}
      <svg
        width={videoRef.current.clientWidth}
        height={videoRef.current.clientHeight}
        style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
      >
        {(() => {
          if (displayMarkers.length !== 2) return null;
          const [hit, land] = displayMarkers;
          if (hit.type === 'hit' && land.type === 'land') {
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
      {displayMarkers.map((m, idx) => (
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
            border: '2px solid #fff',            cursor: mode === 'view' ? 'default' : 'pointer',
            zIndex: 5,
            boxShadow: '0 0 6px rgba(0,0,0,0.3)',
            transition: 'transform 0.1s',
          }}
          title={mode === 'view' ? undefined : `點擊刪除 ${m.type} @ ${m.time.toFixed(2)}s`}
          onClick={mode === 'view' ? undefined : (e => {
            e.stopPropagation();
            // 將目前點擊的標記設為新的 markers 陣列
            const newMarkers = markers.filter((_, i) => i !== idx);
            if (mode === 'edit') {
              handleSetMarkers(newMarkers, editingPairIndex); // 傳入索引
            } else {
              handleSetMarkers(newMarkers);
            }
          })}
          onMouseOver={e => mode !== 'view' && (e.currentTarget.style.transform = 'scale(1.2)')}
          onMouseOut={e => mode !== 'view' && (e.currentTarget.style.transform = 'scale(1)')}
        />
      ))}
    </>
  );
}

export default VideoMarkers;
