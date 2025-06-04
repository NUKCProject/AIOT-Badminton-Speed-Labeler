import React from "react";
import { Box, Typography, TextField } from "@mui/material";

function PixelToMeterInput({ pixelToMeter, setPixelToMeter }) {
  return (
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
  );
}

export default PixelToMeterInput;