import React from "react";
import { Box, Paper, Typography, IconButton, Tooltip } from "@mui/material";

function StatusBar({ mode, showPair, handleEditMode, handleCancelEdit, handleSaveEdit, setMode, setShowPair, setMarkers }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Paper elevation={1} sx={{ p: 1.5, display: 'inline-block', borderRadius: 3, minWidth: 120, boxShadow: 'none', border: '2px solid #e0e0e0' }}>
        {mode === 'mark' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className="fa-solid fa-circle-plus" style={{ color: '#6750A4', fontSize: 22, marginRight: 4 }}></i>
            <Typography variant="subtitle1" color="primary">標記模式</Typography>
          </Box>
        )}
        {mode === 'view' && showPair && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className="fa-solid fa-eye" style={{ color: '#625B71', fontSize: 22, marginRight: 4 }}></i>
            <Typography variant="subtitle1" color="secondary">
              檢視（第 {showPair.tableIndex + 1} 筆）
            </Typography>
          </Box>
        )}
        {mode === 'edit' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className="fa-solid fa-pen" style={{ color: '#d32f2f', fontSize: 22, marginRight: 4 }}></i>
            <Typography variant="subtitle1" color="error">編輯模式</Typography>
          </Box>
        )}
      </Paper>
      {/* 操作按鈕區塊 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {mode === 'view' && showPair && (
          <>
            <Tooltip title="編輯標記">
              <IconButton color="primary" onClick={() => handleEditMode(showPair.tableIndex)} size="large">
                <i className="fa-solid fa-pen-to-square" style={{ fontSize: 22 }}></i>
              </IconButton>
            </Tooltip>
            <Tooltip title="返回標記模式">
              <IconButton color="primary" onClick={() => { setMode('mark'); setShowPair(null); setMarkers([]); }} size="large">
                <i className="fa-solid fa-arrow-rotate-left" style={{ fontSize: 22 }}></i>
              </IconButton>
            </Tooltip>
          </>
        )}
        {mode === 'edit' && (
          <>
            <Tooltip title="儲存變更">
              <IconButton color="primary" onClick={handleSaveEdit} size="large">
                <i className="fa-solid fa-floppy-disk" style={{ fontSize: 22 }}></i>
              </IconButton>
            </Tooltip>
            <Tooltip title="取消編輯">
              <IconButton color="error" onClick={handleCancelEdit} size="large">
                <i className="fa-solid fa-xmark" style={{ fontSize: 22 }}></i>
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>
    </Box>
  );
}

export default StatusBar;