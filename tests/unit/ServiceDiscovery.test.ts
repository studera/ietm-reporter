import { ServiceDiscovery } from '../../src/client/ServiceDiscovery';
import { AuthManager } from '../../src/auth/AuthManager';
import { AuthConfig } from '../../src/auth/types';

// Mock AuthManager
jest.mock('../../src/auth/AuthManager');

describe('ServiceDiscovery', () => {
  let authManager: jest.Mocked<AuthManager>;
  let serviceDiscovery: ServiceDiscovery;
  
  const mockConfig: AuthConfig = {
    qmServerUrl: 'https://jazz.net/sandbox01-qm',
    jtsServerUrl: 'https://jazz.net/sandbox01-jts',
    username: 'testuser',
    password: 'testpass',
    projectName: 'Test Project'
  };

  beforeEach(() => {
    // Create mock AuthManager
    authManager = new AuthManager(mockConfig) as jest.Mocked<AuthManager>;
    
    // Mock the get method
    authManager.get = jest.fn();
    
    // Create ServiceDiscovery instance
    serviceDiscovery = new ServiceDiscovery(authManager, mockConfig.projectName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with AuthManager and project name', () => {
      expect(serviceDiscovery).toBeInstanceOf(ServiceDiscovery);
    });
  });

  describe('discoverServices', () => {
    const mockRootServicesXml = `<?xml version="1.0"?>
      <rdf:Description xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:oslc_qm="http://open-services.net/xmlns/qm/1.0/">
        <oslc_qm:qmServiceProviders rdf:resource="https://jazz.net/sandbox01-qm/oslc_qm/catalog" />
      </rdf:Description>`;

    const mockCatalogXml = `<?xml version="1.0"?>
      <oslc:ServiceProviderCatalog xmlns:oslc="http://open-services.net/ns/core#" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        <oslc:ServiceProvider rdf:about="https://jazz.net/sandbox01-qm/oslc_qm/contexts/_testContextId/services.xml">
          <dcterms:title>Test Project</dcterms:title>
        </oslc:ServiceProvider>
      </oslc:ServiceProviderCatalog>`;

    const mockServicesXml = `<?xml version="1.0"?>
      <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:oslc="http://open-services.net/ns/core#" xmlns:dcterms="http://purl.org/dc/terms/">
        <oslc:QueryCapability>
          <dcterms:title>TestCaseQuery</dcterms:title>
          <oslc:queryBase rdf:resource="https://jazz.net/sandbox01-qm/oslc_qm/contexts/_testContextId/resources/com.ibm.rqm.planning.VersionedTestCase" />
          <oslc:resourceType rdf:resource="http://open-services.net/ns/qm#TestCase" />
        </oslc:QueryCapability>
        <oslc:QueryCapability>
          <dcterms:title>TestResultQuery</dcterms:title>
          <oslc:queryBase rdf:resource="https://jazz.net/sandbox01-qm/oslc_qm/contexts/_testContextId/resources/com.ibm.rqm.execution.ExecutionResult" />
          <oslc:resourceType rdf:resource="http://open-services.net/ns/qm#TestResult" />
        </oslc:QueryCapability>
      </rdf:RDF>`;

    it('should discover services successfully', async () => {
      // Mock the HTTP responses
      authManager.get
        .mockResolvedValueOnce({ data: mockRootServicesXml }) // rootservices
        .mockResolvedValueOnce({ data: mockCatalogXml })      // catalog
        .mockResolvedValueOnce({ data: mockServicesXml });    // services

      await serviceDiscovery.discoverServices();

      // Verify HTTP calls
      expect(authManager.get).toHaveBeenCalledTimes(3);
      expect(authManager.get).toHaveBeenNthCalledWith(1, 'https://jazz.net/sandbox01-qm/rootservices');
      expect(authManager.get).toHaveBeenNthCalledWith(2, 'https://jazz.net/sandbox01-qm/oslc_qm/catalog');
      expect(authManager.get).toHaveBeenNthCalledWith(3, 'https://jazz.net/sandbox01-qm/oslc_qm/contexts/_testContextId/services.xml');
    });

    it('should cache discovered services', async () => {
      authManager.get
        .mockResolvedValueOnce({ data: mockRootServicesXml })
        .mockResolvedValueOnce({ data: mockCatalogXml })
        .mockResolvedValueOnce({ data: mockServicesXml });

      // First call
      await serviceDiscovery.discoverServices();
      expect(authManager.get).toHaveBeenCalledTimes(3);

      // Second call should use cache
      await serviceDiscovery.discoverServices();
      expect(authManager.get).toHaveBeenCalledTimes(3); // No additional calls
    });

    it('should throw error if catalog URL not found', async () => {
      const invalidXml = `<?xml version="1.0"?>
        <rdf:Description xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        </rdf:Description>`;

      authManager.get.mockResolvedValueOnce({ data: invalidXml });

      await expect(serviceDiscovery.discoverServices()).rejects.toThrow('Service provider catalog URL not found');
    });

    it('should throw error if project not found in catalog', async () => {
      const catalogWithoutProject = `<?xml version="1.0"?>
        <oslc:ServiceProviderCatalog xmlns:oslc="http://open-services.net/ns/core#" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
          <oslc:ServiceProvider rdf:about="https://jazz.net/sandbox01-qm/oslc_qm/contexts/_other/services.xml">
            <dcterms:title>Other Project</dcterms:title>
          </oslc:ServiceProvider>
        </oslc:ServiceProviderCatalog>`;

      authManager.get
        .mockResolvedValueOnce({ data: mockRootServicesXml })
        .mockResolvedValueOnce({ data: catalogWithoutProject });

      await expect(serviceDiscovery.discoverServices()).rejects.toThrow('Project "Test Project" not found');
    });

    it('should throw error if context ID cannot be extracted', async () => {
      const catalogWithInvalidUrl = `<?xml version="1.0"?>
        <oslc:ServiceProviderCatalog xmlns:oslc="http://open-services.net/ns/core#" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
          <oslc:ServiceProvider rdf:about="https://jazz.net/invalid-url">
            <dcterms:title>Test Project</dcterms:title>
          </oslc:ServiceProvider>
        </oslc:ServiceProviderCatalog>`;

      authManager.get
        .mockResolvedValueOnce({ data: mockRootServicesXml })
        .mockResolvedValueOnce({ data: catalogWithInvalidUrl });

      await expect(serviceDiscovery.discoverServices()).rejects.toThrow('Could not extract context ID');
    });
  });

  describe('getQueryCapabilityUrl', () => {
    const mockServicesXml = `<?xml version="1.0"?>
      <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:oslc="http://open-services.net/ns/core#" xmlns:dcterms="http://purl.org/dc/terms/">
        <oslc:QueryCapability>
          <dcterms:title>TestCaseQuery</dcterms:title>
          <oslc:queryBase rdf:resource="https://jazz.net/sandbox01-qm/testcases" />
        </oslc:QueryCapability>
      </rdf:RDF>`;

    beforeEach(async () => {
      const mockRootServicesXml = `<?xml version="1.0"?>
        <rdf:Description xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:oslc_qm="http://open-services.net/xmlns/qm/1.0/">
          <oslc_qm:qmServiceProviders rdf:resource="https://jazz.net/sandbox01-qm/oslc_qm/catalog" />
        </rdf:Description>`;

      const mockCatalogXml = `<?xml version="1.0"?>
        <oslc:ServiceProviderCatalog xmlns:oslc="http://open-services.net/ns/core#" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
          <oslc:ServiceProvider rdf:about="https://jazz.net/sandbox01-qm/oslc_qm/contexts/_testContextId/services.xml">
            <dcterms:title>Test Project</dcterms:title>
          </oslc:ServiceProvider>
        </oslc:ServiceProviderCatalog>`;

      authManager.get
        .mockResolvedValueOnce({ data: mockRootServicesXml })
        .mockResolvedValueOnce({ data: mockCatalogXml })
        .mockResolvedValueOnce({ data: mockServicesXml });

      await serviceDiscovery.discoverServices();
    });

    it('should return query capability URL', () => {
      const url = serviceDiscovery.getQueryCapabilityUrl('TestCaseQuery');
      expect(url).toBe('https://jazz.net/sandbox01-qm/testcases');
    });

    it('should return undefined for non-existent capability', () => {
      const url = serviceDiscovery.getQueryCapabilityUrl('NonExistentQuery');
      expect(url).toBeUndefined();
    });

    it('should throw error if services not discovered', () => {
      const newDiscovery = new ServiceDiscovery(authManager, 'Test Project');
      expect(() => newDiscovery.getQueryCapabilityUrl('TestCaseQuery')).toThrow('Services not discovered');
    });
  });

  describe('getContextId', () => {
    it('should return context ID after discovery', async () => {
      const mockRootServicesXml = `<?xml version="1.0"?>
        <rdf:Description xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:oslc_qm="http://open-services.net/xmlns/qm/1.0/">
          <oslc_qm:qmServiceProviders rdf:resource="https://jazz.net/sandbox01-qm/oslc_qm/catalog" />
        </rdf:Description>`;

      const mockCatalogXml = `<?xml version="1.0"?>
        <oslc:ServiceProviderCatalog xmlns:oslc="http://open-services.net/ns/core#" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
          <oslc:ServiceProvider rdf:about="https://jazz.net/sandbox01-qm/oslc_qm/contexts/_testContextId/services.xml">
            <dcterms:title>Test Project</dcterms:title>
          </oslc:ServiceProvider>
        </oslc:ServiceProviderCatalog>`;

      const mockServicesXml = `<?xml version="1.0"?>
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        </rdf:RDF>`;

      authManager.get
        .mockResolvedValueOnce({ data: mockRootServicesXml })
        .mockResolvedValueOnce({ data: mockCatalogXml })
        .mockResolvedValueOnce({ data: mockServicesXml });

      await serviceDiscovery.discoverServices();
      
      const contextId = serviceDiscovery.getContextId();
      expect(contextId).toBe('_testContextId');
    });

    it('should throw error if services not discovered', () => {
      expect(() => serviceDiscovery.getContextId()).toThrow('Services not discovered');
    });
  });

  describe('buildTestCaseUrl', () => {
    beforeEach(async () => {
      const mockRootServicesXml = `<?xml version="1.0"?>
        <rdf:Description xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:oslc_qm="http://open-services.net/xmlns/qm/1.0/">
          <oslc_qm:qmServiceProviders rdf:resource="https://jazz.net/sandbox01-qm/oslc_qm/catalog" />
        </rdf:Description>`;

      const mockCatalogXml = `<?xml version="1.0"?>
        <oslc:ServiceProviderCatalog xmlns:oslc="http://open-services.net/ns/core#" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
          <oslc:ServiceProvider rdf:about="https://jazz.net/sandbox01-qm/oslc_qm/contexts/_testContextId/services.xml">
            <dcterms:title>Test Project</dcterms:title>
          </oslc:ServiceProvider>
        </oslc:ServiceProviderCatalog>`;

      const mockServicesXml = `<?xml version="1.0"?>
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        </rdf:RDF>`;

      authManager.get
        .mockResolvedValueOnce({ data: mockRootServicesXml })
        .mockResolvedValueOnce({ data: mockCatalogXml })
        .mockResolvedValueOnce({ data: mockServicesXml });

      await serviceDiscovery.discoverServices();
    });

    it('should build test case URL with numeric ID', () => {
      const url = serviceDiscovery.buildTestCaseUrl('123');
      expect(url).toBe('https://jazz.net/sandbox01-qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/_testContextId/testcase/urn:com.ibm.rqm:testcase:123');
    });

    it('should build test case URL with URN', () => {
      const url = serviceDiscovery.buildTestCaseUrl('urn:com.ibm.rqm:testcase:456');
      expect(url).toBe('https://jazz.net/sandbox01-qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/_testContextId/testcase/urn:com.ibm.rqm:testcase:456');
    });

    it('should throw error if services not discovered', () => {
      const newDiscovery = new ServiceDiscovery(authManager, 'Test Project');
      expect(() => newDiscovery.buildTestCaseUrl('123')).toThrow('Services not discovered');
    });
  });

  describe('buildExecutionWorkItemUrl', () => {
    beforeEach(async () => {
      const mockRootServicesXml = `<?xml version="1.0"?>
        <rdf:Description xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:oslc_qm="http://open-services.net/xmlns/qm/1.0/">
          <oslc_qm:qmServiceProviders rdf:resource="https://jazz.net/sandbox01-qm/oslc_qm/catalog" />
        </rdf:Description>`;

      const mockCatalogXml = `<?xml version="1.0"?>
        <oslc:ServiceProviderCatalog xmlns:oslc="http://open-services.net/ns/core#" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
          <oslc:ServiceProvider rdf:about="https://jazz.net/sandbox01-qm/oslc_qm/contexts/_testContextId/services.xml">
            <dcterms:title>Test Project</dcterms:title>
          </oslc:ServiceProvider>
        </oslc:ServiceProviderCatalog>`;

      const mockServicesXml = `<?xml version="1.0"?>
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        </rdf:RDF>`;

      authManager.get
        .mockResolvedValueOnce({ data: mockRootServicesXml })
        .mockResolvedValueOnce({ data: mockCatalogXml })
        .mockResolvedValueOnce({ data: mockServicesXml });

      await serviceDiscovery.discoverServices();
    });

    it('should build execution work item URL', () => {
      const url = serviceDiscovery.buildExecutionWorkItemUrl('789');
      expect(url).toBe('https://jazz.net/sandbox01-qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/_testContextId/executionworkitem/urn:com.ibm.rqm:executionworkitem:789');
    });

    it('should throw error if services not discovered', () => {
      const newDiscovery = new ServiceDiscovery(authManager, 'Test Project');
      expect(() => newDiscovery.buildExecutionWorkItemUrl('789')).toThrow('Services not discovered');
    });
  });
});

// Made with Bob
