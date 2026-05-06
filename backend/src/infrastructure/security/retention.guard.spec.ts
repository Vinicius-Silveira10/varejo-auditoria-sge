import { RetentionGuard } from './retention.guard';
import { ForbiddenException } from '@nestjs/common';

describe('RetentionGuard (RN-REL-003)', () => {

  it('deve bloquear purge de registro com menos de 5 anos', () => {
    const recentDate = new Date(); // agora
    
    expect(() => RetentionGuard.assertPurgeable(recentDate))
      .toThrow(ForbiddenException);
    expect(() => RetentionGuard.assertPurgeable(recentDate))
      .toThrow('RN-REL-003');
  });

  it('deve bloquear purge de registro com 4 anos', () => {
    const fourYearsAgo = new Date();
    fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);

    expect(() => RetentionGuard.assertPurgeable(fourYearsAgo))
      .toThrow(ForbiddenException);
  });

  it('deve permitir purge de registro com mais de 5 anos', () => {
    const sixYearsAgo = new Date();
    sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);

    expect(() => RetentionGuard.assertPurgeable(sixYearsAgo))
      .not.toThrow();
  });

  it('deve retornar data de corte correta (5 anos atrás)', () => {
    const cutoff = RetentionGuard.getRetentionCutoffDate();
    const now = new Date();
    
    const diffYears = now.getFullYear() - cutoff.getFullYear();
    expect(diffYears).toBe(5);
  });
});
