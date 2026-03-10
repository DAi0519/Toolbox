type BinaryMask = Uint8Array<ArrayBufferLike>;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const getIndex = (x: number, y: number, width: number): number => y * width + x;

const otsuThreshold = (gray: Float32Array): number => {
  const histogram = new Uint32Array(256);
  for (let index = 0; index < gray.length; index += 1) {
    histogram[clamp(Math.round(gray[index]), 0, 255)] += 1;
  }

  const total = gray.length;
  let sumAll = 0;
  for (let value = 0; value < 256; value += 1) {
    sumAll += value * histogram[value];
  }

  let sumBackground = 0;
  let weightBackground = 0;
  let bestThreshold = 128;
  let maxVariance = -1;

  for (let threshold = 0; threshold < 256; threshold += 1) {
    weightBackground += histogram[threshold];
    if (weightBackground === 0) continue;

    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += threshold * histogram[threshold];
    const diff = sumBackground / weightBackground - (sumAll - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * diff * diff;

    if (variance > maxVariance) {
      maxVariance = variance;
      bestThreshold = threshold;
    }
  }

  return bestThreshold;
};

const dilateN = (source: BinaryMask, width: number, height: number, rounds: number): BinaryMask => {
  let current: BinaryMask = source;
  for (let step = 0; step < rounds; step += 1) {
    const output: BinaryMask = new Uint8Array(current.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let hit = 0;
        for (let dy = -1; dy <= 1 && !hit; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && current[getIndex(nx, ny, width)]) {
              hit = 1;
              break;
            }
          }
        }
        output[getIndex(x, y, width)] = hit;
      }
    }
    current = output;
  }
  return current;
};

const erodeN = (source: BinaryMask, width: number, height: number, rounds: number): BinaryMask => {
  let current: BinaryMask = source;
  for (let step = 0; step < rounds; step += 1) {
    const output: BinaryMask = new Uint8Array(current.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let keep = 1;
        for (let dy = -1; dy <= 1 && keep; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height || !current[getIndex(nx, ny, width)]) {
              keep = 0;
              break;
            }
          }
        }
        output[getIndex(x, y, width)] = keep;
      }
    }
    current = output;
  }
  return current;
};

const gaussianBlur3 = (source: Float32Array, width: number, height: number): Float32Array => {
  const output = new Float32Array(source.length);
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let sum = 0;
      let kernelIndex = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          sum += source[getIndex(x + dx, y + dy, width)] * kernel[kernelIndex];
          kernelIndex += 1;
        }
      }
      output[getIndex(x, y, width)] = sum / 16;
    }
  }

  return output;
};

const cannyLite = (gray: Float32Array, width: number, height: number): Float32Array => {
  const blurred = gaussianBlur3(gaussianBlur3(gray, width, height), width, height);
  const gradientX = new Float32Array(width * height);
  const gradientY = new Float32Array(width * height);
  const magnitude = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const tl = blurred[getIndex(x - 1, y - 1, width)];
      const tc = blurred[getIndex(x, y - 1, width)];
      const tr = blurred[getIndex(x + 1, y - 1, width)];
      const ml = blurred[getIndex(x - 1, y, width)];
      const mr = blurred[getIndex(x + 1, y, width)];
      const bl = blurred[getIndex(x - 1, y + 1, width)];
      const bc = blurred[getIndex(x, y + 1, width)];
      const br = blurred[getIndex(x + 1, y + 1, width)];

      const sx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const sy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const index = getIndex(x, y, width);
      gradientX[index] = sx;
      gradientY[index] = sy;
      magnitude[index] = Math.hypot(sx, sy);
    }
  }

  const output = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = getIndex(x, y, width);
      const value = magnitude[index];
      if (value < 1) continue;

      const angle = Math.atan2(gradientY[index], gradientX[index]);
      const direction = ((angle * 4) / Math.PI + 4.5) | 0;
      const bucket = direction % 4;

      let neighborA = 0;
      let neighborB = 0;
      if (bucket === 0) {
        neighborA = magnitude[getIndex(x - 1, y, width)];
        neighborB = magnitude[getIndex(x + 1, y, width)];
      } else if (bucket === 1) {
        neighborA = magnitude[getIndex(x - 1, y - 1, width)];
        neighborB = magnitude[getIndex(x + 1, y + 1, width)];
      } else if (bucket === 2) {
        neighborA = magnitude[getIndex(x, y - 1, width)];
        neighborB = magnitude[getIndex(x, y + 1, width)];
      } else {
        neighborA = magnitude[getIndex(x + 1, y - 1, width)];
        neighborB = magnitude[getIndex(x - 1, y + 1, width)];
      }

      output[index] = value >= neighborA && value >= neighborB ? value : 0;
    }
  }

  return output;
};

