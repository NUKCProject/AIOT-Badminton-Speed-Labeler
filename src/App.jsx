import React, { useState } from 'react';
import VideoPlayer from './components/VideoPlayer';
import ExportCSVButton from './components/ExportCSVButton';
import { calcSpeeds } from './utils/speedCalc';
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
  // 刪除某一筆 pair
  const handleDeletePair = (index) => {
    setPairs(pairs => pairs.filter((_, i) => i !== index));
  }
  const [videoUrl, setVideoUrl] = React.useState(null);
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 5 } }}>
        <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h1" component="h1" gutterBottom color="primary.main" sx={{ mb: 0 }}>
              羽毛球球速標註工具
            </Typography>
            {/* 檔案選擇按鈕 */}
            <Button
              variant="outlined"
              component="label"
              color="primary"
              sx={{ ml: 2, borderRadius: 3, fontWeight: 600, height: 40 }}
            >
              選擇檔案
              <input
                type="file"
                accept="video/*"
                hidden
                onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    setVideoUrl(URL.createObjectURL(file));
                  }
                }}
              />
            </Button>
          </Box>
          <Box sx={{ mb: 2 }}>
  {/* 狀態顯示區塊 */}
  <Paper elevation={1} sx={{ mb: 2, p: 1.5, display: 'inline-block', borderRadius: 3 }}>
    {showPair !== null ? (
      <Typography variant="subtitle1" color="secondary">
        檢視模式（第 {pairs.findIndex(p => p === showPair) + 1} 筆紀錄）
      </Typography>
    ) : (
      <Typography variant="subtitle1" color="primary">
        標記模式
      </Typography>
    )}
  </Paper>
  <VideoPlayer
    videoUrl={videoUrl}
    markers={markers}
    setMarkers={handleSetMarkers}
    onNewPair={handleNewPair}
    showPair={showPair}
    seekTime={seekTime}
    onSeeked={handleSeeked}
    onExitShowPair={() => setShowPair(null)}
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
                  const speeds = calcSpeeds(pairs.flatMap(p => [p.hit, p.land]));
                  return pairs.map((p, i) => {
  const isViewing = showPair !== null && showPair === p;
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
      <TableCell>{p.hit.x}, {p.hit.y}</TableCell>
      <TableCell>{p.hit.time.toFixed(2)}</TableCell>
      <TableCell>{p.land.x}, {p.land.y}</TableCell>
      <TableCell>{p.land.time.toFixed(2)}</TableCell>
      <TableCell>{speeds[i] ? speeds[i].speed : '-'}</TableCell>
      <TableCell>
        <Button
          variant="outlined"
          color="error"
          size="small"
          sx={{ minWidth: 32, p: 0.5 }}
          onClick={e => {
            e.stopPropagation(); // 避免觸發 row 的 onClick
            if (window.confirm('確定要刪除此筆紀錄嗎？')) {
              handleDeletePair(i);
            }
          }}
        >刪除</Button>
      </TableCell>
    </TableRow>
  );
});
                })()}
              </TableBody>
            </Table>
          </Paper>
          <Box sx={{ textAlign: 'right' }}>
            <ExportCSVButton markers={pairs.flatMap(p => [p.hit, p.land])} />
          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;
