/**
 * ============================================
 * CLARA OS
 * ElevenLabs Connector
 * --------------------------------------------
 * File : elevenlabs-engine.ts
 * Responsibility :
 * Executes real ElevenLabs API operations.
 * ============================================
 */

import { elevenLabsConfig } from "@/lib/config/elevenlabs";
import type { ElevenLabsContext } from "./elevenlabs-context";
import type {
  ElevenLabsModel,
  ElevenLabsResult,
  ElevenLabsVoice,
} from "./elevenlabs-result";

/**
 * ElevenLabs REST API base URL.
 */
const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

/**
 * Default model used when none is specified.
 */
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

/**
 * Default output audio format.
 */
const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128";

/**
 * Engine that coordinates ElevenLabs API operations.
 */
export class ElevenLabsEngine {

  /**
   * Returns the API key or throws if it is absent.
   */
  private getApiKey(): string {

    const key = elevenLabsConfig.apiKey;

    if (!key) {
      throw new Error(
        "ELEVENLABS_API_KEY is missing. " +
        "Set this environment variable on the server.",
      );
    }

    return key;

  }

  /**
   * Sends an authenticated fetch to the ElevenLabs API
   * and returns the raw Response.
   */
  private async fetchRaw(
    path: string,
    options?: RequestInit,
  ): Promise<Response> {

    const apiKey = this.getApiKey();

    const headers = new Headers();
    headers.set("xi-api-key", apiKey);
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");

    if (options?.headers) {
      new Headers(options.headers as HeadersInit).forEach(
        (value, key) => headers.set(key, value),
      );
    }

    const response = await fetch(
      `${ELEVENLABS_API_BASE}${path}`,
      {
        ...options,
        headers,
      },
    );

    if (!response.ok) {

      const text = await response.text();

      throw new Error(
        `ElevenLabs API error ${response.status}: ${text}`,
      );

    }

    return response;

  }

  /**
   * Sends an authenticated request to the ElevenLabs API
   * and returns a parsed JSON response.
   */
  private async request<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> {

    const response = await this.fetchRaw(path, options);

    return response.json() as Promise<T>;

  }

  /**
   * Sends an authenticated binary request to the ElevenLabs API
   * and returns the raw response body as an ArrayBuffer.
   */
  private async requestBinary(
    path: string,
    options?: RequestInit,
  ): Promise<ArrayBuffer> {

    const response = await this.fetchRaw(path, options);

    return response.arrayBuffer();

  }

