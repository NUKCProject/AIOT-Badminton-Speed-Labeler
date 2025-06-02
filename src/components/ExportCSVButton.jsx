import React from 'react';
import Papa from 'papaparse';
import { calcSpeeds } from '../utils/speedCalc';
import { Button } from '@mui/material';

// 新增 props: shootTime
function ExportCSVButton({ markers, shootTime = 0 }) {
  const handleExport = () => {
    // 假設每兩點為一組（擊球點-落點）
    const speeds = calcSpeeds(markers);
    // 將 yyyy-mm-dd HH:MM:SS 轉 timestamp（秒）
const parseDateTime = str => {
  if (!str) return 0;
  // 解析 yyyy-mm-ddTHH:MM:SS.ssssss
  // 只取前 19 個字元（yyyy-mm-ddTHH:MM:SS）
  const base = str.slice(0, 19);
  // 直接 new Date 解析
  const d = new Date(base.replace('T', ' '));
  if (!isNaN(d.getTime())) {
    return Math.floor(d.getTime() / 1000);
  }
  return 0;
};
const shootTimestamp = parseDateTime(shootTime);
const formatISODateTime = ts => {
  const d = new Date(ts * 1000);
  // toISOString 會帶 Z 與毫秒，這裡只要 yyyy-mm-ddTHH:MM:SS.sss
  return d.toISOString().replace('Z', '');
};
const data = speeds.map((item, idx) => ({
  index: idx + 1,
  hit_x: item.hit.x,
  hit_y: item.hit.y,
  hit_time: item.hit.time,
  hit_timestamp: formatISODateTime(shootTimestamp + item.hit.time),
  land_x: item.land.x,
  land_y: item.land.y,
  land_time: item.land.time,
  land_timestamp: formatISODateTime(shootTimestamp + item.land.time),
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
    <Button
      variant="contained"
      color="primary"
      onClick={handleExport}
      disabled={markers.length < 2}
      sx={{ mt: 2, borderRadius: 3, fontWeight: 600 }}
    >
      匯出 CSV
    </Button>
  );
}

export default ExportCSVButton;
