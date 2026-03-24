import {
  parseXml,
  buildXml,
  getTextContent,
  getAttribute,
  findNodesByTag,
  findFirstNodeByTag,
  getHref,
  extractHrefs,
  parseServiceProviderCatalog,
  parseRootServices,
  parseServicesXml,
  extractIdFromUrl,
  extractContextId
} from '../../src/utils/XmlParser';

describe('XmlParser', () => {
  describe('parseXml', () => {
    it('should parse simple XML', () => {
      const xml = '<root><child>value</child></root>';
      const result = parseXml(xml);
      expect(result).toHaveProperty('root');
      expect(result.root).toHaveProperty('child');
      expect(result.root.child).toBe('value');
    });

    it('should parse XML with attributes', () => {
      const xml = '<root id="123"><child name="test">value</child></root>';
      const result = parseXml(xml);
      // Note: parseAttributeValue is true, so numeric strings are parsed as numbers
      expect(result.root['@_id']).toBe(123);
      expect(result.root.child['@_name']).toBe('test');
      expect(result.root.child['#text']).toBe('value');
    });

    it('should parse XML with namespaces', () => {
      const xml = '<rdf:Description xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><dc:title>Test</dc:title></rdf:Description>';
      const result = parseXml(xml);
      expect(result['rdf:Description']).toBeDefined();
      expect(result['rdf:Description']['dc:title']).toBe('Test');
    });

    it('should handle arrays of elements', () => {
      const xml = '<root><item>1</item><item>2</item><item>3</item></root>';
      const result = parseXml(xml);
      expect(Array.isArray(result.root.item)).toBe(true);
      expect(result.root.item).toHaveLength(3);
    });
  });

  describe('buildXml', () => {
    it('should build simple XML', () => {
      const obj = { root: { child: 'value' } };
      const xml = buildXml(obj);
      expect(xml).toContain('<root>');
      expect(xml).toContain('<child>value</child>');
      expect(xml).toContain('</root>');
    });

    it('should build XML with attributes', () => {
      const obj = {
        root: {
          '@_id': '123',
          child: {
            '@_name': 'test',
            '#text': 'value'
          }
        }
      };
      const xml = buildXml(obj);
      expect(xml).toContain('id="123"');
      expect(xml).toContain('name="test"');
      expect(xml).toContain('value');
    });
  });

  describe('getTextContent', () => {
    it('should extract text from string', () => {
      expect(getTextContent('simple text')).toBe('simple text');
    });

    it('should extract text from object with #text', () => {
      const node = { '#text': 'content', '@_attr': 'value' };
      expect(getTextContent(node)).toBe('content');
    });

    it('should return empty string for non-text nodes', () => {
      expect(getTextContent({ child: 'value' })).toBe('');
      expect(getTextContent(null)).toBe('');
      expect(getTextContent(undefined)).toBe('');
    });
  });

  describe('getAttribute', () => {
    it('should extract attribute value', () => {
      const node = { '@_id': '123', '@_name': 'test' };
      expect(getAttribute(node, 'id')).toBe('123');
      expect(getAttribute(node, 'name')).toBe('test');
    });

    it('should return undefined for missing attribute', () => {
      const node = { '@_id': '123' };
      expect(getAttribute(node, 'missing')).toBeUndefined();
    });

    it('should handle null/undefined nodes', () => {
      expect(getAttribute(null, 'id')).toBeUndefined();
      expect(getAttribute(undefined, 'id')).toBeUndefined();
    });
  });

  describe('findNodesByTag', () => {
    it('should find nodes by tag name', () => {
      const obj = {
        root: {
          child: [
            { name: 'first' },
            { name: 'second' }
          ]
        }
      };
      const nodes = findNodesByTag(obj, 'child');
      expect(nodes).toHaveLength(2);
      expect(nodes[0].name).toBe('first');
      expect(nodes[1].name).toBe('second');
    });

    it('should find nested nodes', () => {
      const obj = {
        root: {
          level1: {
            level2: {
              target: 'found'
            }
          }
        }
      };
      const nodes = findNodesByTag(obj, 'target');
      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toBe('found');
    });

    it('should return empty array if not found', () => {
      const obj = { root: { child: 'value' } };
      const nodes = findNodesByTag(obj, 'missing');
      expect(nodes).toHaveLength(0);
    });
  });

  describe('findFirstNodeByTag', () => {
    it('should find first node', () => {
      const obj = {
        root: {
          child: [
            { name: 'first' },
            { name: 'second' }
          ]
        }
      };
      const node = findFirstNodeByTag(obj, 'child');
      expect(node).toBeDefined();
      expect(node.name).toBe('first');
    });

    it('should return undefined if not found', () => {
      const obj = { root: { child: 'value' } };
      const node = findFirstNodeByTag(obj, 'missing');
      expect(node).toBeUndefined();
    });
  });

  describe('getHref', () => {
    it('should extract href attribute', () => {
      const node = { '@_href': 'http://example.com' };
      expect(getHref(node)).toBe('http://example.com');
    });

    it('should extract resource attribute', () => {
      const node = { '@_resource': 'http://example.com' };
      expect(getHref(node)).toBe('http://example.com');
    });

    it('should extract rdf:resource attribute', () => {
      const node = { '@_rdf:resource': 'http://example.com' };
      expect(getHref(node)).toBe('http://example.com');
    });

    it('should prioritize href over resource', () => {
      const node = {
        '@_href': 'http://href.com',
        '@_resource': 'http://resource.com'
      };
      expect(getHref(node)).toBe('http://href.com');
    });

    it('should return undefined if no URL found', () => {
      const node = { '@_id': '123' };
      expect(getHref(node)).toBeUndefined();
    });
  });

  describe('extractHrefs', () => {
    it('should extract all hrefs from nodes', () => {
      const obj = {
        root: {
          link: [
            { '@_href': 'http://example1.com' },
            { '@_href': 'http://example2.com' },
            { '@_resource': 'http://example3.com' }
          ]
        }
      };
      const hrefs = extractHrefs(obj, 'link');
      expect(hrefs).toHaveLength(3);
      expect(hrefs).toContain('http://example1.com');
      expect(hrefs).toContain('http://example2.com');
      expect(hrefs).toContain('http://example3.com');
    });

    it('should filter out nodes without hrefs', () => {
      const obj = {
        root: {
          link: [
            { '@_href': 'http://example.com' },
            { '@_id': '123' }
          ]
        }
      };
      const hrefs = extractHrefs(obj, 'link');
      expect(hrefs).toHaveLength(1);
      expect(hrefs[0]).toBe('http://example.com');
    });
  });

  describe('parseServiceProviderCatalog', () => {
    it('should parse service provider catalog', () => {
      const xml = `<?xml version="1.0"?>
        <oslc:ServiceProviderCatalog xmlns:oslc="http://open-services.net/ns/core#" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
          <oslc:ServiceProvider rdf:about="http://example.com/project1">
            <dcterms:title>Project 1</dcterms:title>
          </oslc:ServiceProvider>
          <oslc:ServiceProvider rdf:about="http://example.com/project2">
            <dcterms:title>Project 2</dcterms:title>
          </oslc:ServiceProvider>
        </oslc:ServiceProviderCatalog>`;
      
      const providers = parseServiceProviderCatalog(xml);
      expect(providers.size).toBe(2);
      expect(providers.get('Project 1')).toBe('http://example.com/project1');
      expect(providers.get('Project 2')).toBe('http://example.com/project2');
    });

    it('should handle empty catalog', () => {
      const xml = `<?xml version="1.0"?>
        <oslc:ServiceProviderCatalog xmlns:oslc="http://open-services.net/ns/core#">
        </oslc:ServiceProviderCatalog>`;
      
      const providers = parseServiceProviderCatalog(xml);
      expect(providers.size).toBe(0);
    });
  });

  describe('parseRootServices', () => {
    it('should parse root services and extract catalog URL', () => {
      const xml = `<?xml version="1.0"?>
        <rdf:Description xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:oslc_qm="http://open-services.net/xmlns/qm/1.0/">
          <oslc_qm:qmServiceProviders rdf:resource="https://jazz.net/sandbox01-qm/oslc_qm/catalog" />
        </rdf:Description>`;
      
      const catalogUrl = parseRootServices(xml);
      expect(catalogUrl).toBe('https://jazz.net/sandbox01-qm/oslc_qm/catalog');
    });

    it('should return undefined if catalog not found', () => {
      const xml = `<?xml version="1.0"?>
        <rdf:Description xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        </rdf:Description>`;
      
      const catalogUrl = parseRootServices(xml);
      expect(catalogUrl).toBeUndefined();
    });
  });

  describe('parseServicesXml', () => {
    it('should parse services XML and extract query capabilities', () => {
      const xml = `<?xml version="1.0"?>
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:oslc="http://open-services.net/ns/core#" xmlns:dcterms="http://purl.org/dc/terms/">
          <oslc:QueryCapability>
            <dcterms:title>TestCaseQuery</dcterms:title>
            <oslc:queryBase rdf:resource="http://example.com/testcases" />
            <oslc:resourceType rdf:resource="http://open-services.net/ns/qm#TestCase" />
          </oslc:QueryCapability>
          <oslc:QueryCapability>
            <dcterms:title>TestResultQuery</dcterms:title>
            <oslc:queryBase rdf:resource="http://example.com/results" />
            <oslc:resourceType rdf:resource="http://open-services.net/ns/qm#TestResult" />
          </oslc:QueryCapability>
        </rdf:RDF>`;
      
      const queryUrls = parseServicesXml(xml);
      expect(queryUrls.size).toBe(2);
      // Keys are extracted from resourceType URL (after # or last /)
      expect(queryUrls.get('TestCase')).toBe('http://example.com/testcases');
      expect(queryUrls.get('TestResult')).toBe('http://example.com/results');
    });

    it('should handle empty services XML', () => {
      const xml = `<?xml version="1.0"?>
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        </rdf:RDF>`;
      
      const queryUrls = parseServicesXml(xml);
      expect(queryUrls.size).toBe(0);
    });
  });

  describe('extractIdFromUrl', () => {
    it('should extract ID from URN in URL', () => {
      const url = 'https://jazz.net/sandbox01-qm/resource/urn:com.ibm.rqm:testcase:123';
      expect(extractIdFromUrl(url)).toBe('123');
    });

    it('should extract numeric ID from URN', () => {
      const url = 'https://jazz.net/sandbox01-qm/testcase/urn:com.ibm.rqm:testcase:12345';
      expect(extractIdFromUrl(url)).toBe('12345');
    });

    it('should return undefined for URL without URN', () => {
      expect(extractIdFromUrl('https://jazz.net/sandbox01-qm/testcase/123')).toBeUndefined();
      expect(extractIdFromUrl('not-a-url')).toBeUndefined();
      expect(extractIdFromUrl('')).toBeUndefined();
    });
  });

  describe('extractContextId', () => {
    it('should extract context ID from services URL with /contexts/', () => {
      const url = 'https://jazz.net/sandbox01-qm/oslc_qm/contexts/_8_TkcFwFEfCGYIoRgUkqqw/services.xml';
      expect(extractContextId(url)).toBe('_8_TkcFwFEfCGYIoRgUkqqw');
    });

    it('should extract context ID from another contexts URL', () => {
      const url = 'https://jazz.net/sandbox01-qm/contexts/_testContextId/resources';
      expect(extractContextId(url)).toBe('_testContextId');
    });

    it('should return undefined for URL without /contexts/ pattern', () => {
      // This URL has /resources/ but not /contexts/
      const url = 'https://jazz.net/sandbox01-qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/_8_TkcFwFEfCGYIoRgUkqqw/testcase/123';
      expect(extractContextId(url)).toBeUndefined();
      
      expect(extractContextId('https://jazz.net/sandbox01-qm/rootservices')).toBeUndefined();
      expect(extractContextId('')).toBeUndefined();
    });
  });
});

// Made with Bob