  /**
   * Converts text to speech and returns the audio as a Buffer.
   */
  public async textToSpeech(
    context: ElevenLabsContext,
  ): Promise<ElevenLabsResult> {

    if (!context.text) {
      return {
        success: false,
        operation: "text-to-speech",
        error: "text is required for text-to-speech.",
        completedAt: new Date(),
      };
    }

    if (!context.voiceId) {
      return {
        success: false,
        operation: "text-to-speech",
        error: "voiceId is required for text-to-speech.",
        completedAt: new Date(),
      };
    }

    try {

      const modelId = context.modelId ?? DEFAULT_MODEL_ID;
      const outputFormat = context.outputFormat ?? DEFAULT_OUTPUT_FORMAT;

      const audioBuffer = await this.requestBinary(
        `/text-to-speech/${encodeURIComponent(context.voiceId)}` +
        `?output_format=${encodeURIComponent(outputFormat)}`,
        {
          method: "POST",
          body: JSON.stringify({
            text: context.text,
            model_id: modelId,
            voice_settings: {
              stability: context.stability ?? 0.5,
              similarity_boost: context.similarityBoost ?? 0.75,
              style: context.style ?? 0,
              use_speaker_boost: context.useSpeakerBoost ?? true,
            },
          }),
        },
      );

      return {
        success: true,
        operation: "text-to-speech",
        audioBuffer,
        message: `Audio generated for voice ${context.voiceId}.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return {
        success: false,
        operation: "text-to-speech",
        error:
          error instanceof Error
            ? error.message
            : "Unknown ElevenLabs error.",
        completedAt: new Date(),
      };

    }

  }

  /**
   * Lists all available voices from ElevenLabs.
   */
  public async listVoices(): Promise<ElevenLabsResult> {

    try {

      const data = await this.request<{
        voices: Array<{
          voice_id: string;
          name: string;
          category?: string;
          labels?: Record<string, string>;
          preview_url?: string;
        }>;
      }>("/voices");

      const voices: ElevenLabsVoice[] = data.voices.map((v) => ({
        voiceId: v.voice_id,
        name: v.name,
        category: v.category,
        labels: v.labels
          ? {
              accent: v.labels["accent"],
              description: v.labels["description"],
              age: v.labels["age"],
              gender: v.labels["gender"],
              useCase: v.labels["use case"],
            }
          : undefined,
        previewUrl: v.preview_url,
      }));

      return {
        success: true,
        operation: "list-voices",
        voices,
        message: `${voices.length} voice(s) retrieved.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return {
        success: false,
        operation: "list-voices",
        error:
          error instanceof Error
            ? error.message
            : "Unknown ElevenLabs error.",
        completedAt: new Date(),
      };

    }

  }

  /**
   * Retrieves a single voice by its identifier.
   */
  public async getVoice(
    context: ElevenLabsContext,
  ): Promise<ElevenLabsResult> {

    if (!context.voiceId) {
      return {
        success: false,
        operation: "get-voice",
        error: "voiceId is required for get-voice.",
        completedAt: new Date(),
      };
    }

    try {

      const data = await this.request<{
        voice_id: string;
        name: string;
        category?: string;
        labels?: Record<string, string>;
        preview_url?: string;
      }>(`/voices/${encodeURIComponent(context.voiceId)}`);

      const voice: ElevenLabsVoice = {
        voiceId: data.voice_id,
        name: data.name,
        category: data.category,
        labels: data.labels
          ? {
              accent: data.labels["accent"],
              description: data.labels["description"],
              age: data.labels["age"],
              gender: data.labels["gender"],
              useCase: data.labels["use case"],
            }
          : undefined,
        previewUrl: data.preview_url,
      };

      return {
        success: true,
        operation: "get-voice",
        voice,
        message: `Voice ${voice.name} retrieved.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return {
        success: false,
        operation: "get-voice",
        error:
          error instanceof Error
            ? error.message
            : "Unknown ElevenLabs error.",
        completedAt: new Date(),
      };

    }

  }

  /**
   * Lists all available models from ElevenLabs.
   */
  public async getModels(): Promise<ElevenLabsResult> {

    try {

      const data = await this.request<
        Array<{
          model_id: string;
          name: string;
          description?: string;
          can_do_text_to_speech?: boolean;
          languages?: Array<{
            language_id: string;
            name: string;
          }>;
        }>
      >("/models");

      const models: ElevenLabsModel[] = data.map((m) => ({
        modelId: m.model_id,
        name: m.name,
        description: m.description,
        canDoTextToSpeech: m.can_do_text_to_speech ?? false,
        languages: (m.languages ?? []).map((l) => ({
          languageId: l.language_id,
          name: l.name,
        })),
      }));

      return {
        success: true,
        operation: "get-models",
        models,
        message: `${models.length} model(s) retrieved.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return {
        success: false,
        operation: "get-models",
        error:
          error instanceof Error
            ? error.message
            : "Unknown ElevenLabs error.",
        completedAt: new Date(),
      };

    }

  }

  /**
   * Executes an ElevenLabs operation from its context.
   */
  public async execute(
    context: ElevenLabsContext,
  ): Promise<ElevenLabsResult> {

    switch (context.operation) {

      case "text-to-speech":
        return this.textToSpeech(context);

      case "list-voices":
        return this.listVoices();

      case "get-voice":
        return this.getVoice(context);

      case "get-models":
        return this.getModels();

      default: {
        const exhaustive: never = context.operation;
        return {
          success: false,
          operation: exhaustive,
          error: `Unknown ElevenLabs operation: ${exhaustive}.`,
          completedAt: new Date(),
        };
      }

    }

  }

}
