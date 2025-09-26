/**
 * Password Service Interface
 * Defines contract for password hashing and verification
 */

export interface IPasswordService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  generateSalt(): string;
}

export interface IEmailService {
  sendVerificationEmail(email: string, token: string, name: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string, name: string): Promise<void>;
  sendWelcomeEmail(email: string, name: string): Promise<void>;
}

export interface IEventPublisher {
  publish(event: any): Promise<void>;
  subscribe(eventType: string, handler: (event: any) => Promise<void>): void;
  unsubscribe(eventType: string, handler: (event: any) => Promise<void>): void;
}