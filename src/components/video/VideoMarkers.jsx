import React from 'react';

function VideoMarkers({ 
  videoRef,
  displayMarkers, 
  showPair, 
  videoMeta,
  markers,
  setMarkers 
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
      ))}
    </>
  );
}

export default VideoMarkers;
