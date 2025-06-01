import React from 'react';
import Papa from 'papaparse';
import { calcSpeeds } from '../utils/speedCalc';

function ExportCSVButton({ markers }) {
  const handleExport = () => {
    // 假設每兩點為一組（擊球點-落點）
    const speeds = calcSpeeds(markers);
    const data = speeds.map((item, idx) => ({
      index: idx + 1,
      hit_x: item.hit.x,
      hit_y: item.hit.y,
      hit_time: item.hit.time,
      land_x: item.land.x,
      land_y: item.land.y,
      land_time: item.land.time,
      speed: item.speed,
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'badminton_speed.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleExport} disabled={markers.length < 2} style={{ marginTop: 16 }}>
      匯出 CSV
    </button>
  );
}

export default ExportCSVButton;
