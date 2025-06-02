import React from 'react';

// 格式化秒數為 mm:ss
function formatTime(sec) {
  if (!isFinite(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function TimeDisplay({ current, duration }) {
  return (
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
  );
}

export default TimeDisplay;