const hysteresisThreshold = (edges: Float32Array, width: number, height: number): BinaryMask => {
  let maxValue = 0;
  for (let index = 0; index < edges.length; index += 1) {
    if (edges[index] > maxValue) maxValue = edges[index];
  }
  if (maxValue === 0) return new Uint8Array(edges.length);

  const highThreshold = maxValue * 0.12;
  const lowThreshold = highThreshold * 0.4;
  const output: BinaryMask = new Uint8Array(edges.length);
  const queue: number[] = [];

  for (let index = 0; index < edges.length; index += 1) {
    if (edges[index] >= highThreshold) {
      output[index] = 1;
      queue.push(index);
    }
  }

  while (queue.length > 0) {
    const current = queue.pop() as number;
    const x = current % width;
    const y = (current / width) | 0;

    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

        const neighborIndex = getIndex(nx, ny, width);
        if (output[neighborIndex] === 0 && edges[neighborIndex] >= lowThreshold) {
          output[neighborIndex] = 1;
          queue.push(neighborIndex);
        }
      }
    }
  }

  return output;
};

const countBorder = (mask: BinaryMask, width: number, height: number): number => {
  let count = 0;
  for (let x = 0; x < width; x += 1) {
    count += mask[getIndex(x, 0, width)];
    count += mask[getIndex(x, height - 1, width)];
  }
  for (let y = 1; y < height - 1; y += 1) {
    count += mask[getIndex(0, y, width)];
    count += mask[getIndex(width - 1, y, width)];
  }
  return count;
};

const maskArea = (mask: BinaryMask): number => {
  let area = 0;
  for (let index = 0; index < mask.length; index += 1) {
    area += mask[index];
  }
  return area;
};

const buildForeground = (gray: Float32Array, width: number, height: number): BinaryMask => {
  const threshold = otsuThreshold(gray);
  const light: BinaryMask = new Uint8Array(gray.length);
  const dark: BinaryMask = new Uint8Array(gray.length);

  for (let index = 0; index < gray.length; index += 1) {
    if (gray[index] >= threshold) {
      light[index] = 1;
    } else {
      dark[index] = 1;
    }
  }

  const lightBorder = countBorder(light, width, height);
  const darkBorder = countBorder(dark, width, height);
  let foreground: BinaryMask = lightBorder < darkBorder ? light : dark;

  const total = width * height;
  const ratio = maskArea(foreground) / total;
  if (ratio < 0.02 || ratio > 0.85) {
    const inverted: BinaryMask = new Uint8Array(foreground.length);
    for (let index = 0; index < foreground.length; index += 1) {
      inverted[index] = foreground[index] ? 0 : 1;
    }
    const invertedRatio = maskArea(inverted) / total;
    if (invertedRatio >= 0.02 && invertedRatio <= 0.85) {
      foreground = inverted;
    }
  }

  return foreground;
};

const largestComponent = (mask: BinaryMask, width: number, height: number): BinaryMask => {
  const visited: BinaryMask = new Uint8Array(mask.length);
  let bestComponent: number[] = [];

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] || visited[index]) continue;

    const queue: number[] = [index];
    const component: number[] = [];
    visited[index] = 1;

    while (queue.length > 0) {
      const current = queue.pop() as number;
      component.push(current);
      const x = current % width;
      const y = (current / width) | 0;

      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

        const neighborIndex = getIndex(nx, ny, width);
        if (mask[neighborIndex] && !visited[neighborIndex]) {
          visited[neighborIndex] = 1;
          queue.push(neighborIndex);
        }
      }
    }

    if (component.length > bestComponent.length) {
      bestComponent = component;
    }
  }

  const output: BinaryMask = new Uint8Array(mask.length);
  for (const index of bestComponent) {
    output[index] = 1;
  }
  return output;
};

const outerBoundary = (mask: BinaryMask, width: number, height: number): BinaryMask => {
  const output: BinaryMask = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = getIndex(x, y, width);
      if (!mask[index]) continue;

      const left = x === 0 ? 0 : mask[getIndex(x - 1, y, width)];
      const right = x === width - 1 ? 0 : mask[getIndex(x + 1, y, width)];
      const top = y === 0 ? 0 : mask[getIndex(x, y - 1, width)];
      const bottom = y === height - 1 ? 0 : mask[getIndex(x, y + 1, width)];

      if (!left || !right || !top || !bottom) {
        output[index] = 1;
      }
    }
  }
  return output;
};

