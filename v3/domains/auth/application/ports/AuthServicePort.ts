/**
 * ADR-002: Anti-Corruption Layer - Auth Service Port
 */

export interface AuthServicePort {
  authenticate(credentials: { email: string; password: string }): Promise<boolean>;
  authorize(userId: string, resource: string): Promise<boolean>;
  getUser(userId: string): Promise<any>;
}

export class AuthServiceAdapter implements AuthServicePort {
  async authenticate(credentials: { email: string; password: string }): Promise<boolean> {
    // Implementation
    return true;
  }

  async authorize(userId: string, resource: string): Promise<boolean> {
    // Implementation
    return true;
  }

  async getUser(userId: string): Promise<any> {
    // Implementation
    return null;
  }
}
