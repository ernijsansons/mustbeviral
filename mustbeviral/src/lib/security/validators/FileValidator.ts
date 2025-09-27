// Simple file validation - easy rules!
export class FileValidator {
  private readonly allowedProtocols = ['http:', 'https:'];

  isValidUrl(urlString: string, customProtocols?: string[]): boolean {
    if (!urlString || typeof urlString !== 'string') {
      return false;
    }

    try {
      const parsedUrl = new URL(urlString);

      const protocolsToCheck = customProtocols ?? this.allowedProtocols;
      if (!protocolsToCheck.includes(parsedUrl.protocol)) {
        return false;
      }

      if (this.hasSuspiciousPatterns(urlString)) {
        return false;
      }

      if (!parsedUrl.hostname || parsedUrl.hostname.includes('..')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  isValidCreditCard(cardNumber: string): boolean {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return false;
    }

    const cleanedCard = cardNumber.replace(/[\s-]/g, '');

    if (!this.isAllDigits(cleanedCard)) {
      return false;
    }

    if (cleanedCard.length < 13 || cleanedCard.length > 19) {
      return false;
    }

    return this.passesLuhnAlgorithm(cleanedCard);
  }

  isValidPhoneNumber(phoneNumber: string, countryCode = 'US'): boolean {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return false;
    }

    const cleanedPhone = phoneNumber.replace(/[\s\-\(\)\.]/g, '');

    if (countryCode === 'US') {
      return /^(\+?1)?[2-9]\d{9}$/.test(cleanedPhone);
    }

    return /^\+?[1-9]\d{6,14}$/.test(cleanedPhone);
  }

  isValidDate(dateString: string, format = 'YYYY-MM-DD'): boolean {
    if (!dateString || typeof dateString !== 'string') {
      return false;
    }

    const parsedDate = new Date(dateString);

    if (isNaN(parsedDate.getTime())) {
      return false;
    }

    if (format === 'YYYY-MM-DD') {
      return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
    }

    return true;
  }

  isValidIPAddress(ipAddress: string): boolean {
    if (!ipAddress || typeof ipAddress !== 'string') {
      return false;
    }

    const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

    return ipv4Pattern.test(ipAddress) || ipv6Pattern.test(ipAddress);
  }

  private hasSuspiciousPatterns(urlString: string): boolean {
    const suspiciousPatterns = ['javascript:', 'data:', 'vbscript:'];
    return suspiciousPatterns.some(pattern => urlString.includes(pattern));
  }

  private isAllDigits(inputString: string): boolean {
    return /^\d+$/.test(inputString);
  }

  private passesLuhnAlgorithm(cardNumber: string): boolean {
    let cardSum = 0;
    let shouldDouble = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let currentDigit = parseInt(cardNumber[i], 10);

      if (shouldDouble) {
        currentDigit *= 2;
        if (currentDigit > 9) {
          currentDigit -= 9;
        }
      }

      cardSum += currentDigit;
      shouldDouble = !shouldDouble;
    }

    return cardSum % 10 === 0;
  }
}