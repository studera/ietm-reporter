/**
 * XML Builder Base Class
 * Provides utilities for building XML documents
 */

import * as fs from 'fs';
import * as path from 'path';

export abstract class XmlBuilder {
  protected template: string;

  constructor(templatePath?: string) {
    if (templatePath) {
      this.template = this.loadTemplate(templatePath);
    } else {
      this.template = '';
    }
  }

  /**
   * Load XML template from file
   */
  protected loadTemplate(templatePath: string): string {
    // Try multiple paths to handle both development and production scenarios
    const possiblePaths = [
      // Development: from src/builders to src/resources
      path.resolve(__dirname, '..', templatePath),
      // Production: from dist/src/builders to src/resources (source)
      path.resolve(__dirname, '..', '..', '..', 'src', templatePath.replace('resources/', '')),
      // Production: from dist/src/builders to dist/src/resources
      path.resolve(__dirname, '..', templatePath),
      // Absolute path from project root
      path.resolve(process.cwd(), 'src', templatePath),
    ];

    for (const fullPath of possiblePaths) {
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf-8');
      }
    }

    throw new Error(
      `Template file not found. Tried paths:\n${possiblePaths.join('\n')}\n` +
      `Current directory: ${process.cwd()}\n` +
      `__dirname: ${__dirname}`
    );
  }

  /**
   * Replace placeholder in template
   */
  protected replacePlaceholder(xml: string, placeholder: string, value: string): string {
    const regex = new RegExp(`{{${placeholder}}}`, 'g');
    return xml.replace(regex, value);
  }

  /**
   * Escape XML special characters
   */
  protected escapeXml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Build XML element with attributes
   */
  protected buildElement(
    tagName: string,
    content?: string,
    attributes?: Record<string, string>,
    namespace?: string
  ): string {
    const ns = namespace ? `${namespace}:` : '';
    const attrs = attributes
      ? Object.entries(attributes)
          .map(([key, value]) => `${key}="${this.escapeXml(value)}"`)
          .join(' ')
      : '';

    if (content !== undefined && content !== null) {
      const escapedContent = this.escapeXml(content);
      return `<${ns}${tagName}${attrs ? ' ' + attrs : ''}>${escapedContent}</${ns}${tagName}>`;
    } else {
      return `<${ns}${tagName}${attrs ? ' ' + attrs : ''} />`;
    }
  }

  /**
   * Build XML element with raw content (no escaping)
   */
  protected buildElementRaw(
    tagName: string,
    content?: string,
    attributes?: Record<string, string>,
    namespace?: string
  ): string {
    const ns = namespace ? `${namespace}:` : '';
    const attrs = attributes
      ? Object.entries(attributes)
          .map(([key, value]) => `${key}="${this.escapeXml(value)}"`)
          .join(' ')
      : '';

    if (content !== undefined && content !== null) {
      return `<${ns}${tagName}${attrs ? ' ' + attrs : ''}>${content}</${ns}${tagName}>`;
    } else {
      return `<${ns}${tagName}${attrs ? ' ' + attrs : ''} />`;
    }
  }

  /**
   * Build self-closing element with attributes
   */
  protected buildSelfClosingElement(
    tagName: string,
    attributes?: Record<string, string>,
    namespace?: string
  ): string {
    const ns = namespace ? `${namespace}:` : '';
    const attrs = attributes
      ? Object.entries(attributes)
          .map(([key, value]) => `${key}="${this.escapeXml(value)}"`)
          .join(' ')
      : '';

    return `<${ns}${tagName}${attrs ? ' ' + attrs : ''} />`;
  }

  /**
   * Indent XML for readability
   */
  protected indentXml(xml: string, indent: number = 4): string {
    const lines = xml.split('\n');
    let level = 0;
    const indented: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Decrease indent for closing tags
      if (trimmed.startsWith('</')) {
        level = Math.max(0, level - 1);
      }

      // Add indented line
      indented.push(' '.repeat(level * indent) + trimmed);

      // Increase indent for opening tags (but not self-closing)
      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
        level++;
      }
    }

    return indented.join('\n');
  }

  /**
   * Validate XML structure (basic check)
   */
  protected validateXml(xml: string): boolean {
    const openTags: string[] = [];
    const tagRegex = /<\/?([a-zA-Z0-9:]+)[^>]*>/g;
    let match;

    while ((match = tagRegex.exec(xml)) !== null) {
      const tag = match[1];
      const fullMatch = match[0];

      // Skip self-closing tags
      if (fullMatch.endsWith('/>')) {
        continue;
      }

      // Closing tag
      if (fullMatch.startsWith('</')) {
        const lastOpen = openTags.pop();
        if (lastOpen !== tag) {
          return false;
        }
      } else {
        // Opening tag
        if (tag) {
          openTags.push(tag);
        }
      }
    }

    return openTags.length === 0;
  }

  /**
   * Abstract method to build XML
   */
  abstract build(): string;
}

// Made with Bob