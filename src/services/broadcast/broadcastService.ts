/**
 * Broadcast service for managing live broadcast sessions
 */

import type {
  StartBroadcastRequest,
  StartBroadcastResponse,
  SendCaptionRequest,
  BroadcastInfo
} from '../../types/broadcast';

export interface BroadcastServiceConfig {
  workerEndpoint: string;
}

export class BroadcastService {
  private readonly workerEndpoint: string;

  constructor(config: BroadcastServiceConfig) {
    this.workerEndpoint = config.workerEndpoint;
  }

  async startBroadcast(request: StartBroadcastRequest): Promise<StartBroadcastResponse> {
    const response = await fetch(`${this.workerEndpoint}/api/broadcast/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to start broadcast (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  async sendCaption(request: SendCaptionRequest): Promise<{ success: boolean; captionId?: number }> {
    const response = await fetch(`${this.workerEndpoint}/api/broadcast/caption`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send caption (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  async endBroadcast(broadcastToken: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.workerEndpoint}/api/broadcast/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ broadcastToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to end broadcast (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  async getBroadcastStatus(broadcastToken: string): Promise<BroadcastInfo | null> {
    const response = await fetch(`${this.workerEndpoint}/api/broadcast/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ broadcastToken }),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get broadcast status (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  async broadcastTrack(
    broadcastToken: string,
    track: {
      name: string;
      artist: string;
      album?: string;
      albumArtUrl?: string;
      id?: string;
    }
  ): Promise<{ success: boolean; trackId?: number }> {
    const response = await fetch(`${this.workerEndpoint}/api/broadcast/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ broadcastToken, track }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to broadcast track (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  getBroadcastUrl(token: string): string {
    return `https://djxu.live/stream/${token}`;
  }
}