const poolCoverage = (
  edgeMask: BinaryMask,
  edgeMagnitude: Float32Array,
  width: number,
  height: number,
  gridSize: number,
): number[] => {
  const scores: number[] = [];
  const blockWidth = width / gridSize;
  const blockHeight = height / gridSize;

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const y0 = Math.floor(row * blockHeight);
      const y1 = Math.floor((row + 1) * blockHeight);
      const x0 = Math.floor(col * blockWidth);
      const x1 = Math.floor((col + 1) * blockWidth);

      let edgePixels = 0;
      let energySum = 0;
      let count = 0;

      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const index = getIndex(x, y, width);
          if (edgeMask[index]) edgePixels += 1;
          energySum += edgeMagnitude[index];
          count += 1;
        }
      }

      const coverage = count > 0 ? edgePixels / count : 0;
      const energy = count > 0 ? energySum / count : 0;
      scores.push(coverage * 0.75 + energy * 0.25);
    }
  }

  return scores;
};

const selectCellsWithConnectivity = (
  scores: number[],
  gridSize: number,
  minRatio: number,
  maxRatio: number,
): Set<number> => {
  const totalCells = gridSize * gridSize;
  const minCells = Math.max(8, Math.floor(totalCells * minRatio));
  const maxCells = Math.floor(totalCells * maxRatio);

  const sorted = scores
    .map((score, index) => ({ index, score }))
    .filter((item) => item.score > 0.0005)
    .sort((left, right) => right.score - left.score);

  if (sorted.length === 0) return new Set();

  const topScore = sorted[0].score;
  const cutoff = topScore * 0.18;
  const active = new Set<number>();
  const candidates = new Set<number>();

  for (const { index, score } of sorted) {
    if (score >= cutoff && active.size < maxCells) {
      active.add(index);
    } else {
      candidates.add(index);
    }
  }

  const getNeighbors = (cell: number): number[] => {
    const row = Math.floor(cell / gridSize);
    const col = cell % gridSize;
    const neighbors: number[] = [];
    if (row > 0) neighbors.push((row - 1) * gridSize + col);
    if (row < gridSize - 1) neighbors.push((row + 1) * gridSize + col);
    if (col > 0) neighbors.push(row * gridSize + col - 1);
    if (col < gridSize - 1) neighbors.push(row * gridSize + col + 1);
    return neighbors;
  };

  let changed = true;
  while (changed && active.size < maxCells) {
    changed = false;
    for (const candidate of [...candidates]) {
      if (active.has(candidate)) continue;
      const activeNeighbors = getNeighbors(candidate).filter((neighbor) => active.has(neighbor)).length;
      if (activeNeighbors >= 1 && scores[candidate] >= cutoff * 0.5) {
        active.add(candidate);
        candidates.delete(candidate);
        changed = true;
      }
    }
  }

  if (active.size < minCells) {
    for (const { index } of sorted) {
      if (active.size >= minCells) break;
      active.add(index);
    }
  }

  return active;
};

const normalize = (values: Float32Array): Float32Array => {
  let max = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] > max) max = values[index];
  }
  if (max <= 0) return values;

  const output = new Float32Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    output[index] = values[index] / max;
  }
  return output;
};

const sampleEdgeColor = (imageBitmap: ImageBitmap): { r: number; g: number; b: number } => {
  const sampleCanvas = document.createElement('canvas');
  const sampleSize = 32;
  sampleCanvas.width = sampleSize;
  sampleCanvas.height = sampleSize;
  const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });

  if (!sampleContext) {
    return { r: 240, g: 240, b: 240 };
  }

  sampleContext.drawImage(imageBitmap, 0, 0, sampleSize, sampleSize);
  const rgba = sampleContext.getImageData(0, 0, sampleSize, sampleSize).data;

  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let y = 0; y < sampleSize; y += 1) {
    for (let x = 0; x < sampleSize; x += 1) {
      if (x !== 0 && x !== sampleSize - 1 && y !== 0 && y !== sampleSize - 1) continue;
      const index = (y * sampleSize + x) * 4;
      red += rgba[index];
      green += rgba[index + 1];
      blue += rgba[index + 2];
      count += 1;
    }
  }

  if (count === 0) {
    return { r: 240, g: 240, b: 240 };
  }

  return {
    r: Math.round(red / count),
    g: Math.round(green / count),
    b: Math.round(blue / count),
  };
};

