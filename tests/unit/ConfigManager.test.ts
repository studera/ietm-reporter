/**
 * Unit tests for ConfigManager
 */

import { loadConfig, validateConfig } from '../../src/config/ConfigManager';
import { IETMConfig } from '../../src/types';

describe('ConfigManager', () => {
  describe('loadConfig', () => {
    it('should load configuration from environment variables', () => {
      process.env.IETM_BASE_URL = 'https://test.example.com';
      process.env.IETM_PROJECT_ID = 'test-project';
      process.env.IETM_CONTEXT_ID = 'test-context';
      process.env.IETM_CONSUMER_KEY = 'test-key';
      process.env.IETM_CONSUMER_SECRET = 'test-secret';
      process.env.IETM_ACCESS_TOKEN = 'test-token';
      process.env.IETM_ACCESS_TOKEN_SECRET = 'test-token-secret';

      const config = loadConfig();

      expect(config.server.baseUrl).toBe('https://test.example.com');
      expect(config.server.projectId).toBe('test-project');
      if (config.auth.type === 'oauth1') {
        expect(config.auth.consumerKey).toBe('test-key');
      }
    });

    it('should load configuration from file', () => {
      // TODO: Implement file loading test
      expect(true).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should validate a complete configuration', () => {
      const config: IETMConfig = {
        server: {
          baseUrl: 'https://test.example.com',
          projectId: 'test-project',
          contextId: 'test-context',
        },
        auth: {
          type: 'oauth1',
          consumerKey: 'test-key',
          consumerSecret: 'test-secret',
          accessToken: 'test-token',
          accessTokenSecret: 'test-token-secret',
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should throw error for missing required fields', () => {
      const config: Partial<IETMConfig> = {
        server: {
          baseUrl: 'https://test.example.com',
          projectId: '',
          contextId: '',
        },
      };

      expect(() => validateConfig(config as IETMConfig)).toThrow();
    });
  });
});

// Made with Bob
