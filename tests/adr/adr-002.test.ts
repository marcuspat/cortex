/**
 * ADR-002: Domain-Driven Design structure - Tests
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

describe('ADR-002: DDD structure', () => {
  const v3Path = join(process.cwd(), 'v3');

  it('should have v3 directory', () => {
    expect(existsSync(v3Path)).toBe(true);
  });

  it('should have domain directories', () => {
    const domainsPath = join(v3Path, 'domains');
    expect(existsSync(domainsPath)).toBe(true);

    const domains = readdirSync(domainsPath);
    expect(domains.length).toBeGreaterThan(0);
  });

  it('should have bounded contexts', () => {
    const domainsPath = join(v3Path, 'domains');
    const domains = readdirSync(domainsPath);

    domains.forEach(domain => {
      const domainPath = join(domainsPath, domain);
      const domainDir = readdirSync(domainPath);

      expect(domainDir).toContain('domain');
      expect(domainDir).toContain('application');
      expect(domainDir).toContain('infrastructure');
    });
  });

  it('should have domain entities', () => {
    const authDomainPath = join(v3Path, 'domains/auth/domain/entities');
    expect(existsSync(authDomainPath)).toBe(true);
  });

  it('should have anti-corruption layers', () => {
    const authPortsPath = join(v3Path, 'domains/auth/application/ports');
    expect(existsSync(authPortsPath)).toBe(true);
  });
});
