// 計算兩點間像素距離
function calcDistance(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// 預設像素與實際距離比例
const DEFAULT_PIXEL_TO_METER = 0.0075;

// markers: [{x, y, time, type}]
export function calcSpeeds(markers, pixelToMeter = DEFAULT_PIXEL_TO_METER) {
  const results = [];
  for (let i = 0; i + 1 < markers.length; i += 2) {
    const hit = markers[i];
    const land = markers[i + 1];
    const distance = calcDistance(hit.x, hit.y, land.x, land.y) * pixelToMeter;
    console.log("calcDistance: ", calcDistance(hit.x, hit.y, land.x, land.y))
    console.log("distance: ", distance)
    const timeDiff = Math.abs(land.time - hit.time);
    console.log("timeDiff: ", timeDiff)
    // 單位轉換：m/s -> km/h
    const speed = timeDiff > 0 ? (distance / timeDiff * 3.6).toFixed(2) : 0;
    results.push({ hit, land, speed });
  }
  return results;
}
