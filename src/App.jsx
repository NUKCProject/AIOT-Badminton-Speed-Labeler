import React, { useState } from 'react';
import VideoPlayer from './components/VideoPlayer';
import MediaInfo from 'mediainfo.js';
import ExportCSVButton from './components/ExportCSVButton';
import { calcSpeeds } from './utils/speedCalc';
import Papa from 'papaparse';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Paper,
  Typography,
  Box,
  Button,
} from '@mui/material';
import StatusBar from './components/StatusBar';
import PixelToMeterInput from './components/PixelToMeterInput';
import PairsTable from './components/PairsTable';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6750A4', // Material 3 primary
    },
    secondary: {
      main: '#625B71',
    },
    background: {
      default: '#f6f7fb',
      paper: '#fff',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: [
      'Noto Sans TC',
      'Inter',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2rem',
      letterSpacing: '0.5px',
    },
  },
});

function App() {
  const [pixelToMeter, setPixelToMeter] = useState(0.0075); // 預設值
  const [shootTime, setShootTime] = useState(''); // 影片拍攝時間 yyyy-mm-dd HH:MM:SS 格式

  // 刪除某一筆 pair
  const handleDeletePair = (index) => {
    setPairs(pairs => pairs.filter((_, i) => i !== index));
  }
  const [videoUrl, setVideoUrl] = React.useState(null);
  const [markers, setMarkers] = useState([]);
  const [pairs, setPairs] = useState([]); // 每組擊球-落球
  const [tempPairs, setTempPairs] = useState([]); // 編輯模式下暫存顯示用
  const [showPair, setShowPair] = useState(null); // 目前要顯示的配對（for 表格點擊）
  const [seekTime, setSeekTime] = useState(null); // 跳轉影片時間
  const [isPaused, setIsPaused] = useState(false); // 影片是否暫停
  const [mode, setMode] = useState('mark'); // 'mark', 'view', 'edit'
  const [editingPairIndex, setEditingPairIndex] = useState(null); // 正在編輯的配對索引

  // 進入編輯模式時複製 pairs 到 tempPairs
  const handleEditMode = (pairIndex) => {
    setMode('edit');
    setEditingPairIndex(pairIndex);
    setTempPairs([...pairs]);
    const pair = pairs[pairIndex];
    // 在編輯模式下，設置原始的兩個點
    setMarkers([
      { ...pair.hit, type: 'hit' },
      { ...pair.land, type: 'land' }
    ]);
  };

  // 儲存編輯時，將 markers 寫入 tempPairs，然後再寫回 pairs
  const handleSaveEdit = () => {
    // 確保有擊球點和落球點
    const hit = markers.find(m => m.type === 'hit');
    const land = markers.find(m => m.type === 'land');
    if (hit && land) {
      const newTempPairs = [...tempPairs];
      newTempPairs[editingPairIndex] = { hit, land };
      setTempPairs(newTempPairs);
      setPairs(newTempPairs);
      setMode('view');
      setEditingPairIndex(null);
      setMarkers([]);
      setShowPair({ ...newTempPairs[editingPairIndex], tableIndex: editingPairIndex }); // 修正: 帶上 tableIndex
    } else {
      alert('請完成擊球點和落球點的標記');
    }
  };

  // 取消編輯時，還原 tempPairs
  const handleCancelEdit = () => {
    setMode('view');
    setEditingPairIndex(null);
    setMarkers([]);
    setTempPairs([...pairs]);
  };

  // 新增一組配對時，同步 pairs 和 tempPairs
  const [pendingClear, setPendingClear] = useState(false);
  const handleNewPair = (pair) => {
    setPairs(prev => {
      const updated = [...prev, pair];
      setTempPairs(updated);
      return updated;
    });
    setPendingClear(true); // 標記待清空
  };  // 根據不同模式處理標記
  const handleSetMarkers = (nextMarkers, pairIndex = editingPairIndex) => {
    if (mode === 'view') {
      return; // 檢視模式不允許設置標記
    }
    
    if (mode === 'edit') {
      if (nextMarkers.length > 2) return;
      if (nextMarkers.length < 1) return;

      // 自動補正第二點的 type
      if (nextMarkers.length === 2) {
        const types = nextMarkers.map(m => m.type);
        if (types[0] === types[1]) {
          const fixedMarkers = [...nextMarkers];
          if (types[0] === 'hit') {
            fixedMarkers[1] = { ...fixedMarkers[1], type: 'land' };
          } else {
            fixedMarkers[1] = { ...fixedMarkers[1], type: 'hit' };
          }
          nextMarkers = fixedMarkers;
        }
        // 依 type 排序，確保 [hit, land]
        nextMarkers = [...nextMarkers].sort((a, b) => (a.type === 'hit' ? -1 : 1));
      }

      setMarkers(nextMarkers);
      if (typeof pairIndex === 'number') {
        const hit = nextMarkers.find(m => m.type === 'hit') || null;
        const land = nextMarkers.find(m => m.type === 'land') || null;
        setTempPairs(tempPairs => {
          const newTemp = [...tempPairs];
          newTemp[pairIndex] = { hit, land };
          return newTemp;
        });
      }
      return;
    }

    // 標記模式
    if (pendingClear && nextMarkers.length === 1 && nextMarkers[0].type === 'land') {
      // 只剩落球點，保留落球點，等待下一次補擊球點
      setMarkers([nextMarkers[0]]);
      setPendingClear(false);
      setShowPair(null);
      setIsPaused(true);
      return;
    }
    if (pendingClear && nextMarkers.length === 1 && nextMarkers[0].type === 'hit') {
      setMarkers(nextMarkers);
      setPendingClear(false);
      setShowPair(null);
      setIsPaused(true);
      return;
    }
    if (pendingClear && nextMarkers.length > 0) {
      setMarkers([nextMarkers[nextMarkers.length - 1]]);
      setPendingClear(false);
      setShowPair(null);
      setIsPaused(true);
      return;
    }
    // 下一次標記時，若只剩一個落球點，強制補成擊球點
    if (markers.length === 1 && markers[0].type === 'land' && nextMarkers.length === 2) {
      const hit = { ...nextMarkers[1], type: 'hit' };
      const land = { ...markers[0], type: 'land' }; // Use existing land marker
      setMarkers([hit, land]);
      setShowPair(null);
      setIsPaused(true);
      return;
    }
    setMarkers(nextMarkers);
    setShowPair(null);
    setIsPaused(true);
  };
  // 點擊表格時顯示該組配對並跳轉影片
  const handleShowPair = (pair, tableIndex, isViewing=false) => {
    setSeekTime(pair.hit.time);
    if (isViewing) return;

    setShowPair({
      hit: { ...pair.hit, type: 'hit' },
      land: { ...pair.land, type: 'land' },
      speed: pair.speed,
      tableIndex // 新增: 記錄在 table 中的 index
    });
    setMode('view');
    setPendingClear(false);
    setMarkers([]);
  };

  // 顯示配對後再重置 seekTime，避免重複跳轉
  const handleSeeked = () => setSeekTime(null);

  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          const importedPairs = [];
          results.data.forEach(row => {
            // 檢查是否有必要的欄位
            if (row.hasOwnProperty("hit_x") && row.hasOwnProperty("hit_y") && row.hasOwnProperty("hit_time") &&
                row.hasOwnProperty("land_x") && row.hasOwnProperty("land_y") && row.hasOwnProperty("land_time")){
              importedPairs.push({
                hit: { x: row.hit_x, y: row.hit_y, time: row.hit_time },
                land: { x: row.land_x, y: row.land_y, time: row.land_time },
                speed: row.speed
              });
            }
          });
          setMarkers([]); // 載入 CSV 後清空 markers，避免與手動標記混淆
          setPairs(importedPairs);
          setShowPair(null); // 載入 CSV 後重置 showPair，確保進入標記模式
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          alert("載入 CSV 失敗，請檢查檔案格式。");
        }
      });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 5 } }}>
        <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h1" component="h1" gutterBottom color="primary.main" sx={{ mb: 0 }}>
              羽毛球球速標註工具
            </Typography>
            <PixelToMeterInput pixelToMeter={pixelToMeter} setPixelToMeter={setPixelToMeter} />
            <div className='import-btns'>
              {/* 檔案選擇按鈕 */}
              <Button
                variant="outlined"
                component="label"
                color="primary"
                title='載入影片'
                sx={{ ml: 2, borderRadius: 3, fontWeight: 600, height: 40, minWidth: 40, p: 0 }}
              >
                <i className="fa-solid fa-video" style={{ fontSize: 20 }}></i>
                <input
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={async e => {
                    const file = e.target.files[0];
                    if (file) {
                      setVideoUrl(URL.createObjectURL(file));
                      // 解析影片 creation_time
                      try {
                        const mediainfo = await MediaInfo({
                          locateFile: () => '/mediainfo.wasm'
                        });
                        const getSize = () => file.size;
                        const readChunk = (chunkSize, offset) => new Promise((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = event => resolve(new Uint8Array(event.target.result));
                          reader.onerror = error => reject(error);
                          reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize));
                        });
                        const result = await mediainfo.analyzeData(getSize, readChunk);
                        let shootTimeStr = '';
                        // 解析 creation_time
                        const creationTimeLine = result.media.track
                          .flatMap(t => Object.entries(t))
                          .find(([k, v]) => k.toLowerCase().includes('encoded_date') || k.toLowerCase().includes('creation_time'));
                        if (creationTimeLine && creationTimeLine[1]) {
                          // 標準格式如 UTC 2023-07-01 12:34:56
                          const dateStr = creationTimeLine[1]
                          const d = new Date(dateStr);
                          if (!isNaN(d.getTime())) {
                            shootTimeStr = d.toISOString(); // yyyy-mm-ddTHH:MM:SS.sssZ
                          }
                        }
                        setShootTime(shootTimeStr);
                      } catch (e) {
                        setShootTime('');
                      }
                    }
                  }}
                />
              </Button>
              <Button
                variant="outlined"
                component="label"
                color="secondary"
                title='載入標記資料'
                sx={{ ml: 2, borderRadius: 3, fontWeight: 600, height: 40, minWidth: 40, p: 0 }}
              >
                <i className="fa-solid fa-file-arrow-up" style={{ fontSize: 20 }}></i>
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={handleImportCSV}
                />
              </Button>
            </div>
          </Box>

          <Box sx={{ mb: 2 }}>
            <StatusBar
              mode={mode}
              showPair={showPair}
              handleEditMode={handleEditMode}
              handleCancelEdit={handleCancelEdit}
              handleSaveEdit={handleSaveEdit}
              setMode={setMode}
              setShowPair={setShowPair}
              setMarkers={setMarkers}
            />
            <VideoPlayer
              videoUrl={videoUrl}
              markers={markers}
              handleSetMarkers={handleSetMarkers}
              onNewPair={handleNewPair}
              showPair={showPair}
              seekTime={seekTime}
              onSeeked={handleSeeked}
              onExitShowPair={() => setShowPair(null)}
              onShootTime={setShootTime}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              mode={mode}
              editingPairIndex={editingPairIndex} // 新增傳遞編輯索引
            />
          </Box>
          <PairsTable
            mode={mode}
            pairs={pairs}
            tempPairs={tempPairs}
            showPair={showPair}
            handleShowPair={handleShowPair}
            handleDeletePair={handleDeletePair}
            setTempPairs={setTempPairs}
            calcSpeeds={calcSpeeds}
            pixelToMeter={pixelToMeter}
          />
          <Box sx={{ textAlign: 'right' }}>
            <ExportCSVButton markers={pairs.flatMap(p => [p.hit, p.land])} shootTime={shootTime} pixelToMeter={pixelToMeter} />
          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;
