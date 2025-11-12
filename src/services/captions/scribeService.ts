/**
 * Service wrapper that handles the ElevenLabs Scribe real-time transcription WebSocket.
 * Includes retry logic, event dispatching, and helpers to stream audio chunks.
 */

export type ScribeConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected';

export interface ScribeStreamOptions {
  apiKey?: string;
  model?: string;
  language?: string;
  confidenceThreshold?: number;
  reconnectIntervalMs?: number;
  maxReconnectAttempts?: number;
}

export interface ScribeTranscriptPayload {
  text: string;
  startTimeMs: number;
  endTimeMs?: number;
  confidence: number;
  speaker?: 'DJ_XU' | 'USER' | 'SYSTEM';
  timestamp?: string;
}

type TranscriptCallback = (payload: ScribeTranscriptPayload) => void;
type StatusCallback = (status: ScribeConnectionState) => void;
type ErrorCallback = (error: Error) => void;

const DEFAULT_OPTIONS: Partial<ScribeStreamOptions> = {
  model: 'scribe',
  language: 'auto',
  confidenceThreshold: 0.6,
  reconnectIntervalMs: 3000,
  maxReconnectAttempts: 5,
};

export class ScribeService {
  private socket: WebSocket | null = null;
  private state: ScribeConnectionState = 'idle';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly transcriptListeners = new Set<TranscriptCallback>();
  private readonly statusListeners = new Set<StatusCallback>();
  private readonly errorListeners = new Set<ErrorCallback>();

  constructor(private readonly options: ScribeStreamOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  private notifyStatus(status: ScribeConnectionState) {
    this.state = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  private notifyError(error: Error) {
    this.errorListeners.forEach((cb) => cb(error));
  }

  private notifyTranscript(payload: ScribeTranscriptPayload) {
    this.transcriptListeners.forEach((cb) => cb(payload));
  }

  private getWebSocketUrl(): string {
    const base = 'wss://api.elevenlabs.io/v1/scribe';
    const url = new URL(base);
    url.searchParams.set('model', this.options.model ?? 'scribe');
    url.searchParams.set('language', this.options.language ?? 'auto');
    url.searchParams.set('confidence_threshold', `${this.options.confidenceThreshold ?? 0.6}`);
    const apiKey = this.options.apiKey ?? import.meta.env.VITE_11LABS_API_KEY;
    if (apiKey) {
      url.searchParams.set('xi-api-key', apiKey);
    }
    return url.toString();
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'transcript' || data.event === 'transcript') {
        const payload: ScribeTranscriptPayload = {
          text: data.text ?? data.payload?.text ?? '',
          confidence: data.confidence ?? data.payload?.confidence ?? 0,
          startTimeMs: data.startTimeMs ?? data.payload?.start_time ?? 0,
          endTimeMs: data.endTimeMs ?? data.payload?.end_time,
          speaker: data.speaker ?? data.payload?.speaker,
          timestamp: data.timestamp ?? data.payload?.timestamp,
        };
        this.notifyTranscript(payload);
      } else if (data.type === 'error' || data.event === 'error') {
        this.notifyError(new Error(data.message ?? 'Scribe stream error'));
      }
    } catch (error) {
      this.notifyError(error instanceof Error ? error : new Error('Unable to parse scribe event'));
    }
  }

  private handleClose() {
    this.notifyStatus('disconnected');
    const { maxReconnectAttempts, reconnectIntervalMs } = this.options;
    if (reconnectIntervalMs == null) {
      return;
    }
    if (this.reconnectAttempts >= (maxReconnectAttempts ?? 5)) {
      return;
    }
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => this.notifyError(error));
    }, reconnectIntervalMs);
  }

  private encodeBase64(chunk: Float32Array | ArrayBuffer): string {
    const buffer =
      chunk instanceof Float32Array
        ? new Uint8Array(chunk.buffer)
        : new Uint8Array(chunk instanceof ArrayBuffer ? chunk : chunk.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < buffer.length; i += chunkSize) {
      binary += String.fromCharCode(...buffer.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  private sendMessage(payload: unknown) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  public async connect(): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    this.notifyStatus('connecting');
    this.socket = new WebSocket(this.getWebSocketUrl());

    this.socket.addEventListener('open', () => {
      this.reconnectAttempts = 0;
      this.notifyStatus('connected');
      this.sendMessage({
        type: 'start_stream',
        payload: {
          metadata: { source: 'dj-xu' },
        },
      });
    });

    this.socket.addEventListener('message', (event) => this.handleMessage(event));
    this.socket.addEventListener('error', (event) => {
      this.notifyError(new Error('Scribe WebSocket encountered an error'));
      console.error('ScribeService WebSocket error', event);
    });
    this.socket.addEventListener('close', () => this.handleClose());
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.notifyStatus('disconnected');
  }

  public streamAudioChunk(audio: Float32Array | ArrayBuffer) {
    const encoded = this.encodeBase64(audio);
    this.sendMessage({
      type: 'audio',
      payload: {
        content: encoded,
        timestamp: Date.now(),
      },
    });
  }

  public onTranscript(callback: TranscriptCallback) {
    this.transcriptListeners.add(callback);
    return () => this.transcriptListeners.delete(callback);
  }

  public onStatus(callback: StatusCallback) {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  public onError(callback: ErrorCallback) {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }
}
