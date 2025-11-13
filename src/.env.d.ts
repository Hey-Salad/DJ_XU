/**
 * @fileoverview Environment variable type declarations.
 */

interface ImportMetaEnv {
  /** Spotify Client ID */
  readonly VITE_SPOTIFY_CLIENT_ID: string;
  /** Spotify Client Secret */
  readonly VITE_SPOTIFY_CLIENT_SECRET: string;
  /** Spotify Redirect URI */
  readonly VITE_SPOTIFY_REDIRECT_URI: string;
  /** 11Labs Agent ID */
  readonly VITE_11LABS_AGENT_ID: string;
  /** 11Labs API Key */
  readonly VITE_11LABS_API_KEY: string;
  /** Google Cloud Project ID */
  readonly VITE_GOOGLE_PROJECT_ID: string;
  /** Google Cloud Location */
  readonly VITE_GOOGLE_LOCATION: string;
  /** Cloudflare Worker endpoint for DeepSeek proxy */
  readonly VITE_AI_PROXY_URL?: string;
  /** Supabase anonymous URL */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anonymous key */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Public base URL for building share links */
  readonly VITE_PUBLIC_BASE_URL?: string;
  /** Optional compatibility with Next.js style envs */
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
