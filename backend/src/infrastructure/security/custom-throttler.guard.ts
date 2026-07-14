import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (req.user && req.user.userId) {
      return `user-${req.user.userId}`;
    }
    return req.ip || (req.ips && req.ips.length ? req.ips[0] : 'default-ip');
  }
}
