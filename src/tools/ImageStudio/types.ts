export const AspectRatio = {
  SQUARE: "1:1",
  PORTRAIT: "3:4",
  LANDSCAPE: "4:3",
  WIDE_LANDSCAPE: "16:9",
  TALL_PORTRAIT: "9:16",
} as const;
export type AspectRatio = typeof AspectRatio[keyof typeof AspectRatio];

export const ImageSize = {
  R1K: "1K",
  R2K: "2K",
  R4K: "4K",
} as const;
export type ImageSize = typeof ImageSize[keyof typeof ImageSize];

export interface GenerationSettings {
  prompt: string;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  numberOfImages: number;
}

export interface GenerationSession {
  id: string;
  images: string[]; // Array of Data URLs
  settings: GenerationSettings;
  timestamp: number;
}
