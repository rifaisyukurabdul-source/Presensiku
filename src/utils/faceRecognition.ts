// Biometric Face Feature Extraction and Recognition Engine

import { Student, FaceScanResult } from '../types';

/**
 * Extracts a normalized 64-dimensional biometric feature descriptor from an image or video element.
 * Based on spatial grid luminance, directional gradients (Sobel filter), and skin-tone chrominance distribution.
 */
export function extractFaceDescriptorFromCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  box?: { x: number; y: number; width: number; height: number }
): number[] {
  const targetX = Math.max(0, Math.floor(box ? box.x : width * 0.2));
  const targetY = Math.max(0, Math.floor(box ? box.y : height * 0.15));
  const targetW = Math.max(20, Math.floor(box ? box.width : width * 0.6));
  const targetH = Math.max(20, Math.floor(box ? box.height : height * 0.7));

  const imgData = ctx.getImageData(targetX, targetY, targetW, targetH);
  const data = imgData.data;

  // We split the detected face region into a 4x4 grid (16 cells)
  const gridDim = 4;
  const cellW = targetW / gridDim;
  const cellH = targetH / gridDim;

  // 16 cells * 4 features per cell = 64 dimensions:
  // 1. Mean luminance (brightness)
  // 2. Horizontal gradient intensity (edges)
  // 3. Vertical gradient intensity (edges)
  // 4. Relative skin chrominance (R - G) / (R + G + B + 1)
  const descriptor = new Array(64).fill(0);
  const cellCounts = new Array(16).fill(0);

  for (let y = 1; y < targetH - 1; y++) {
    const gy = Math.floor(y / cellH);
    if (gy >= gridDim) continue;

    for (let x = 1; x < targetW - 1; x++) {
      const gx = Math.floor(x / cellW);
      if (gx >= gridDim) continue;

      const cellIndex = gy * gridDim + gx;
      const idx = (y * targetW + x) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Sobel horizontal gradient
      const idxL = (y * targetW + (x - 1)) * 4;
      const idxR = (y * targetW + (x + 1)) * 4;
      const lumL = 0.299 * data[idxL] + 0.587 * data[idxL + 1] + 0.114 * data[idxL + 2];
      const lumR = 0.299 * data[idxR] + 0.587 * data[idxR + 1] + 0.114 * data[idxR + 2];
      const gradX = Math.abs(lumR - lumL);

      // Sobel vertical gradient
      const idxT = ((y - 1) * targetW + x) * 4;
      const idxB = ((y + 1) * targetW + x) * 4;
      const lumT = 0.299 * data[idxT] + 0.587 * data[idxT + 1] + 0.114 * data[idxT + 2];
      const lumB = 0.299 * data[idxB] + 0.587 * data[idxB + 1] + 0.114 * data[idxB + 2];
      const gradY = Math.abs(lumB - lumT);

      // Skin chrominance ratio
      const chrominance = (r - g) / (r + g + b + 1);

      descriptor[cellIndex * 4 + 0] += lum;
      descriptor[cellIndex * 4 + 1] += gradX;
      descriptor[cellIndex * 4 + 2] += gradY;
      descriptor[cellIndex * 4 + 3] += chrominance * 100;
      cellCounts[cellIndex]++;
    }
  }

  // Normalize each cell by pixel count
  for (let c = 0; c < 16; c++) {
    const count = Math.max(1, cellCounts[c]);
    descriptor[c * 4 + 0] /= count;
    descriptor[c * 4 + 1] /= count;
    descriptor[c * 4 + 2] /= count;
    descriptor[c * 4 + 3] /= count;
  }

  // Normalize full descriptor vector to unit length (L2 norm)
  let norm = 0;
  for (let i = 0; i < descriptor.length; i++) {
    norm += descriptor[i] * descriptor[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < descriptor.length; i++) {
      descriptor[i] /= norm;
    }
  }

  return descriptor;
}

/**
 * Calculates Cosine Similarity between two feature vectors [0.0 to 1.0].
 */
export function calculateSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Bound to [0, 1]
  return Math.max(0, Math.min(1, (similarity + 1) / 2));
}

/**
 * Detects presence of human skin / face region in image data.
 * Returns face center and bounding box.
 */
export function detectFaceRegion(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): { detected: boolean; box: { x: number; y: number; width: number; height: number } } {
  const step = 8;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let totalSkinPixels = 0;
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Standard human skin tone detection rule in RGB space
      // R > 95 & G > 40 & B > 20 & max(R,G,B) - min(R,G,B) > 15 & |R - G| > 15 & R > G & R > B
      const isSkin =
        r > 70 &&
        g > 35 &&
        b > 15 &&
        r > g &&
        r > b &&
        Math.max(r, g, b) - Math.min(r, g, b) > 12;

      if (isSkin) {
        totalSkinPixels++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const sampleCount = (width * height) / (step * step);
  const skinRatio = totalSkinPixels / sampleCount;

  // If sufficient skin pixels are clustered (at least 3% of camera frame)
  if (skinRatio > 0.03 && maxX > minX && maxY > minY) {
    const rawW = maxX - minX;
    const rawH = maxY - minY;
    // Pad slightly to encompass full head
    const padX = rawW * 0.15;
    const padY = rawH * 0.15;

    const x = Math.max(0, minX - padX);
    const y = Math.max(0, minY - padY);
    const w = Math.min(width - x, rawW + padX * 2);
    const h = Math.min(height - y, rawH + padY * 2);

    return {
      detected: true,
      box: { x, y, width: w, height: h },
    };
  }

  // Fallback centered target oval
  const fallbackW = width * 0.45;
  const fallbackH = height * 0.6;
  return {
    detected: false,
    box: {
      x: (width - fallbackW) / 2,
      y: (height - fallbackH) / 2,
      width: fallbackW,
      height: fallbackH,
    },
  };
}

/**
 * Extracts descriptor from an Image element (loaded from URL or Data URL)
 */
export async function extractDescriptorFromImageUrl(imageUrl: string): Promise<number[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(new Array(64).fill(0.1));
        return;
      }
      ctx.drawImage(img, 0, 0, 160, 160);
      const descriptor = extractFaceDescriptorFromCanvas(ctx, 160, 160);
      resolve(descriptor);
    };
    img.onerror = () => {
      // Return pseudo signature if image fails to load
      resolve(new Array(64).fill(0.12));
    };
    img.src = imageUrl;
  });
}

/**
 * Matches a live frame against the enrolled students database.
 */
export function matchStudentFace(
  liveDescriptor: number[],
  students: Student[],
  threshold = 0.70
): { matchedStudent?: Student; confidence: number; bestScore: number } {
  if (!students || students.length === 0 || !liveDescriptor) {
    return { confidence: 0, bestScore: 0 };
  }

  let bestMatch: Student | undefined = undefined;
  let highestScore = 0;

  for (const student of students) {
    if (!student.faceDescriptor || student.faceDescriptor.length === 0) continue;
    const score = calculateSimilarity(liveDescriptor, student.faceDescriptor);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = student;
    }
  }

  const confidence = Math.round(highestScore * 100);

  if (highestScore >= threshold && bestMatch) {
    return {
      matchedStudent: bestMatch,
      confidence,
      bestScore: highestScore,
    };
  }

  return {
    matchedStudent: undefined,
    confidence,
    bestScore: highestScore,
  };
}
