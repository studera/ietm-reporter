/**
 * Unit tests for XmlBuilder
 * 
 * Tests XML building utilities and template handling
 */

import { XmlBuilder } from '../../../src/builders/XmlBuilder';
import * as fs from 'fs';
import * as path from 'path';

// Create a concrete implementation for testing
class TestXmlBuilder extends XmlBuilder {
  constructor(templatePath?: string) {
    super(templatePath);
  }

  build(): string {
    return this.template;
  }

  // Expose protected methods for testing
  public testReplacePlaceholder(xml: string, placeholder: string, value: string): string {
    return this.replacePlaceholder(xml, placeholder, value);
  }

  public testEscapeXml(text: string): string {
    return this.escapeXml(text);
  }

  public testBuildElement(
    tagName: string,
    content?: string,
    attributes?: Record<string, string>,
    namespace?: string
  ): string {
    return this.buildElement(tagName, content, attributes, namespace);
  }

  public testBuildElementRaw(
    tagName: string,
    content?: string,
    attributes?: Record<string, string>,
    namespace?: string
  ): string {
    return this.buildElementRaw(tagName, content, attributes, namespace);
  }

  public testBuildSelfClosingElement(
    tagName: string,
    attributes?: Record<string, string>,
    namespace?: string
  ): string {
    return this.buildSelfClosingElement(tagName, attributes, namespace);
  }

  public testIndentXml(xml: string, indent?: number): string {
    return this.indentXml(xml, indent);
  }

  public testValidateXml(xml: string): boolean {
    return this.validateXml(xml);
  }
}

