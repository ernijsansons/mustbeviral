/**
 * Field-Level Encryption Service
 * Provides secure encryption for sensitive data fields
 */

import { secretManager} from '../../config/secrets';
import { ValidationError} from '../../middleware/validation';

export interface EncryptionResult {
  encrypted: string;
  algorithm: string;
  keyVersion: string;
}

export interface DecryptionResult {
  decrypted: string;
  algorithm: string;
  keyVersion: string;
}

export interface EncryptedField {
  value: string;
  metadata: {
    algorithm: string;
    keyVersion: string;
    timestamp: string;
  };
}

export class FieldEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEYLENGTH = 256;
  private static readonly IVLENGTH = 12; // 96 bits for GCM
  private static readonly TAGLENGTH = 16; // 128 bits for GCM
  private static encryptionKey: CryptoKey;
  private static keyVersion = 'v1';
  private static initialized = false;

  /**
   * Initialize the encryption service
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {return;}

    try {
      const encryptionSecret = secretManager.getSecret('ENCRYPTION_KEY');

      // Import the key for AES-GCM
      const keyMaterial = new TextEncoder().encode(encryptionSecret);
      const keyHash = await crypto.subtle.digest('SHA-256', keyMaterial);

      this.encryptionKey = await crypto.subtle.importKey(
        'raw',
        keyHash,
        { name: this.ALGORITHM },
        false,
        ['encrypt', 'decrypt']
      );

      this.initialized = true;
      console.log('LOG: ENCRYPTION-INIT-1 - Field encryption initialized');
    } catch (error: unknown) {
      throw new ValidationError(
        [{ field: 'encryption', message: 'Failed to initialize encryption service' }],
        'Encryption service initialization failed'
      );
    }
  }

  /**
   * Encrypt a field value
   */
  static async encryptField(value: string, fieldName?: string): Promise<EncryptedField> {
    await this.ensureInitialized();

    if (!value) {
      throw new ValidationError(
        [{ field: 'value', message: 'Value to encrypt cannot be empty' }],
        'Encryption failed'
      );
    }

    try {
      const iv = crypto.getRandomValues(new Uint8Array(this.IVLENGTH));
      const data = new TextEncoder().encode(value);

      // Add field name to additional data for authentication
      const additionalData = fieldName ? new TextEncoder().encode(fieldName) : undefined;

      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          additionalData: additionalData
        },
        this.encryptionKey,
        data
      );

      // Combine IV + encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Base64 encode the result
      const encryptedBase64 = btoa(String.fromCharCode(...combined));

      return {
        value: encryptedBase64,
        metadata: {
          algorithm: this.ALGORITHM,
          keyVersion: this.keyVersion,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: unknown) {
      console.error('LOG: ENCRYPTION-ERROR-1 - Field encryption failed:', error);
      throw new ValidationError(
        [{ field: 'encryption', message: 'Failed to encrypt field' }],
        'Encryption operation failed'
      );
    }
  }

  /**
   * Decrypt a field value
   */
  static async decryptField(encryptedField: EncryptedField, fieldName?: string): Promise<string> {
    await this.ensureInitialized();

    if (!encryptedField.value) {
      throw new ValidationError(
        [{ field: 'encryptedValue', message: 'Encrypted value cannot be empty' }],
        'Decryption failed'
      );
    }

    try {
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedField.value).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, this.IVLENGTH);
      const encryptedData = combined.slice(this.IVLENGTH);

      // Add field name to additional data for authentication
      const additionalData = fieldName ? new TextEncoder().encode(fieldName) : undefined;

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          additionalData: additionalData
        },
        this.encryptionKey,
        encryptedData
      );

      return new TextDecoder().decode(decrypted);
    } catch (error: unknown) {
      console.error('LOG: ENCRYPTION-ERROR-2 - Field decryption failed:', error);
      throw new ValidationError(
        [{ field: 'decryption', message: 'Failed to decrypt field' }],
        'Decryption operation failed'
      );
    }
  }

  /**
   * Encrypt multiple fields in an object
   */
  static async encryptFields<T extends Record<string, unknown>>(
    data: T,
    fieldsToEncrypt: (keyof T)[]
  ): Promise<T> {
    await this.ensureInitialized();

    const result = { ...data };

    for (const fieldName of fieldsToEncrypt) {
      const value = data[fieldName];
      if (value && typeof value === 'string') {
        result[fieldName] = await this.encryptField(value, String(fieldName));
      }
    }

    return result;
  }

  /**
   * Decrypt multiple fields in an object
   */
  static async decryptFields<T extends Record<string, unknown>>(
    data: T,
    fieldsToDecrypt: (keyof T)[]
  ): Promise<T> {
    await this.ensureInitialized();

    const result = { ...data };

    for (const fieldName of fieldsToDecrypt) {
      const encryptedField = data[fieldName] as EncryptedField;
      if (encryptedField && typeof encryptedField === 'object' && encryptedField.value) {
        result[fieldName] = await this.decryptField(encryptedField, String(fieldName));
      }
    }

    return result;
  }

  /**
   * Check if a field is encrypted
   */
  static isFieldEncrypted(value: unknown): value is EncryptedField {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof value.value === 'string' &&
      typeof value.metadata === 'object' &&
      typeof value.metadata.algorithm === 'string' &&
      typeof value.metadata.keyVersion === 'string'
    );
  }

  /**
   * Hash a value for searchable encryption (one-way)
   */
  static async hashForSearch(value: string, salt?: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(value + (salt ?? ''));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      return btoa(String.fromCharCode(...hashArray));
    } catch (error: unknown) {
      throw new ValidationError(
        [{ field: 'hash', message: 'Failed to hash value for search' }],
        'Hash operation failed'
      );
    }
  }

  /**
   * Create a search hash for encrypted fields
   */
  static async createSearchHash(value: string, fieldName: string): Promise<string> {
    const salt = `search_${fieldName}_${this.keyVersion}`;
    return await this.hashForSearch(value.toLowerCase().trim(), salt);
  }

  /**
   * Ensure initialization
   */
  private static async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Rotate encryption key (for key rotation scenarios)
   */
  static async rotateKey(newSecret: string): Promise<void> {
    try {
      const keyMaterial = new TextEncoder().encode(newSecret);
      const keyHash = await crypto.subtle.digest('SHA-256', keyMaterial);

      const newKey = await crypto.subtle.importKey(
        'raw',
        keyHash,
        { name: this.ALGORITHM },
        false,
        ['encrypt', 'decrypt']
      );

      // Update key and version
      this.encryptionKey = newKey;
      this.keyVersion = `v${Date.now()}`;

      console.log('LOG: ENCRYPTION-ROTATE-1 - Encryption key rotated successfully');
    } catch (error: unknown) {
      throw new ValidationError(
        [{ field: 'keyRotation', message: 'Failed to rotate encryption key' }],
        'Key rotation failed'
      );
    }
  }

  /**
   * Get current key version
   */
  static getCurrentKeyVersion(): string {
    return this.keyVersion;
  }

  /**
   * Validate encrypted field format
   */
  static validateEncryptedField(field: unknown): field is EncryptedField {
    if (!this.isFieldEncrypted(field)) {
      return false;
    }

    // Validate algorithm
    if (field.metadata.algorithm !== this.ALGORITHM) {
      return false;
    }

    // Validate base64 encoding
    try {
      atob(field.value);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * PII (Personally Identifiable Information) Encryption Helper
 */
export class PIIEncryption {
  private static readonly PIIFIELDS = new Set([
    'email',
    'phone',
    'ssn',
    'address',
    'firstName',
    'lastName',
    'fullName',
    'creditCard',
    'bankAccount',
    'passport',
    'driverLicense'
  ]);

  /**
   * Automatically encrypt PII fields in an object
   */
  static async encryptPII<T extends Record<string, unknown>>(data: T): Promise<T> {
    const fieldsToEncrypt = Object.keys(data).filter(key =>
      this.PII_FIELDS.has(key)  ?? this.isPIIField(key, data[key])
    );

    return await FieldEncryption.encryptFields(data, fieldsToEncrypt);
  }

  /**
   * Automatically decrypt PII fields in an object
   */
  static async decryptPII<T extends Record<string, unknown>>(data: T): Promise<T> {
    const fieldsToDecrypt = Object.keys(data).filter(key =>
      FieldEncryption.isFieldEncrypted(data[key])
    );

    return await FieldEncryption.decryptFields(data, fieldsToDecrypt);
  }

  /**
   * Check if a field contains PII based on content analysis
   */
  private static isPIIField(fieldName: string, value: unknown): boolean {
    if (typeof value !== 'string') {
    return false;
  }

    // Email pattern
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {return true;}

    // Phone number pattern
    if (/^\+?[\d\s-\(\)]{10,}$/.test(value)) {return true;}

    // Credit card pattern (simplified)
    if (/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(value)) {return true;}

    // SSN pattern
    if (/^\d{3}-?\d{2}-?\d{4}$/.test(value)) {return true;}

    return false;
  }

  /**
   * Mask PII for logging (show only first and last few characters)
   */
  static maskPII(value: string, showChars: number = 2): string {
    if (value.length <= showChars * 2) {
      return '*'.repeat(value.length);
    }

    return value.substring(0, showChars) +
           '*'.repeat(value.length - showChars * 2) +
           value.substring(value.length - showChars);
  }

  /**
   * Create a masked copy of an object for logging
   */
  static createMaskedCopy<T extends Record<string, unknown>>(data: T): T {
    const masked = { ...data };

    for (const [key, value] of Object.entries(masked)) {
      if (this.PII_FIELDS.has(key) && typeof value === 'string') {
        masked[key] = this.maskPII(value);
      }
    }

    return masked;
  }
}

/**
 * Database encryption utilities
 */
export class DatabaseEncryption {
  /**
   * Prepare data for database storage (encrypt sensitive fields)
   */
  static async prepareForStorage<T extends Record<string, unknown>>(
    data: T,
    sensitiveFields: (keyof T)[]
  ): Promise<T> {
    const prepared = { ...data };

    // Encrypt sensitive fields
    for (const field of sensitiveFields) {
      const value = data[field];
      if (value && typeof value === 'string') {
        const encrypted = await FieldEncryption.encryptField(value, String(field));
        prepared[field] = JSON.stringify(encrypted);

        // Create search hash if needed for queries
        const searchField = `${String(field)}_search_hash` as keyof T;
        if (data[searchField] !== undefined) {
          prepared[searchField] = await FieldEncryption.createSearchHash(value, String(field));
        }
      }
    }

    return prepared;
  }

  /**
   * Prepare data from database (decrypt sensitive fields)
   */
  static async prepareFromStorage<T extends Record<string, unknown>>(
    data: T,
    sensitiveFields: (keyof T)[]
  ): Promise<T> {
    const prepared = { ...data };

    // Decrypt sensitive fields
    for (const field of sensitiveFields) {
      const value = data[field];
      if (value && typeof value === 'string') {
        try {
          const encryptedField = JSON.parse(value) as EncryptedField;
          if (FieldEncryption.isFieldEncrypted(encryptedField)) {
            prepared[field] = await FieldEncryption.decryptField(encryptedField, String(field));
          }
        } catch (error: unknown) {
          console.warn(`LOG: DB-ENCRYPTION-WARN-1 - Failed to decrypt field ${String(field)}:`, error);
        }
      }
    }

    return prepared;
  }
}