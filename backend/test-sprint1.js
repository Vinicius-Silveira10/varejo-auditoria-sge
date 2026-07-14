const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('--- TESTANDO SPRINT 1 ---');
  let token = '';

  // 1. Login com sucesso
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@fortal.com.br',
      senhaBruta: 'SenhaSegura123!'
    });
    console.log('1. Login: OK', res.status);
    token = res.data.accessToken;
  } catch (err) {
    console.error('1. Login: FALHOU', err.response?.data || err.message);
    return;
  }

  // 2. Recebimento de lote não perecível (fluxo feliz)
  try {
    const res = await axios.post(`${BASE_URL}/batches`, {
      produtoId: 1, // Arroz (seco)
      quantidade: 10,
      custoUnitario: 15.5
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('2. Recebimento Lote Normal: OK', res.status);
  } catch (err) {
    console.error('2. Recebimento Lote Normal: FALHOU', err.response?.data || err.message);
  }

  // 3. Recebimento de lote perecível sem validade (RN-REC-003)
  try {
    const res = await axios.post(`${BASE_URL}/batches`, {
      produtoId: 2, // Iogurte (perecível)
      quantidade: 5,
      custoUnitario: 10.0
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('3. Recebimento Perecível sem validade: FALHOU - Passou direto', res.status);
  } catch (err) {
    console.log('3. Recebimento Perecível sem validade: OK (Retornou erro)', err.response?.status, err.response?.data);
  }

  // 4. Rate limiting (429)
  try {
    console.log('4. Testando Rate Limit (disparando 10 requests)...');
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin@fortal.com.br',
        senhaBruta: 'SenhaSegura123!'
      }).catch(e => e));
    }
    const results = await Promise.all(promises);
    const has429 = results.some(r => r.response?.status === 429);
    console.log('4. Rate Limit: ' + (has429 ? 'OK (Recebeu 429)' : 'FALHOU (Nenhum 429 recebido)'));
    if (has429) {
      console.log('Exemplo 429 Data:', results.find(r => r.response?.status === 429).response.data);
    }
  } catch (err) {
    console.error('4. Rate Limit Error:', err.message);
  }

  // 5. Token expirado/inválido (401)
  try {
    const res = await axios.post(`${BASE_URL}/batches`, {
      produtoId: 1,
      quantidade: 1,
      custoUnitario: 1
    }, {
      headers: { Authorization: `Bearer invalid-token-123` }
    });
    console.log('5. Token Inválido: FALHOU - Passou direto', res.status);
  } catch (err) {
    console.log('5. Token Inválido: OK (Retornou erro)', err.response?.status, err.response?.data);
  }

  // 6. WebSocket event batch:received
  const socket = io(BASE_URL, {
    extraHeaders: { Authorization: `Bearer ${token}` }
  });
  socket.on('connect', () => {
    console.log('6. WebSocket: Connect OK');
    // Trigger batch creation to see event
    axios.post(`${BASE_URL}/batches`, {
      produtoId: 1,
      quantidade: 1,
      custoUnitario: 10.0
    }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  });
  socket.on('batch:received', (data) => {
    console.log('6. WebSocket: Recebeu evento batch:received', data.produtoId ? 'OK' : 'Sem Dados');
    socket.disconnect();
    process.exit(0);
  });

  setTimeout(() => {
    console.log('6. WebSocket: Timeout esperando evento');
    socket.disconnect();
    process.exit(0);
  }, 3000);
}

runTests();