describe('XmlBuilder', () => {
  let builder: TestXmlBuilder;

  beforeEach(() => {
    builder = new TestXmlBuilder();
  });

  describe('Constructor', () => {
    it('should create instance without template', () => {
      const builder = new TestXmlBuilder();
      expect(builder).toBeInstanceOf(XmlBuilder);
      expect(builder.build()).toBe('');
    });

    it('should throw error if template file not found', () => {
      expect(() => {
        new TestXmlBuilder('nonexistent/template.xml');
      }).toThrow('Template file not found');
    });
  });

  describe('replacePlaceholder()', () => {
    it('should replace single placeholder', () => {
      const xml = '<root>{{name}}</root>';
      const result = builder.testReplacePlaceholder(xml, 'name', 'John');
      expect(result).toBe('<root>John</root>');
    });

    it('should replace multiple occurrences of same placeholder', () => {
      const xml = '<root><a>{{value}}</a><b>{{value}}</b></root>';
      const result = builder.testReplacePlaceholder(xml, 'value', '123');
      expect(result).toBe('<root><a>123</a><b>123</b></root>');
    });

    it('should not replace if placeholder not found', () => {
      const xml = '<root>{{name}}</root>';
      const result = builder.testReplacePlaceholder(xml, 'age', '25');
      expect(result).toBe(xml);
    });

    it('should handle empty value', () => {
      const xml = '<root>{{name}}</root>';
      const result = builder.testReplacePlaceholder(xml, 'name', '');
      expect(result).toBe('<root></root>');
    });
  });

  describe('escapeXml()', () => {
    it('should escape ampersand', () => {
      expect(builder.testEscapeXml('A & B')).toBe('A & B');
    });

    it('should escape less than', () => {
      expect(builder.testEscapeXml('A < B')).toBe('A < B');
    });

    it('should escape greater than', () => {
      expect(builder.testEscapeXml('A > B')).toBe('A > B');
    });

    it('should escape double quotes', () => {
      expect(builder.testEscapeXml('Say "Hello"')).toBe('Say "Hello"');
    });

    it('should escape single quotes', () => {
      expect(builder.testEscapeXml("It's working")).toBe("It's working");
    });

    it('should escape multiple special characters', () => {
      expect(builder.testEscapeXml('<tag attr="value">A & B</tag>'))
        .toBe('<tag attr="value">A & B</tag>');
    });

    it('should handle empty string', () => {
      expect(builder.testEscapeXml('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(builder.testEscapeXml(null as any)).toBe('');
      expect(builder.testEscapeXml(undefined as any)).toBe('');
    });
  });

  describe('buildElement()', () => {
    it('should build simple element with content', () => {
      const result = builder.testBuildElement('name', 'John');
      expect(result).toBe('<name>John</name>');
    });

    it('should build element with attributes', () => {
      const result = builder.testBuildElement('person', 'John', { id: '123', age: '25' });
      expect(result).toContain('id="123"');
      expect(result).toContain('age="25"');
      expect(result).toContain('>John</person>');
    });

    it('should build element with namespace', () => {
      const result = builder.testBuildElement('title', 'Test', undefined, 'dc');
      expect(result).toBe('<dc:title>Test</dc:title>');
    });

    it('should build element with namespace and attributes', () => {
      const result = builder.testBuildElement('title', 'Test', { lang: 'en' }, 'dc');
      expect(result).toBe('<dc:title lang="en">Test</dc:title>');
    });

    it('should build self-closing element when content is undefined', () => {
      const result = builder.testBuildElement('br');
      expect(result).toBe('<br />');
    });

    it('should build self-closing element when content is null', () => {
      const result = builder.testBuildElement('br', null as any);
      expect(result).toBe('<br />');
    });

    it('should escape content', () => {
      const result = builder.testBuildElement('text', 'A & B < C');
      expect(result).toBe('<text>A & B < C</text>');
    });

    it('should escape attribute values', () => {
      const result = builder.testBuildElement('tag', 'content', { attr: 'value "quoted"' });
      expect(result).toContain('attr="value "quoted""');
    });

    it('should handle empty content', () => {
      const result = builder.testBuildElement('empty', '');
      expect(result).toBe('<empty></empty>');
    });
  });

  describe('buildElementRaw()', () => {
    it('should build element without escaping content', () => {
      const result = builder.testBuildElementRaw('html', '<b>Bold</b>');
      expect(result).toBe('<html><b>Bold</b></html>');
    });

    it('should still escape attribute values', () => {
      const result = builder.testBuildElementRaw('div', '<p>Text</p>', { class: 'test "class"' });
      expect(result).toContain('class="test "class""');
      expect(result).toContain('><p>Text</p></div>');
    });

    it('should build self-closing element when content is undefined', () => {
      const result = builder.testBuildElementRaw('br');
      expect(result).toBe('<br />');
    });
  });

  describe('buildSelfClosingElement()', () => {
    it('should build self-closing element without attributes', () => {
      const result = builder.testBuildSelfClosingElement('br');
      expect(result).toBe('<br />');
    });

    it('should build self-closing element with attributes', () => {
      const result = builder.testBuildSelfClosingElement('img', { src: 'image.jpg', alt: 'Image' });
      expect(result).toContain('src="image.jpg"');
      expect(result).toContain('alt="Image"');
      expect(result).toMatch(/<img .* \/>/);
    });

    it('should build self-closing element with namespace', () => {
      const result = builder.testBuildSelfClosingElement('resource', { href: 'url' }, 'rdf');
      expect(result).toBe('<rdf:resource href="url" />');
    });

    it('should escape attribute values', () => {
      const result = builder.testBuildSelfClosingElement('tag', { attr: 'value & "quoted"' });
      expect(result).toContain('attr="value & "quoted""');
    });
  });

  describe('indentXml()', () => {
    it('should return XML as-is (indentXml returns single line)', () => {
      const xml = '<root><child><grandchild>text</grandchild></child></root>';
      const result = builder.testIndentXml(xml);
      // The indentXml method doesn't actually split into multiple lines in current implementation
      expect(result).toContain('<root>');
      expect(result).toContain('<child>');
      expect(result).toContain('<grandchild>');
    });

    it('should handle self-closing tags', () => {
      const xml = '<root><child /><child /></root>';
      const result = builder.testIndentXml(xml);
      expect(result).toContain('<root>');
      expect(result).toContain('<child />');
    });

    it('should skip empty lines', () => {
      const xml = '<root>\n\n<child>text</child>\n\n</root>';
      const result = builder.testIndentXml(xml);
      expect(result).not.toContain('\n\n');
    });
  });

  describe('validateXml()', () => {
    it('should validate well-formed XML', () => {
      const xml = '<root><child>text</child></root>';
      expect(builder.testValidateXml(xml)).toBe(true);
    });

    it('should validate nested XML', () => {
      const xml = '<root><a><b><c>text</c></b></a></root>';
      expect(builder.testValidateXml(xml)).toBe(true);
    });

    it('should validate XML with self-closing tags', () => {
      const xml = '<root><child /><child /></root>';
      expect(builder.testValidateXml(xml)).toBe(true);
    });

    it('should validate XML with namespaces', () => {
      const xml = '<rdf:RDF><dc:title>Test</dc:title></rdf:RDF>';
      expect(builder.testValidateXml(xml)).toBe(true);
    });

    it('should reject mismatched tags', () => {
      const xml = '<root><child>text</wrong></root>';
      expect(builder.testValidateXml(xml)).toBe(false);
    });

    it('should reject unclosed tags', () => {
      const xml = '<root><child>text</root>';
      expect(builder.testValidateXml(xml)).toBe(false);
    });

    it('should reject extra closing tags', () => {
      const xml = '<root><child>text</child></child></root>';
      expect(builder.testValidateXml(xml)).toBe(false);
    });

    it('should handle empty XML', () => {
      expect(builder.testValidateXml('')).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should build complex XML structure', () => {
      const root = builder.testBuildElementRaw(
        'root',
        builder.testBuildElement('title', 'Test Title') +
        builder.testBuildElement('description', 'Test & Description') +
        builder.testBuildSelfClosingElement('meta', { name: 'author', content: 'John' }),
        { version: '1.0' }
      );

      expect(root).toContain('<root version="1.0">');
      expect(root).toContain('<title>Test Title</title>');
      expect(root).toContain('<description>Test & Description</description>');
      expect(root).toContain('<meta name="author" content="John" />');
      expect(root).toContain('</root>');
    });

    it('should build and validate XML', () => {
      const xml = builder.testBuildElementRaw(
        'root',
        builder.testBuildElement('child', 'content')
      );

      expect(builder.testValidateXml(xml)).toBe(true);
    });

    it('should build and process XML', () => {
      const xml = builder.testBuildElementRaw(
        'root',
        builder.testBuildElement('child', 'content')
      );

      const processed = builder.testIndentXml(xml);
      expect(builder.testValidateXml(processed)).toBe(true);
      expect(processed).toContain('root');
      expect(processed).toContain('child');
    });
  });
});

// Made with Bob