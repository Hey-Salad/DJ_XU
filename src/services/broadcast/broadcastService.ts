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
  // Base URL for broadcast API. Can be either:
  // - Cloudflare Worker base, expecting /api/broadcast/* routes
  // - Supabase Functions base (…/functions/v1), expecting /broadcast/* subpaths
  workerEndpoint: string;
}

export class BroadcastService {
  private readonly workerEndpoint: string;
  private readonly isSupabaseFunctions: boolean;

  constructor(config: BroadcastServiceConfig) {
    this.workerEndpoint = config.workerEndpoint.replace(/\/$/, '');
    this.isSupabaseFunctions = /\/functions\/v1(\/)?$/.test(this.workerEndpoint) || this.workerEndpoint.includes('.supabase.co/functions/v1');
  }

  private endpoint(path: string): string {
    if (this.isSupabaseFunctions) {
      return `${this.workerEndpoint}/broadcast/${path}`;
    }
    return `${this.workerEndpoint}/api/broadcast/${path}`;
  }

  async startBroadcast(request: StartBroadcastRequest): Promise<StartBroadcastResponse> {
    const response = await fetch(this.endpoint('start'), {
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
    const response = await fetch(this.endpoint('caption'), {
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
    const response = await fetch(this.endpoint('end'), {
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
    const response = await fetch(this.endpoint('status'), {
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
    const response = await fetch(this.endpoint('track'), {
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
