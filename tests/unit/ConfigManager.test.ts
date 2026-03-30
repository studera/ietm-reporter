/**
 * Unit tests for ConfigManager
 */

import { loadConfig, validateConfig } from '../../src/config/ConfigManager';
import { IETMConfig } from '../../src/types';

describe('ConfigManager', () => {
  afterEach(() => {
    delete process.env.IETM_BASE_URL;
    delete process.env.IETM_PROJECT_ID;
    delete process.env.IETM_PROJECT_NAME;
    delete process.env.IETM_CONTEXT_ID;
    delete process.env.IETM_USERNAME;
    delete process.env.IETM_PASSWORD;
  });

  describe('loadConfig', () => {
    it('should load configuration from environment variables', () => {
      process.env.IETM_BASE_URL = 'https://test.example.com';
      process.env.IETM_PROJECT_NAME = 'test-project';
      process.env.IETM_CONTEXT_ID = 'test-context';
      process.env.IETM_USERNAME = 'test-user';
      process.env.IETM_PASSWORD = 'test-password';

      const config = loadConfig();

      expect(config.server.baseUrl).toBe('https://test.example.com');
      expect(config.server.projectName).toBe('test-project');
      expect(config.auth.type).toBe('basic');
      expect(config.auth.username).toBe('test-user');
      expect(config.auth.password).toBe('test-password');
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
          projectName: 'test-project',
        },
        auth: {
          type: 'basic',
          username: 'test-user',
          password: 'test-password',
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should throw error for missing required fields', () => {
      const config: Partial<IETMConfig> = {
        server: {
          baseUrl: 'https://test.example.com',
          projectName: '',
        },
        auth: {
          type: 'basic',
          username: '',
          password: '',
        },
      };

      expect(() => validateConfig(config as IETMConfig)).toThrow();
    });
  });
});

// Made with Bob
