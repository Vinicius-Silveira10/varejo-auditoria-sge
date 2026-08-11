import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DashboardGateway } from './dashboard.gateway';

/**
 * dashboard.gateway.spec.ts
 *
 * Testa a lógica de autenticação do WebSocket Gateway.
 *
 * ESTRATÉGIA TDD:
 * O DashboardGateway só tem lógica real em handleConnection().
 * Criamos mocks de Socket com diferentes combinações de token
 * e verificamos que client.disconnect() é chamado nos casos inválidos
 * e NÃO é chamado nos casos válidos.
 *
 * Para demonstrar RED→GREEN:
 * Os testes testam a lógica de handleConnection isolada com mocks.
 * Se a lógica de validação fosse removida do gateway, os testes falhariam.
 */

// ─── Helper: cria um Socket mock com as propriedades necessárias ────────────
function makeSocket(opts: {
  cookie?: string;
  authToken?: string;
  authorizationHeader?: string;
  id?: string;
}): any {
  return {
    id: opts.id ?? 'test-socket-id',
    handshake: {
      headers: {
        ...(opts.cookie ? { cookie: opts.cookie } : {}),
        ...(opts.authorizationHeader
          ? { authorization: opts.authorizationHeader }
          : {}),
      },
      auth: opts.authToken ? { token: opts.authToken } : {},
    },
    data: {},
    disconnect: jest.fn(),
  };
}

// ─── Helper: gera um JWT válido para testes ─────────────────────────────────
function makeValidToken(jwtService: JwtService, payload = { sub: 1, email: 'test@sge.com', perfil: 'ADMIN' }): string {
  return jwtService.sign(payload, { secret: 'test-secret', expiresIn: '1h' });
}

describe('DashboardGateway — Autenticação WebSocket', () => {
  let gateway: DashboardGateway;
  let jwtService: JwtService;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardGateway,
        {
          provide: JwtService,
          useValue: new JwtService({ secret: 'test-secret' }),
        },
      ],
    }).compile();

    gateway = module.get<DashboardGateway>(DashboardGateway);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.JWT_SECRET;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GRUPO 1 — Rejeições: sem token (nenhuma das três fontes)
  // ──────────────────────────────────────────────────────────────────────────

  describe('Rejeição por ausência de token', () => {
    it('deve desconectar cliente sem cookie, sem auth.token, sem Authorization header', () => {
      const client = makeSocket({});

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.data.user).toBeUndefined();
    });

    it('deve desconectar cliente com cookie que não contém campo "token="', () => {
      const client = makeSocket({ cookie: 'session=xyz; other=abc' });

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('deve desconectar cliente com cookie vazio', () => {
      const client = makeSocket({ cookie: '' });

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GRUPO 2 — Rejeições: token inválido / expirado / forjado
  // ──────────────────────────────────────────────────────────────────────────

  describe('Rejeição por token inválido', () => {
    it('deve desconectar cliente com token JWT malformado no cookie', () => {
      const client = makeSocket({ cookie: 'token=isto.nao.e.um.jwt' });

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.data.user).toBeUndefined();
    });

    it('deve desconectar cliente com token JWT assinado com secret DIFERENTE (forjado)', () => {
      // Gera token com um secret que não é o configurado
      const forgedToken = jwtService.sign(
        { sub: 99, email: 'hacker@evil.com', perfil: 'ADMIN' },
        { secret: 'wrong-secret' },
      );
      const client = makeSocket({ authToken: forgedToken });

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('deve desconectar cliente com token JWT expirado', () => {
      // Gera token com expiração no passado
      const expiredToken = jwtService.sign(
        { sub: 1, email: 'test@sge.com', perfil: 'ADMIN' },
        { secret: 'test-secret', expiresIn: '-1s' }, // já expirado
      );
      const client = makeSocket({ authToken: expiredToken });

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('deve desconectar cliente com token vazio no campo auth', () => {
      // auth.token presente mas vazio — deve cair no fluxo "sem token"
      const client = makeSocket({});
      client.handshake.auth = { token: '' };

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GRUPO 3 — Aceitações: token válido por cada uma das 3 fontes
  // ──────────────────────────────────────────────────────────────────────────

  describe('Aceitação de token válido', () => {
    it('deve aceitar conexão com JWT válido no cookie httpOnly', () => {
      const token = makeValidToken(jwtService);
      const client = makeSocket({ cookie: `token=${token}` });

      gateway.handleConnection(client);

      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.data.user).toBeDefined();
      expect(client.data.user.email).toBe('test@sge.com');
    });

    it('deve aceitar conexão com JWT válido em handshake.auth.token', () => {
      const token = makeValidToken(jwtService);
      const client = makeSocket({ authToken: token });

      gateway.handleConnection(client);

      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.data.user).toBeDefined();
      expect(client.data.user.perfil).toBe('ADMIN');
    });

    it('deve aceitar conexão com JWT válido em Authorization header', () => {
      const token = makeValidToken(jwtService);
      const client = makeSocket({ authorizationHeader: `Bearer ${token}` });

      gateway.handleConnection(client);

      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.data.user).toBeDefined();
    });

    it('deve priorizar cookie sobre auth.token quando ambos presentes', () => {
      const validToken = makeValidToken(jwtService, { sub: 1, email: 'cookie@sge.com', perfil: 'ADMIN' });
      const otherToken = makeValidToken(jwtService, { sub: 2, email: 'auth@sge.com', perfil: 'OPERADOR' });

      const client = makeSocket({
        cookie: `token=${validToken}`,
        authToken: otherToken,
      });

      gateway.handleConnection(client);

      expect(client.disconnect).not.toHaveBeenCalled();
      // Cookie tem prioridade — deve ser o usuário do cookie
      expect(client.data.user.email).toBe('cookie@sge.com');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GRUPO 4 — emitDashboardUpdate
  // ──────────────────────────────────────────────────────────────────────────

  describe('emitDashboardUpdate', () => {
    it('não deve lançar erro se server ainda não foi inicializado', () => {
      // server é undefined antes de afterInit ser chamado
      (gateway as any).server = undefined;

      expect(() => gateway.emitDashboardUpdate('kpi:update', { data: 1 })).not.toThrow();
    });

    it('deve emitir evento dashboard:update ao servidor quando inicializado', () => {
      const mockEmit = jest.fn();
      (gateway as any).server = { emit: mockEmit };

      gateway.emitDashboardUpdate('kpi:update', { valor: 42 });

      expect(mockEmit).toHaveBeenCalledWith('dashboard:update', {
        type: 'kpi:update',
        payload: { valor: 42 },
      });
    });
  });
});
