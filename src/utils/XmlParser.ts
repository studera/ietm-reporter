/**
 * XML Parser Utility
 * 
 * Provides utilities for parsing XML responses from IETM API using fast-xml-parser.
 */

import { XMLParser, XMLBuilder } from 'fast-xml-parser';

/**
 * XML Parser options for IETM responses
 */
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
  cdataPropName: '__cdata',
  ignoreDeclaration: true,
  ignorePiTags: true,
  removeNSPrefix: false, // Keep namespace prefixes for OSLC
};

/**
 * XML Builder options for creating IETM requests
 */
const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
};

/**
 * Singleton XML parser instance
 */
const parser = new XMLParser(parserOptions);

/**
 * Singleton XML builder instance
 */
const builder = new XMLBuilder(builderOptions);

/**
 * Parse XML string to JavaScript object
 * 
 * @param xmlString XML string to parse
 * @returns Parsed JavaScript object
 */
export function parseXml(xmlString: string): any {
  try {
    return parser.parse(xmlString);
  } catch (error) {
    throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build XML string from JavaScript object
 * 
 * @param obj JavaScript object to convert to XML
 * @returns XML string
 */
export function buildXml(obj: any): string {
  try {
    return builder.build(obj);
  } catch (error) {
    throw new Error(`Failed to build XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text content from XML node
 * 
 * @param node XML node
 * @returns Text content or empty string
 */
export function getTextContent(node: any): string {
  if (typeof node === 'string') {
    return node;
  }
  if (node && typeof node === 'object' && '#text' in node) {
    return String(node['#text']);
  }
  return '';
}

/**
 * Extract attribute value from XML node
 * 
 * @param node XML node
 * @param attributeName Attribute name (without @_ prefix)
 * @returns Attribute value or undefined
 */
export function getAttribute(node: any, attributeName: string): string | undefined {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  const attrKey = `@_${attributeName}`;
  return node[attrKey];
}

/**
 * Find nodes by tag name in parsed XML
 * 
 * @param obj Parsed XML object
 * @param tagName Tag name to search for
 * @returns Array of matching nodes
 */
export function findNodesByTag(obj: any, tagName: string): any[] {
  const results: any[] = [];
  
  function traverse(node: any) {
    if (!node || typeof node !== 'object') {
      return;
    }
    
    // Check if current node matches
    if (tagName in node) {
      const value = node[tagName];
      if (Array.isArray(value)) {
        results.push(...value);
      } else {
        results.push(value);
      }
    }
    
    // Traverse children
    for (const key in node) {
      if (key !== '@_' && key !== '#text') {
        traverse(node[key]);
      }
    }
  }
  
  traverse(obj);
  return results;
}

/**
 * Find first node by tag name in parsed XML
 * 
 * @param obj Parsed XML object
 * @param tagName Tag name to search for
 * @returns First matching node or undefined
 */
export function findFirstNodeByTag(obj: any, tagName: string): any | undefined {
  const nodes = findNodesByTag(obj, tagName);
  return nodes.length > 0 ? nodes[0] : undefined;
}

/**
 * Extract URL from href attribute
 *
 * @param node XML node with href attribute
 * @returns URL string or undefined
 */
export function getHref(node: any): string | undefined {
  return getAttribute(node, 'href') ||
         getAttribute(node, 'resource') ||
         getAttribute(node, 'rdf:resource');
}

/**
 * Extract all hrefs from nodes with specific tag
 * 
 * @param obj Parsed XML object
 * @param tagName Tag name to search for
 * @returns Array of URLs
 */
export function extractHrefs(obj: any, tagName: string): string[] {
  const nodes = findNodesByTag(obj, tagName);
  return nodes
    .map(node => getHref(node))
    .filter((href): href is string => href !== undefined);
}

/**
 * Parse OSLC service provider catalog
 * 
 * @param xmlString XML string of service provider catalog
 * @returns Map of service provider titles to URLs
 */
export function parseServiceProviderCatalog(xmlString: string): Map<string, string> {
  const parsed = parseXml(xmlString);
  const providers = new Map<string, string>();
  
  const serviceProviders = findNodesByTag(parsed, 'oslc:ServiceProvider');
  
  for (const provider of serviceProviders) {
    const title = getTextContent(findFirstNodeByTag(provider, 'dcterms:title') || '');
    const about = getAttribute(provider, 'rdf:about');
    
    if (title && about) {
      providers.set(title, about);
    }
  }
  
  return providers;
}

/**
 * Parse root services to extract service provider catalog URL
 * 
 * @param xmlString XML string of root services
 * @returns Service provider catalog URL or undefined
 */
export function parseRootServices(xmlString: string): string | undefined {
  const parsed = parseXml(xmlString);
  
  // Look for oslc_qm:qmServiceProviders or similar
  const catalogNode = findFirstNodeByTag(parsed, 'oslc_qm:qmServiceProviders') ||
                      findFirstNodeByTag(parsed, 'qm:qmServiceProviders');
  
  if (catalogNode) {
    return getHref(catalogNode);
  }
  
  return undefined;
}

/**
 * Parse services XML to extract query capability URLs
 * 
 * @param xmlString XML string of services
 * @returns Map of resource types to query URLs
 */
export function parseServicesXml(xmlString: string): Map<string, string> {
  const parsed = parseXml(xmlString);
  const queryUrls = new Map<string, string>();
  
  const queryCapabilities = findNodesByTag(parsed, 'oslc:QueryCapability');
  
  for (const capability of queryCapabilities) {
    const queryBase = findFirstNodeByTag(capability, 'oslc:queryBase');
    const resourceType = findFirstNodeByTag(capability, 'oslc:resourceType');
    
    if (queryBase && resourceType) {
      const url = getHref(queryBase);
      const type = getHref(resourceType);
      
      if (url && type) {
        // Extract the resource type name from the full URL
        const typeName = type.split('#').pop() || type.split('/').pop() || type;
        queryUrls.set(typeName, url);
      }
    }
  }
  
  return queryUrls;
}

/**
 * Extract ID from IETM resource URL
 * 
 * @param url Resource URL
 * @returns Resource ID or undefined
 */
export function extractIdFromUrl(url: string): string | undefined {
  // Pattern: .../resource/urn:com.ibm.rqm:resourcetype:ID
  const match = url.match(/urn:com\.ibm\.rqm:\w+:(\d+)/);
  return match ? match[1] : undefined;
}

/**
 * Extract context ID from URL
 * 
 * @param url URL containing context ID
 * @returns Context ID or undefined
 */
export function extractContextId(url: string): string | undefined {
  // Pattern: .../contexts/CONTEXT_ID/...
  const match = url.match(/contexts\/([^/]+)/);
  return match ? match[1] : undefined;
}

// Made with Bob
