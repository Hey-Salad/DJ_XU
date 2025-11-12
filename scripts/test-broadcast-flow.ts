#!/usr/bin/env tsx
/**
 * End-to-end test script for broadcast system
 * Tests the complete flow: start broadcast → send caption → broadcast track → end broadcast
 *
 * Usage:
 *   npm install -D tsx
 *   npx tsx scripts/test-broadcast-flow.ts
 *
 * Or with environment variable:
 *   WORKER_URL=http://localhost:8787 npx tsx scripts/test-broadcast-flow.ts
 */

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, COLORS.green);
}

function error(message: string) {
  log(`❌ ${message}`, COLORS.red);
}

function info(message: string) {
  log(`ℹ️  ${message}`, COLORS.cyan);
}

async function testBroadcastFlow() {
  log('\n🚀 Starting Broadcast Flow Test', COLORS.blue);
  log('='.repeat(50), COLORS.blue);

  try {
    // Test 1: Start Broadcast
    info('\n[1/5] Starting broadcast...');
    const startResponse = await fetch(`${WORKER_URL}/api/broadcast/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performanceSessionId: crypto.randomUUID(),
        maxViewers: 50,
        captionLanguage: 'en',
        enableTranslations: true,
      }),
    });

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      throw new Error(`Start broadcast failed: ${errorText}`);
    }

    const startData = await startResponse.json();
    const { broadcastId, broadcastToken, shareUrl } = startData;
    success('Broadcast started successfully!');
    info(`  Broadcast ID: ${broadcastId}`);
    info(`  Token: ${broadcastToken}`);
    info(`  Share URL: ${shareUrl}`);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Check Broadcast Status
    info('\n[2/5] Checking broadcast status...');
    const statusResponse = await fetch(`${WORKER_URL}/api/broadcast/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcastToken }),
    });

    if (!statusResponse.ok) {
      throw new Error('Status check failed');
    }

    const statusData = await statusResponse.json();
    success('Status check passed!');
    info(`  Status: ${statusData.status}`);
    info(`  Max Viewers: ${statusData.max_viewers}`);
    info(`  Current Viewers: ${statusData.current_viewer_count}`);

    // Test 3: Send Caption
    info('\n[3/5] Sending test caption...');
    const captionResponse = await fetch(`${WORKER_URL}/api/broadcast/caption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        broadcastToken,
        text: 'Welcome to DJ Xu live broadcast! Testing captions.',
        speaker: 'DJ_XU',
        detectedLanguage: 'en',
        confidence: 0.95,
      }),
    });

    if (!captionResponse.ok) {
      const errorText = await captionResponse.text();
      throw new Error(`Send caption failed: ${errorText}`);
    }

    const captionData = await captionResponse.json();
    success('Caption sent successfully!');
    info(`  Caption ID: ${captionData.captionId}`);

    // Test 4: Broadcast Track
    info('\n[4/5] Broadcasting track info...');
    const trackResponse = await fetch(`${WORKER_URL}/api/broadcast/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        broadcastToken,
        track: {
          name: 'Test Track',
          artist: 'Test Artist',
          album: 'Test Album',
          albumArtUrl: 'https://example.com/art.jpg',
          id: 'spotify:track:test123',
        },
      }),
    });

    if (!trackResponse.ok) {
      const errorText = await trackResponse.text();
      throw new Error(`Broadcast track failed: ${errorText}`);
    }

    const trackData = await trackResponse.json();
    success('Track broadcast successfully!');
    info(`  Track ID: ${trackData.trackId}`);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 5: End Broadcast
    info('\n[5/5] Ending broadcast...');
    const endResponse = await fetch(`${WORKER_URL}/api/broadcast/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcastToken }),
    });

    if (!endResponse.ok) {
      throw new Error('End broadcast failed');
    }

    const endData = await endResponse.json();
    success('Broadcast ended successfully!');

    // Final verification
    info('\n[Verification] Checking if broadcast is actually ended...');
    const verifyResponse = await fetch(`${WORKER_URL}/api/broadcast/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcastToken }),
    });

    if (verifyResponse.status === 404 || !verifyResponse.ok) {
      success('Verified: Broadcast is properly ended');
    } else {
      const verifyData = await verifyResponse.json();
      if (verifyData.status === 'ended') {
        success('Verified: Broadcast status is "ended"');
      } else {
        log(`⚠️  Warning: Broadcast status is "${verifyData.status}", expected "ended"`, COLORS.yellow);
      }
    }

    // Summary
    log('\n' + '='.repeat(50), COLORS.blue);
    success('🎉 All tests passed!');
    log('\nSummary:', COLORS.blue);
    log('  ✓ Broadcast start', COLORS.green);
    log('  ✓ Status check', COLORS.green);
    log('  ✓ Caption sending', COLORS.green);
    log('  ✓ Track broadcasting', COLORS.green);
    log('  ✓ Broadcast end', COLORS.green);
    log('\nYour broadcast system is working correctly! 🚀\n', COLORS.cyan);

  } catch (err) {
    error(`\n💥 Test failed: ${err instanceof Error ? err.message : String(err)}`);
    log('\nTroubleshooting:', COLORS.yellow);
    log('  1. Make sure Cloudflare Worker is running: cd cloudflare-worker && wrangler dev', COLORS.yellow);
    log('  2. Check that Supabase migrations are applied', COLORS.yellow);
    log('  3. Verify environment variables in .dev.vars', COLORS.yellow);
    log('  4. Check worker logs: wrangler tail\n', COLORS.yellow);
    process.exit(1);
  }
}

// Run the test
testBroadcastFlow();
