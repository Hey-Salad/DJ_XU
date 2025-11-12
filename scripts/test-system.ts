/**
 * @fileoverview System test script for DJ XU components.
 * Tests connectivity and basic functionality of all services.
 */

import axios from 'axios';
import { logger } from '../server/src/utils/logger';

/**
 * Tests server health endpoint.
 * 
 * @returns {Promise<boolean>} Test result
 */
async function testServerHealth(): Promise<boolean> {
  try {
    const response = await axios.get('http://localhost:3001/health');
    return response.data.status === 'ok';
  } catch (error) {
    logger.error('Server health check failed', { error });
    return false;
  }
}

/**
 * Tests Vertex AI connectivity.
 * 
 * @returns {Promise<boolean>} Test result
 */
async function testVertexAI(): Promise<boolean> {
  try {
    const response = await axios.post('http://localhost:3001/api/vertex/test', {
      prompt: 'Test connection',
    });
    return response.status === 200;
  } catch (error) {
    logger.error('Vertex AI test failed', { error });
    return false;
  }
}

/**
 * Runs all system tests.
 */
async function runSystemTests(): Promise<void> {
  logger.info('Starting system tests...');

  const results = {
    server: await testServerHealth(),
    vertexAI: await testVertexAI(),
  };

  logger.info('Test results:', { results });

  const allPassed = Object.values(results).every(Boolean);
  if (!allPassed) {
    process.exit(1);
  }
}

runSystemTests();