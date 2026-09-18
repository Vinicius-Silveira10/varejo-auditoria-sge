import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    if (req.user && req.user.userId) {
      return Promise.resolve(`user-${req.user.userId}`);
    }
    return Promise.resolve(
      req.ip || (req.ips && req.ips.length ? req.ips[0] : 'default-ip'),
    );
  }
}
