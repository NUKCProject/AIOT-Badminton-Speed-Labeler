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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Box,
  Button
} from '@mui/material';

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
      setShowPair(newTempPairs[editingPairIndex]);
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
    if (pendingClear && nextMarkers.length === 1 && nextMarkers[0].type === 'hit') {
      setMarkers(nextMarkers);
      setPendingClear(false);
      setShowPair(null);
      setIsPaused(true);
    } else if (pendingClear && nextMarkers.length > 0) {
      setMarkers([nextMarkers[nextMarkers.length - 1]]);
      setPendingClear(false);
      setShowPair(null);
      setIsPaused(true);
    } else {
      setMarkers(nextMarkers);
      setShowPair(null);
      setIsPaused(true);
    }
  };
  // 點擊表格時顯示該組配對並跳轉影片
  const handleShowPair = (pair, index) => {
    setShowPair({
      hit: { ...pair.hit, type: 'hit' },
      land: { ...pair.land, type: 'land' },
      speed: pair.speed
    });
    setSeekTime(pair.hit.time);
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
          const importedMarkers = [];
          const importedPairs = [];
          results.data.forEach(row => {
            if (row.hit_x && row.hit_y && row.hit_time && row.land_x && row.land_y && row.land_time) {
              importedMarkers.push({
                x: row.hit_x,
                y: row.hit_y,
                time: row.hit_time,
                type: 'hit'
              });
              importedMarkers.push({
                x: row.land_x,
                y: row.land_y,
                time: row.land_time,
                type: 'land'
              });
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
          // 嘗試從第一筆資料的 hit_timestamp 解析 shootTime
          if (results.data.length > 0 && results.data[0].hit_timestamp) {
            const firstHitTimestamp = results.data[0].hit_timestamp;
            // hit_timestamp 格式為 yyyy-mm-ddTHH:MM:SS.sss
            // 我們需要從中減去 hit_time (秒) 來得到 shootTime
            const hitTimeInSeconds = results.data[0].hit_time;
            const date = new Date(firstHitTimestamp);
            date.setSeconds(date.getSeconds() - hitTimeInSeconds);
            setShootTime(date.toISOString().replace('Z', ''));
          }
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          alert("載入 CSV 失敗，請檢查檔案格式。");
        }
      });
    }  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 5 } }}>
        <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h1" component="h1" gutterBottom color="primary.main" sx={{ mb: 0 }}>
              羽毛球球速標註工具
            </Typography>
            {/* PIXEL_TO_METER 設定 */}
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, bgcolor: '#f8f6fc', p: 0.5, borderRadius: 1, boxShadow: 0, minHeight: 36 }}>
  <Typography variant="body2" sx={{ mr: 0.5, fontWeight: 500, color: 'primary.main', fontSize: 14 }}>
    PIXEL_TO_METER
  </Typography>
  <TextField
    type="number"
    size="small"
    inputProps={{ step: 0.0001, min: 0, style: { padding: '4px 6px', fontSize: 14 } }}
    value={pixelToMeter}
    onChange={e => setPixelToMeter(Number(e.target.value))}
    sx={{ width: 80, bgcolor: 'white', borderRadius: 1, mr: 0.5, '& .MuiInputBase-input': { py: 0.5, px: 1, fontSize: 14 } }}
    variant="outlined"
  />
  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
    1像素=?公尺
  </Typography>
