import { GoogleGenAI, Modality, type Candidate, type GenerateContentResponse } from '@google/genai';
import type { GenerationSettings } from '../types';
import { normalizeApiKey, validateApiKey } from '../utils/apiKey';

const MODEL_NAME = 'gemini-3-pro-image-preview';
const MAX_SINGLE_IMAGE_RETRIES = 2;
const RETRY_DELAY_BASE_MS = 450;

interface ParsedApiError {
  code?: number;
  message?: string;
  reason?: string;
  status?: string;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function parseApiErrorPayload(rawMessage: string): ParsedApiError | null {
  const trimmed = rawMessage.trim();
  const parseCandidates: string[] = [trimmed];
  const embeddedJsonStart = trimmed.indexOf('{"error"');
  if (embeddedJsonStart >= 0) {
    const lastBrace = trimmed.lastIndexOf('}');
    if (lastBrace > embeddedJsonStart) {
      parseCandidates.push(trimmed.slice(embeddedJsonStart, lastBrace + 1));
    }
  }

  for (const candidate of parseCandidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        error?: {
          code?: number;
          message?: string;
          status?: string;
          details?: Array<{ reason?: string }>;
        };
      };
      const payload = parsed.error;
      if (!payload) continue;
      const reason = payload.details?.find((detail) => typeof detail?.reason === 'string')?.reason;
      return {
        code: payload.code,
        message: payload.message,
        reason,
        status: payload.status,
      };
    } catch {
      // Try the next parse candidate.
    }
  }

  return null;
}

function normalizeMimeType(raw?: string): string {
  if (!raw) return 'image/png';
  if (raw === 'image/jpg') return 'image/jpeg';
  if (raw.startsWith('image/')) return raw;
  return 'image/png';
}

