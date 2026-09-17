import { assertAiEnabledForTenant } from "@/lib/ai";

const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/m4a",
  "audio/x-m4a",
  "video/webm",
]);

export class TranscriptionError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "TranscriptionError";
    this.code = code;
  }
}

function isAllowedAudioType(mime: string): boolean {
  const normalized = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  return ALLOWED_AUDIO_TYPES.has(normalized);
}

/**
 * Transkriberer tale via OpenAI Whisper. Lydbuffer kastes etter kall – ingen fil lagres.
 * GDPR art. 6: behandlingsgrunnlag er avtale (betalt tillegg). Art. 9: helseopplysninger
 * skal ikke dikteres unødvendig; kun den transkriberte teksten lagres i skjemaet.
 */
export async function transcribeAudioForTenant(input: {
  tenantId: string;
  audio: Blob | File | Buffer;
  fileName: string;
  mimeType: string;
}): Promise<string> {
  await assertAiEnabledForTenant(input.tenantId);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new TranscriptionError("AI_NOT_CONFIGURED", "AI er ikke konfigurert");
  }

  if (!isAllowedAudioType(input.mimeType)) {
    throw new TranscriptionError("UNSUPPORTED_TYPE", "Filtypen støttes ikke for tale-til-tekst");
  }

  const size =
    input.audio instanceof Blob
      ? input.audio.size
      : Buffer.isBuffer(input.audio)
        ? input.audio.byteLength
        : 0;
  if (size <= 0) {
    throw new TranscriptionError("EMPTY_AUDIO", "Lydopptaket er tomt");
  }
  if (size > MAX_AUDIO_BYTES) {
    throw new TranscriptionError("TOO_LARGE", "Lydopptaket er for stort (maks 10 MB)");
  }

  const form = new FormData();
  const file =
    input.audio instanceof Blob
      ? new File([input.audio], input.fileName, { type: input.mimeType })
      : new File([new Uint8Array(input.audio)], input.fileName, { type: input.mimeType });
  form.append("file", file);
  form.append("model", "whisper-1");
  form.append("language", "no");
  form.append("response_format", "json");

  const response = await fetch(OPENAI_TRANSCRIBE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    throw new TranscriptionError("UPSTREAM_ERROR", "Kunne ikke transkribere talen");
  }

  const data = (await response.json()) as { text?: string };
  const text = data.text?.trim() ?? "";
  if (!text) {
    throw new TranscriptionError("EMPTY_TRANSCRIPT", "Ingen tale ble gjenkjent");
  }
  return text;
}