export async function mapImageToGrid(file: File, gridSize: number): Promise<Set<number>> {
  const imageBitmap = await createImageBitmap(file);

  try {
    const analysisSize = Math.min(768, Math.max(gridSize * 32, 384));
    const canvas = document.createElement('canvas');
    canvas.width = analysisSize;
    canvas.height = analysisSize;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas context unavailable');

    const background = sampleEdgeColor(imageBitmap);
    context.fillStyle = `rgb(${background.r}, ${background.g}, ${background.b})`;
    context.fillRect(0, 0, analysisSize, analysisSize);

    const scale = Math.min(analysisSize / imageBitmap.width, analysisSize / imageBitmap.height);
    const drawWidth = imageBitmap.width * scale;
    const drawHeight = imageBitmap.height * scale;
    const drawX = (analysisSize - drawWidth) / 2;
    const drawY = (analysisSize - drawHeight) / 2;
    const contentLeft = Math.floor(drawX);
    const contentTop = Math.floor(drawY);
    const contentRight = Math.ceil(drawX + drawWidth);
    const contentBottom = Math.ceil(drawY + drawHeight);
    const frameSuppression = Math.max(2, Math.round(Math.min(drawWidth, drawHeight) * 0.01));

    context.drawImage(imageBitmap, drawX, drawY, drawWidth, drawHeight);
    const rgba = context.getImageData(0, 0, analysisSize, analysisSize).data;

    const gray = new Float32Array(analysisSize * analysisSize);
    for (let index = 0; index < rgba.length; index += 4) {
      gray[index / 4] = 0.299 * rgba[index] + 0.587 * rgba[index + 1] + 0.114 * rgba[index + 2];
    }

    const cannyEdges = cannyLite(gray, analysisSize, analysisSize);
    const borderMargin = Math.max(4, Math.round(analysisSize * 0.04));

    for (let y = 0; y < analysisSize; y += 1) {
      for (let x = 0; x < analysisSize; x += 1) {
        const outsideContent =
          x < contentLeft || x >= contentRight || y < contentTop || y >= contentBottom;
        const nearContentFrame =
          (Math.abs(x - contentLeft) < frameSuppression || Math.abs(x - (contentRight - 1)) < frameSuppression) &&
            y >= contentTop &&
            y < contentBottom ||
          (Math.abs(y - contentTop) < frameSuppression || Math.abs(y - (contentBottom - 1)) < frameSuppression) &&
            x >= contentLeft &&
            x < contentRight;

        if (
          outsideContent ||
          nearContentFrame ||
          x < borderMargin ||
          x >= analysisSize - borderMargin ||
          y < borderMargin ||
          y >= analysisSize - borderMargin
        ) {
          cannyEdges[getIndex(x, y, analysisSize)] = 0;
        }
      }
    }

    const edgeBinary = hysteresisThreshold(cannyEdges, analysisSize, analysisSize);
    const thicknessRounds = Math.max(2, Math.round(analysisSize / gridSize / 6));
    const thickEdges = dilateN(edgeBinary, analysisSize, analysisSize, thicknessRounds);

    let foreground = buildForeground(gray, analysisSize, analysisSize);
    for (let y = 0; y < analysisSize; y += 1) {
      for (let x = 0; x < analysisSize; x += 1) {
        if (x < contentLeft || x >= contentRight || y < contentTop || y >= contentBottom) {
          foreground[getIndex(x, y, analysisSize)] = 0;
        }
      }
    }
    foreground = erodeN(dilateN(foreground, analysisSize, analysisSize, 2), analysisSize, analysisSize, 2);
    foreground = dilateN(erodeN(foreground, analysisSize, analysisSize, 1), analysisSize, analysisSize, 1);

    const mainSubject = largestComponent(foreground, analysisSize, analysisSize);
    const subjectArea = maskArea(mainSubject) / (analysisSize * analysisSize);

    if (subjectArea > 0.015 && subjectArea < 0.92) {
      let boundary = outerBoundary(mainSubject, analysisSize, analysisSize);
      const boundaryThickness = Math.max(3, Math.round(analysisSize / gridSize / 4));
      boundary = dilateN(boundary, analysisSize, analysisSize, boundaryThickness);

      const contourMask: BinaryMask = new Uint8Array(analysisSize * analysisSize);
      for (let index = 0; index < contourMask.length; index += 1) {
        contourMask[index] = boundary[index] || thickEdges[index] ? 1 : 0;
      }

      const combinedMagnitude = new Float32Array(analysisSize * analysisSize);
      const normalizedCanny = normalize(cannyEdges);
      for (let index = 0; index < combinedMagnitude.length; index += 1) {
        if (boundary[index]) {
          combinedMagnitude[index] = 0.8 + normalizedCanny[index] * 0.2;
        } else if (thickEdges[index]) {
          combinedMagnitude[index] = normalizedCanny[index] * 0.6;
        }
      }

      const scores = poolCoverage(contourMask, combinedMagnitude, analysisSize, analysisSize, gridSize);
      return selectCellsWithConnectivity(scores, gridSize, 0.1, 0.45);
    }

    const normalizedCanny = normalize(cannyEdges);
    const scores = poolCoverage(thickEdges, normalizedCanny, analysisSize, analysisSize, gridSize);
    return selectCellsWithConnectivity(scores, gridSize, 0.08, 0.4);
  } finally {
    if (typeof imageBitmap.close === 'function') {
      imageBitmap.close();
    }
  }
}
