/**
 * ============================================
 * CLARA OS
 * ElevenLabs Connector
 * --------------------------------------------
 * File : elevenlabs-result.ts
 * Responsibility :
 * Defines the typed results returned
 * by ElevenLabs operations.
 * ============================================
 */

/**
 * ElevenLabs voice labels.
 */
export interface ElevenLabsVoiceLabels {

  /**
   * Accent label.
   */
  accent?: string;

  /**
   * Description label.
   */
  description?: string;

  /**
   * Age label.
   */
  age?: string;

  /**
   * Gender label.
   */
  gender?: string;

  /**
   * Use-case label.
   */
  useCase?: string;

}

/**
 * ElevenLabs voice.
 */
export interface ElevenLabsVoice {

  /**
   * Voice identifier.
   */
  voiceId: string;

  /**
   * Voice display name.
   */
  name: string;

  /**
   * Voice category.
   */
  category?: string;

  /**
   * Voice descriptive labels.
   */
  labels?: ElevenLabsVoiceLabels;

  /**
   * URL of the voice preview audio.
   */
  previewUrl?: string;

}

/**
 * ElevenLabs model.
 */
export interface ElevenLabsModel {

  /**
   * Model identifier.
   */
  modelId: string;

  /**
   * Model display name.
   */
  name: string;

  /**
   * Model description.
   */
  description?: string;

  /**
   * Whether this model supports text-to-speech.
   */
  canDoTextToSpeech: boolean;

  /**
   * Languages supported by the model.
   */
  languages: Array<{
    languageId: string;
    name: string;
  }>;

}

/**
 * Result returned by an ElevenLabs operation.
 */
export interface ElevenLabsResult {

  /**
   * Operation status.
   */
  readonly success: boolean;

  /**
   * Executed operation name.
   */
  readonly operation: string;

  /**
   * Raw audio data (text-to-speech).
   */
  readonly audioBuffer?: ArrayBuffer;

  /**
   * List of available voices (list-voices).
   */
  readonly voices?: ElevenLabsVoice[];

  /**
   * Single voice details (get-voice).
   */
  readonly voice?: ElevenLabsVoice;

  /**
   * List of available models (get-models).
   */
  readonly models?: ElevenLabsModel[];

  /**
   * Human-readable result message.
   */
  readonly message?: string;

  /**
   * Error description if the operation failed.
   */
  readonly error?: string;

  /**
   * Execution date.
   */
  readonly completedAt: Date;

}
