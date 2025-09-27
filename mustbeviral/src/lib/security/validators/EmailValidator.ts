// Simple email validation - no complex patterns!
export class EmailValidator {
  private readonly emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  private readonly maxEmailLength = 254;

  isValid(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    if (email.length > this.maxEmailLength) {
      return false;
    }

    if (email.includes('..')) {
      return false;
    }

    return this.emailRegex.test(email.toLowerCase());
  }

  getErrorMessage(email: string): string {
    if (!email) {
      return 'Email is required';
    }

    if (typeof email !== 'string') {
      return 'Email must be a string';
    }

    if (email.length > this.maxEmailLength) {
      return 'Email is too long';
    }

    if (email.includes('..')) {
      return 'Email cannot contain consecutive dots';
    }

    if (!this.emailRegex.test(email.toLowerCase())) {
      return 'Email format is invalid';
    }

    return '';
  }
}