function toDataUrl(base64Data: string, mimeType?: string): string {
  return `data:${normalizeMimeType(mimeType)};base64,${base64Data}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractInlineImageFromCandidates(candidates?: Candidate[]): { data: string; mimeType: string } | null {
  if (!candidates?.length) return null;

  for (const candidate of candidates) {
    const parts = candidate.content?.parts;
    if (!parts?.length) continue;

    for (const part of parts) {
      if (part.inlineData?.data) {
        return {
          data: part.inlineData.data,
          mimeType: normalizeMimeType(part.inlineData.mimeType),
        };
      }
    }
  }

  return null;
}

function buildNoImageErrorMessage(response: GenerateContentResponse): string {
  const blockReason = response.promptFeedback?.blockReason || '';
  const finishReason = response.candidates?.[0]?.finishReason || '';
  const textHint = response.text?.trim() || '';

  if (
    blockReason === 'SAFETY' ||
    blockReason === 'IMAGE_SAFETY' ||
    finishReason === 'SAFETY' ||
    finishReason === 'IMAGE_SAFETY'
  ) {
    return '请求被安全策略拦截，未返回图像。请调整提示词后重试。';
  }

  if (textHint) {
    return `模型未返回图像数据。模型提示：${textHint}`;
  }

  const candidateCount = response.candidates?.length ?? 0;
  return `模型未返回图像数据（finishReason=${finishReason || 'N/A'}, blockReason=${blockReason || 'N/A'}, candidates=${candidateCount}），请稍后重试。`;
}

async function generateSingleImage(ai: GoogleGenAI, settings: GenerationSettings): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [{ text: settings.prompt }],
    },
    config: {
      responseModalities: [Modality.IMAGE],
      imageConfig: {
        aspectRatio: settings.aspectRatio,
        imageSize: settings.imageSize,
      },
    },
  });

  if (response.data) {
    return toDataUrl(response.data, 'image/png');
  }

  const imagePayload = extractInlineImageFromCandidates(response.candidates);
  if (imagePayload) {
    return toDataUrl(imagePayload.data, imagePayload.mimeType);
  }

  throw new Error(buildNoImageErrorMessage(response));
}

function normalizeGenerationError(error: unknown): Error {
  const rawMessage = toErrorMessage(error);
  const parsedError = parseApiErrorPayload(rawMessage);
  const normalizedMessage = (parsedError?.message || rawMessage).toLowerCase();
  const reason = parsedError?.reason || '';

  if (rawMessage.includes('non ISO-8859-1 code point')) {
    return new Error('API Key 包含非法字符，请重新粘贴纯文本 Key。');
  }

  if (
    reason === 'API_KEY_INVALID' ||
    normalizedMessage.includes('api key not valid') ||
    normalizedMessage.includes('invalid api key')
  ) {
    return new Error('API Key 无效，请点击右上角 API Key 重新填写。');
  }

  if (parsedError?.code === 429 || normalizedMessage.includes('quota') || normalizedMessage.includes('rate limit')) {
    return new Error('请求频率或配额已达上限，请稍后再试。');
  }

  if (parsedError?.code === 403 || normalizedMessage.includes('permission denied')) {
    return new Error('API Key 无权限访问 Gemini 图像生成功能，请检查 Key 的项目和 API 权限。');
  }

  if (
    normalizedMessage.includes('requested entity was not found') ||
    (normalizedMessage.includes('model') && normalizedMessage.includes('not found'))
  ) {
    return new Error('当前 API Key 环境暂不支持 Gemini 3 Pro Image 模型，请确认账号权限或更换可用 Key。');
  }

  if (normalizedMessage.includes('image size') && normalizedMessage.includes('not supported')) {
    return new Error('该模型链路不支持当前尺寸参数，请切换到 1K/2K 后重试。');
  }

  if (parsedError?.message) {
    return new Error(parsedError.message);
  }

  return error instanceof Error ? error : new Error('Image generation failed.');
}

function isRetryableSingleImageError(message: string): boolean {
  return (
    message.includes('模型未返回图像数据') ||
    message.includes('请求频率或配额已达上限')
  );
}

export async function generateImages(apiKey: string, settings: GenerationSettings): Promise<string[]> {
  try {
    const validationError = validateApiKey(apiKey);
    if (validationError) {
      throw new Error(validationError);
    }

    const ai = new GoogleGenAI({ apiKey: normalizeApiKey(apiKey) });
    const images: string[] = [];
    const failedMessages: string[] = [];

    for (let i = 0; i < settings.numberOfImages; i++) {
      let generated = false;

      for (let attempt = 0; attempt <= MAX_SINGLE_IMAGE_RETRIES; attempt++) {
        try {
          const image = await generateSingleImage(ai, settings);
          images.push(image);
          generated = true;
          break;
        } catch (error: unknown) {
          const normalizedError = normalizeGenerationError(error);
          const canRetry = attempt < MAX_SINGLE_IMAGE_RETRIES && isRetryableSingleImageError(normalizedError.message);

          if (!canRetry) {
            if (!isRetryableSingleImageError(normalizedError.message)) {
              throw normalizedError;
            }
            failedMessages.push(normalizedError.message);
            break;
          }

          await delay(RETRY_DELAY_BASE_MS * (attempt + 1));
        }
      }

      if (!generated) {
        // Keep trying remaining items only for non-fatal per-image misses.
        continue;
      }

      // Add a tiny gap between requests to reduce burst failures in multi-image mode.
      if (i < settings.numberOfImages - 1) {
        await delay(120);
      }
    }

    if (images.length === 0) {
      throw new Error(failedMessages[0] || '模型未返回图像数据，请稍后重试。');
    }

    if (images.length < settings.numberOfImages) {
      console.warn(
        `Only generated ${images.length}/${settings.numberOfImages} images successfully.`,
        failedMessages
      );
    }

    return images;
  } catch (error: unknown) {
    console.error('Image generation failed:', error);
    throw normalizeGenerationError(error);
  }
}
