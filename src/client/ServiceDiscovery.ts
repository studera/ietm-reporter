/**
 * Service Discovery for IETM
 * 
 * Implements OSLC service discovery pattern to find resource URLs.
 * Follows the pattern from IBM's Java RQM client.
 */

import { AuthManager } from '../auth/AuthManager';
import {
  parseXml,
  parseRootServices,
  parseServiceProviderCatalog,
  parseServicesXml,
  extractContextId,
} from '../utils/XmlParser';

/**
 * Configuration for service discovery
 */
export interface ServiceDiscoveryConfig {
  /**
   * Base URL of IETM QM server
   */
  baseUrl: string;

  /**
   * Project name to discover
   */
  projectName: string;

  /**
   * Optional: Pre-configured context ID
   */
  contextId?: string;
}

/**
 * Discovered service URLs
 */
export interface DiscoveredServices {
  /**
   * Root services URL
   */
  rootServicesUrl: string;

  /**
   * Service provider catalog URL
   */
  catalogUrl: string;

  /**
   * Services URL for the project
   */
  servicesUrl: string;

  /**
   * Context ID for the project
   */
  contextId: string;

  /**
   * Query capability URLs by resource type
   */
  queryUrls: Map<string, string>;

  /**
   * Base path for resources
   */
  basePath: string;
}

/**
 * Service Discovery Manager
 * 
 * Discovers IETM service URLs following OSLC pattern:
 * 1. GET /qm/rootservices → Extract catalog URL
 * 2. GET catalog URL → Find project service provider
 * 3. GET services URL → Extract query capabilities
 */
export class ServiceDiscovery {
  private config: ServiceDiscoveryConfig;
  private authManager: AuthManager;
  private discoveredServices?: DiscoveredServices;

  constructor(config: ServiceDiscoveryConfig, authManager: AuthManager) {
    this.config = config;
    this.authManager = authManager;
  }

  /**
   * Discover all service URLs
   * Results are cached for the lifetime of this instance
   * 
   * @returns Discovered services
   */
  async discover(): Promise<DiscoveredServices> {
    // Return cached results if available
    if (this.discoveredServices) {
      return this.discoveredServices;
    }

    console.log('Starting service discovery...');

    // Step 1: Get root services
    const rootServicesUrl = `${this.config.baseUrl}/rootservices`;
    console.log(`1. Fetching root services from ${rootServicesUrl}`);
    
    const rootServicesXml = await this.authManager.executeRequest<string>({
      method: 'GET',
      url: rootServicesUrl,
      headers: {
        'Accept': 'application/xml',
      },
    });

    // Step 2: Extract catalog URL from root services
    const catalogUrl = parseRootServices(rootServicesXml);
    if (!catalogUrl) {
      throw new Error('Failed to extract service provider catalog URL from root services');
    }
    console.log(`2. Found catalog URL: ${catalogUrl}`);

    // Step 3: Get service provider catalog
    console.log(`3. Fetching service provider catalog...`);
    const catalogXml = await this.authManager.executeRequest<string>({
      method: 'GET',
      url: catalogUrl,
      headers: {
        'Accept': 'application/xml',
      },
    });

    // Step 4: Find project service provider
    const providers = parseServiceProviderCatalog(catalogXml);
    console.log(`4. Found ${providers.size} service providers`);
    
    const servicesUrl = providers.get(this.config.projectName);
    if (!servicesUrl) {
      const availableProjects = Array.from(providers.keys()).join(', ');
      throw new Error(
        `Project "${this.config.projectName}" not found. Available projects: ${availableProjects}`
      );
    }
    console.log(`5. Found services URL for project: ${servicesUrl}`);

    // Step 5: Extract context ID
    const contextId = this.config.contextId || extractContextId(servicesUrl);
    if (!contextId) {
      throw new Error('Failed to extract context ID from services URL');
    }
    console.log(`6. Context ID: ${contextId}`);

    // Step 6: Get services XML
    console.log(`7. Fetching services XML...`);
    const servicesXml = await this.authManager.executeRequest<string>({
      method: 'GET',
      url: servicesUrl,
      headers: {
        'Accept': 'application/xml',
      },
    });

    // Step 7: Parse query capabilities
    const queryUrls = parseServicesXml(servicesXml);
    console.log(`8. Found ${queryUrls.size} query capabilities:`);
    queryUrls.forEach((url, type) => {
      console.log(`   - ${type}: ${url}`);
    });

    // Step 8: Build base path
    const basePath = `${this.config.baseUrl}/service/com.ibm.rqm.integration.service.IIntegrationService/resources/${contextId}`;
    console.log(`9. Base path: ${basePath}`);

    // Cache the results
    this.discoveredServices = {
      rootServicesUrl,
      catalogUrl,
      servicesUrl,
      contextId,
      queryUrls,
      basePath,
    };

    console.log('Service discovery completed successfully!');
    return this.discoveredServices;
  }

  /**
   * Get discovered services (must call discover() first)
   * 
   * @returns Discovered services or undefined if not yet discovered
   */
  getDiscoveredServices(): DiscoveredServices | undefined {
    return this.discoveredServices;
  }

  /**
   * Get query URL for a specific resource type
   * 
   * @param resourceType Resource type (e.g., 'TestCase', 'TestExecutionRecord')
   * @returns Query URL or undefined if not found
   */
  getQueryUrl(resourceType: string): string | undefined {
    if (!this.discoveredServices) {
      throw new Error('Services not yet discovered. Call discover() first.');
    }
    return this.discoveredServices.queryUrls.get(resourceType);
  }

  /**
   * Get base path for resources
   * 
   * @returns Base path
   */
  getBasePath(): string {
    if (!this.discoveredServices) {
      throw new Error('Services not yet discovered. Call discover() first.');
    }
    return this.discoveredServices.basePath;
  }

  /**
   * Get context ID
   * 
   * @returns Context ID
   */
  getContextId(): string {
    if (!this.discoveredServices) {
      throw new Error('Services not yet discovered. Call discover() first.');
    }
    return this.discoveredServices.contextId;
  }

  /**
   * Build resource URL
   * 
   * @param resourceType Resource type (e.g., 'testcase', 'executionworkitem')
   * @param resourceId Resource ID
   * @returns Full resource URL
   */
  buildResourceUrl(resourceType: string, resourceId: string): string {
    const basePath = this.getBasePath();
    return `${basePath}/${resourceType}/urn:com.ibm.rqm:${resourceType}:${resourceId}`;
  }

  /**
   * Clear cached discovery results
   */
  clearCache(): void {
    this.discoveredServices = undefined;
    console.log('Service discovery cache cleared');
  }
}

// Made with Bob
