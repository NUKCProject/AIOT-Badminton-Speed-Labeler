import React from 'react';

function VideoOverlay({ 
  videoRef,
  mousePos,
  showPair,
  videoMeta,
  displayMarkers 
}) {
  if (!videoRef.current) return null;

  const width = videoRef.current.clientWidth;
  const height = videoRef.current.clientHeight;

  return (
    <>
      {/* 游標座標顯示 */}
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

      {/* 覆蓋層 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width,
          height,
          cursor: 'crosshair',
          zIndex: showPair ? 3 : 2,
          pointerEvents: 'none'
        }}
      >
        {/* SVG標註層 */}
        <svg
          width={width}
          height={height}
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
        >
          {(() => {
            if (displayMarkers.length !== 2) return null;
            const [hit, land] = displayMarkers;
            if (hit.type === 'hit' && land.type === 'land') {
              // 原始影片座標 -> 顯示區域座標
              const scaleX = width / videoMeta.width;
              const scaleY = height / videoMeta.height;
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
    </>
  );
}

export default VideoOverlay;
