type RGB = [number, number, number];

function getColorDistance(c1: RGB, c2: RGB): number {
  return (c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2;
}

export function rgbToHex([r, g, b]: RGB): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

export function hexToRgbArray(hex: string): RGB {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export function hexToRgbString(hex: string): string {
  const [r, g, b] = hexToRgbArray(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

export function hexToHslString(hex: string): string {
  const rgb = hexToRgbArray(hex);
  const [h, s, l] = rgbToHsl(rgb);
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

export function formatColor(hex: string, format: 'hex' | 'rgb' | 'hsl'): string {
  switch (format) {
    case 'hex':
      return hex.toUpperCase();
    case 'rgb':
      return hexToRgbString(hex);
    case 'hsl':
      return hexToHslString(hex);
  }
}

export function exportAsCSS(colors: string[]): string {
  const vars = colors
    .map((c, i) => `  --palette-${i + 1}: ${c};`)
    .join('\n');
  return `:root {\n${vars}\n}`;
}

export function exportAsJSON(colors: string[]): string {
  return JSON.stringify({ palette: colors }, null, 2);
}

/**
 * Extract dominant colors using K-Means clustering
 */
export async function extractColors(imageSrc: string, count: number = 12): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      // Scale down image for faster processing
      const MAX_SIZE = 100;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height).data;
      const pixels: RGB[] = [];

      for (let i = 0; i < imageData.length; i += 4) {
        // Skip highly transparent pixels
        if (imageData[i + 3] < 128) continue;
        pixels.push([imageData[i], imageData[i + 1], imageData[i + 2]]);
      }

      if (pixels.length === 0) {
        resolve([]);
        return;
      }

      // K-Means Initialization (K-Means++ style or uniform)
      const centroids: RGB[] = [];
      const step = Math.floor(pixels.length / count);
      for (let i = 0; i < count; i++) {
        centroids.push(pixels[Math.min(i * step, pixels.length - 1)]);
      }

      const iterations = 10;
      const clusters: RGB[][] = Array.from({ length: count }, () => []);

      for (let iter = 0; iter < iterations; iter++) {
        // Clear clusters
        for (let i = 0; i < count; i++) clusters[i] = [];

        // Assign to nearest centroid
        for (let i = 0; i < pixels.length; i++) {
          const p = pixels[i];
          let minDist = Infinity;
          let minIndex = 0;
          for (let j = 0; j < count; j++) {
            const dist = getColorDistance(p, centroids[j]);
            if (dist < minDist) {
              minDist = dist;
              minIndex = j;
            }
          }
          clusters[minIndex].push(p);
        }

        // Recalculate centroids
        for (let i = 0; i < count; i++) {
          if (clusters[i].length > 0) {
            let sumR = 0,
              sumG = 0,
              sumB = 0;
            for (const p of clusters[i]) {
              sumR += p[0];
              sumG += p[1];
              sumB += p[2];
            }
            centroids[i] = [
              sumR / clusters[i].length,
              sumG / clusters[i].length,
              sumB / clusters[i].length,
            ];
          }
        }
      }

      const clusterInfo = centroids
        .map((centroid, i) => ({
          rgb: centroid,
          count: clusters[i].length,
        }))
        .filter((entry) => entry.count > 0)
        .map((entry) => ({
          ...entry,
          hex: rgbToHex(entry.rgb),
          hue: rgbToHsl(entry.rgb)[0],
        }));

      if (clusterInfo.length === 0) {
        resolve([]);
        return;
      }

      // Dominant color first, while keeping the ring hue-continuous.
      const dominant = clusterInfo.reduce((max, current) =>
        current.count > max.count ? current : max
      );
      const hueSorted = [...clusterInfo].sort((a, b) => a.hue - b.hue);
      const dominantIndex = hueSorted.findIndex((entry) => entry.hex === dominant.hex);
      const wheelOrdered = dominantIndex >= 0
        ? [...hueSorted.slice(dominantIndex), ...hueSorted.slice(0, dominantIndex)]
        : hueSorted;

      const uniqueColors = Array.from(new Set(wheelOrdered.map((entry) => entry.hex)));
      resolve(uniqueColors);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}
