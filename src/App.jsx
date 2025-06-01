import React, { useState } from 'react';
import VideoPlayer from './components/VideoPlayer';
import ExportCSVButton from './components/ExportCSVButton';
import { calcSpeeds } from './utils/speedCalc';

function App() {
  const [markers, setMarkers] = useState([]);
  const [pairs, setPairs] = useState([]); // 每組擊球-落球
  const [showPair, setShowPair] = useState(null); // 目前要顯示的配對（for 表格點擊）
  const [seekTime, setSeekTime] = useState(null); // 跳轉影片時間

  // 新增一組配對（不立即清空標記，等待下一組擊球點時再清空）
  const [pendingClear, setPendingClear] = useState(false);
  const handleNewPair = (pair) => {
    setPairs([...pairs, pair]);
    setPendingClear(true); // 標記待清空
  };

  // 當 pendingClear 為 true 且 markers 有新擊球點時才清空
  const handleSetMarkers = (nextMarkers) => {
    if (pendingClear && nextMarkers.length === 1 && nextMarkers[0].type === 'hit') {
      setMarkers(nextMarkers);
      setPendingClear(false);
      setShowPair(null);
    } else if (pendingClear && nextMarkers.length > 0) {
      setMarkers([nextMarkers[nextMarkers.length - 1]]);
      setPendingClear(false);
      setShowPair(null);
    } else {
      setMarkers(nextMarkers);
      setShowPair(null);
    }
  };

  // 點擊表格時顯示該組配對並跳轉影片
  const handleShowPair = (pair) => {
    setShowPair(pair);
    setSeekTime(pair.hit.time);
  };

  // 顯示配對後再重置 seekTime，避免重複跳轉
  const handleSeeked = () => setSeekTime(null);

  return (
    <div style={{ padding: 24 }}>
      <h1>羽毛球球速標記工具</h1>
      <VideoPlayer
        markers={markers}
        setMarkers={handleSetMarkers}
        onNewPair={handleNewPair}
        showPair={showPair}
        seekTime={seekTime}
        onSeeked={handleSeeked}
        onExitShowPair={() => setShowPair(null)}
      />
      {/* 配對表格 */}
      <table style={{ marginTop: 24, borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: 4 }}>#</th>
            <th style={{ border: '1px solid #ccc', padding: 4 }}>擊球(x,y)</th>
            <th style={{ border: '1px solid #ccc', padding: 4 }}>擊球時間(s)</th>
            <th style={{ border: '1px solid #ccc', padding: 4 }}>落球(x,y)</th>
            <th style={{ border: '1px solid #ccc', padding: 4 }}>落球時間(s)</th>
            <th style={{ border: '1px solid #ccc', padding: 4 }}>球速(km/h)</th>
          </tr>
        </thead>
        <tbody>
          {/* 需計算每組配對的球速 */}
          {(() => {
            // 引入 calcSpeeds 並計算每組球速
            const speeds = calcSpeeds(pairs.flatMap(p => [p.hit, p.land]));
            return pairs.map((p, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => handleShowPair(p)}>
                <td style={{ border: '1px solid #ccc', padding: 4 }}>{i + 1}</td>
                <td style={{ border: '1px solid #ccc', padding: 4 }}>{p.hit.x}, {p.hit.y}</td>
                <td style={{ border: '1px solid #ccc', padding: 4 }}>{p.hit.time.toFixed(2)}</td>
                <td style={{ border: '1px solid #ccc', padding: 4 }}>{p.land.x}, {p.land.y}</td>
                <td style={{ border: '1px solid #ccc', padding: 4 }}>{p.land.time.toFixed(2)}</td>
                <td style={{ border: '1px solid #ccc', padding: 4 }}>{speeds[i] ? speeds[i].speed : '-'}</td>
              </tr>
            ));
          })()}

        </tbody>
      </table>
      {/* 匯出CSV按鈕可用 pairs 做資料來源，這裡暫保留markers傳遞 */}
      <ExportCSVButton markers={pairs.flatMap(p => [p.hit, p.land])} />
    </div>
  );
}

export default App;