</Box>
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
        console.log("dateStr: ", dateStr)
        const d = new Date(dateStr);
        console.log("d: ", d)
        if (!isNaN(d.getTime())) {
          // 產生 yyyy-mm-ddTHH:MM:SS.sss 格式（毫秒三位數）
          const iso = d.toISOString(); // yyyy-mm-ddTHH:MM:SS.sssZ
          shootTimeStr = iso.replace('Z', '');
        }
      }
      setShootTime(shootTimeStr);
    } catch (e) {
      console.log("error: ", e)
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
  {/* 狀態顯示區塊 */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
    <Paper elevation={1} sx={{ p: 1.5, display: 'inline-block', borderRadius: 3 }}>
      {mode === 'mark' && (
        <Typography variant="subtitle1" color="primary">標記模式</Typography>
      )}
      {mode === 'view' && showPair && (
        <Typography variant="subtitle1" color="secondary">
          檢視模式（第 {pairs.findIndex(p => p.hit.x === showPair.hit.x && p.hit.y === showPair.hit.y && p.hit.time === showPair.hit.time) + 1} 筆紀錄）
        </Typography>
      )}
      {mode === 'edit' && (
        <Typography variant="subtitle1" color="error">編輯模式</Typography>
      )}
    </Paper>
    {mode === 'view' && showPair && (
      <>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleEditMode(pairs.findIndex(p => 
            p.hit.x === showPair.hit.x && 
            p.hit.y === showPair.hit.y && 
            p.hit.time === showPair.hit.time
          ))}
          sx={{ borderRadius: 3 }}
        >
          編輯標記
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            setMode('mark');
            setShowPair(null);
            setMarkers([]);
          }}
          sx={{ borderRadius: 3 }}
        >
          返回標記模式
        </Button>
      </>
    )}
    {mode === 'edit' && (
      <>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveEdit}
          sx={{ borderRadius: 3 }}
        >
          儲存變更
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={handleCancelEdit}
          sx={{ borderRadius: 3 }}
        >
          取消編輯
        </Button>
      </>
    )}
  </Box>  <VideoPlayer
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
          <Paper variant="outlined" sx={{ mb: 3, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>擊球(x,y)</TableCell>
                  <TableCell>擊球時間(s)</TableCell>
                  <TableCell>落球(x,y)</TableCell>
                  <TableCell>落球時間(s)</TableCell>
                  <TableCell>球速(km/h)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  // 決定表格資料來源
const tablePairs = mode === 'edit' ? tempPairs : pairs;
// 過濾掉 null 的 hit/land 才傳給 calcSpeeds
const validMarkers = tablePairs.flatMap(p => [p.hit, p.land].filter(pt => pt));
const speeds = calcSpeeds(validMarkers, pixelToMeter);
                  return tablePairs.slice().reverse().map((p, originalIndex) => {
                    const i = tablePairs.length - 1 - originalIndex; // 計算原始索引
                    const isViewing = showPair !== null && showPair && p.hit && p.land && showPair.hit.x === p.hit.x && showPair.hit.y === p.hit.y && showPair.hit.time === p.hit.time && showPair.land.x === p.land.x && showPair.land.y === p.land.y && showPair.land.time === p.land.time;
                    // 單筆計算球速，避免 speeds 錯位
                    const speed = (p.hit && p.land)
    ? calcSpeeds([p.hit, p.land], pixelToMeter)[0]?.speed
    : '-';
                    return (
                      <TableRow
                        key={i}
                        hover
                        sx={isViewing ? {
                          cursor: 'pointer',
                          backgroundColor: '#ede7f6', // 淡紫色
                        } : { cursor: 'pointer' }}
                        onClick={() => handleShowPair(p)}
                      >
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{p.hit ? `${p.hit.x}, ${p.hit.y}` : '-'}</TableCell>
                        <TableCell>{p.hit ? p.hit.time.toFixed(2) : '-'}</TableCell>
                        <TableCell>{p.land ? `${p.land.x}, ${p.land.y}` : '-'}</TableCell>
                        <TableCell>{p.land ? p.land.time.toFixed(2) : '-'}</TableCell>
                        <TableCell>{speed}</TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            sx={{ minWidth: 32, p: 0.5 }}
                            onClick={e => {
                              e.stopPropagation();
                              if (window.confirm('確定要刪除此筆紀錄嗎？')) {
                                if (mode === 'edit') {
                                  setTempPairs(tempPairs => tempPairs.filter((_, idx) => idx !== i));
                                } else {
                                  handleDeletePair(i);
                                }
                              }
                            }}
                          ><i className="fa-solid fa-trash"></i></Button>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </Paper>
          <Box sx={{ textAlign: 'right' }}>
            <ExportCSVButton markers={pairs.flatMap(p => [p.hit, p.land])} shootTime={shootTime} pixelToMeter={pixelToMeter} />          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;
