/**
 * @fileoverview Authentication configuration for Google Cloud.
 */

import { GoogleAuth } from 'google-auth-library';

/**
 * Creates and configures a Google Auth client.
 * 
 * @returns {GoogleAuth} Configured auth client
 */
export function createAuthClient(): GoogleAuth {
  return new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    projectId: process.env.VITE_GOOGLE_PROJECT_ID,
  });
}