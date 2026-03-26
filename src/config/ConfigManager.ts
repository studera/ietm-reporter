/**
 * Configuration Manager
 * Handles loading and validating IETM configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { config as loadDotenv } from 'dotenv';
import { IETMConfig } from '../types';

// Load .env file if it exists
loadDotenv();

/**
 * Load configuration from file or environment variables
 */
export function loadConfig(configPath?: string): IETMConfig {
  // Load from file first
  let config: Partial<IETMConfig> = {};
  
  if (configPath && fs.existsSync(configPath)) {
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    config = configPath.endsWith('.json')
      ? JSON.parse(fileContent)
      : yaml.load(fileContent) as IETMConfig;
  }

  // Deep merge with environment variables (env vars take precedence)
  const mergedConfig: IETMConfig = {
    server: {
      baseUrl: process.env.IETM_BASE_URL || config.server?.baseUrl || '',
      jtsUrl: process.env.IETM_JTS_URL || config.server?.jtsUrl,
      projectId: process.env.IETM_PROJECT_ID || config.server?.projectId,
      projectName: process.env.IETM_PROJECT_NAME || config.server?.projectName,
      contextId: process.env.IETM_CONTEXT_ID || config.server?.contextId,
      autoDiscoverIds: config.server?.autoDiscoverIds !== undefined
        ? config.server.autoDiscoverIds
        : true,
    },
    auth: config.auth ? { ...config.auth } : {
      type: 'basic',
      username: process.env.IETM_USERNAME || '',
      password: process.env.IETM_PASSWORD || '',
    },
    testPlan: config.testPlan,
    mapping: config.mapping,
    retry: config.retry,
    logging: config.logging,
    attachments: config.attachments,
    reporting: config.reporting,
  };

  // Replace ${VAR} placeholders in auth credentials
  if (mergedConfig.auth && 'username' in mergedConfig.auth) {
    if (mergedConfig.auth.username?.startsWith('${') && mergedConfig.auth.username.endsWith('}')) {
      const envVar = mergedConfig.auth.username.slice(2, -1);
      mergedConfig.auth.username = process.env[envVar] || '';
    }
    if (mergedConfig.auth.password?.startsWith('${') && mergedConfig.auth.password.endsWith('}')) {
      const envVar = mergedConfig.auth.password.slice(2, -1);
      mergedConfig.auth.password = process.env[envVar] || '';
    }
  }

  return mergedConfig;
}

/**
 * Validate configuration
 */
export function validateConfig(config: IETMConfig): void {
  const required = [
    'server.baseUrl',
    'server.projectId',
    'server.contextId',
    'auth.consumerKey',
    'auth.consumerSecret',
    'auth.accessToken',
    'auth.accessTokenSecret',
  ];

  for (const field of required) {
    const value = field.split('.').reduce((obj, key) => obj?.[key], config as any);
    if (!value) {
      throw new Error(`Missing required configuration: ${field}`);
    }
  }
}

export { IETMConfig };

// Made with Bob
