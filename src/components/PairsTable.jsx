import React from "react";
import { Table, TableHead, TableRow, TableCell, TableBody, Button } from "@mui/material";

function PairsTable({ mode, pairs, tempPairs, showPair, handleShowPair, handleDeletePair, setTempPairs, calcSpeeds, pixelToMeter }) {
  // 決定表格資料來源
  const tablePairs = mode === 'edit' ? tempPairs : pairs;

  // 根據模式決定是否可操作
  const isOperable = mode !== 'edit';
  
  return (
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
        {tablePairs.slice().reverse().map((p, originalIndex) => {
          const i = tablePairs.length - 1 - originalIndex; // 計算原始索引
          const isViewing = showPair && showPair.tableIndex === i;
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
              } : { cursor: isOperable ? 'pointer' : 'not-allowed' }}
              onClick={isViewing | isOperable ? () => handleShowPair(p, i, isViewing) : undefined} // 傳遞 i 作為 tableIndex
            >
              <TableCell>{i + 1}</TableCell>
              <TableCell>{p.hit ? `${p.hit.x}, ${p.hit.y}` : '-'}</TableCell>
              <TableCell>{p.hit ? p.hit.time.toFixed(2) : '-'}</TableCell>
              <TableCell>{p.land ? `${p.land.x}, ${p.land.y}` : '-'}</TableCell>
              <TableCell>{p.land ? p.land.time.toFixed(2) : '-'}</TableCell>
              <TableCell>{speed}</TableCell>
              {isOperable && (
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
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default PairsTable;