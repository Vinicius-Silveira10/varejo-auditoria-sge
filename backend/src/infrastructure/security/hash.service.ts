import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class HashService {
  /**
   * Generates a SHA-256 hash for a given payload and previous hash.
   */
  generateHash(payload: any, previousHash: string | null): string {
    // Ordena as chaves para garantir que o JSON.stringify seja determinístico
    const sortedPayload = this.sortKeys(payload);
    const dataString = JSON.stringify(sortedPayload);
    
    // Concatena com o hash anterior (ou 'GENESIS' se for o primeiro)
    const contentToHash = `${previousHash || 'GENESIS'}|${dataString}`;
    
    return crypto.createHash('sha256').update(contentToHash).digest('hex');
  }

  /**
   * Sorts object keys recursively to ensure deterministic JSON stringification.
   */
  private sortKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortKeys(item));
    }

    return Object.keys(obj)
      .sort()
      .reduce((result: any, key) => {
        result[key] = this.sortKeys(obj[key]);
        return result;
      }, {});
  }
}
