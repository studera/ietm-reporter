/**
 * Configuration Manager
 * Handles loading and validating IETM configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { IETMConfig } from '../types';

/**
 * Load configuration from file or environment variables
 */
export function loadConfig(configPath?: string): IETMConfig {
  // TODO: Implement configuration loading logic
  // Priority: CLI args > Environment variables > Config file > Defaults
  
  const config: IETMConfig = {
    server: {
      baseUrl: process.env.IETM_BASE_URL || '',
      projectId: process.env.IETM_PROJECT_ID || '',
      contextId: process.env.IETM_CONTEXT_ID || '',
    },
    auth: {
      consumerKey: process.env.IETM_CONSUMER_KEY || '',
      consumerSecret: process.env.IETM_CONSUMER_SECRET || '',
      accessToken: process.env.IETM_ACCESS_TOKEN || '',
      accessTokenSecret: process.env.IETM_ACCESS_TOKEN_SECRET || '',
    },
  };

  if (configPath && fs.existsSync(configPath)) {
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const fileConfig = configPath.endsWith('.json')
      ? JSON.parse(fileContent)
      : yaml.load(fileContent);
    
    Object.assign(config, fileConfig);
  }

  return config;
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
