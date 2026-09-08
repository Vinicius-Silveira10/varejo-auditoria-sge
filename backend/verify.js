async function test() {
  const baseUrl = process.env.TEST_API_URL || 'https://localhost:3000';
  const testPassword = process.env.TEST_PASSWORD || 'SenhaSegura123!';
  try {
    console.log('Registrando usuario...');
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Teste API', email: 'testapi@fortal.com', senhaBruta: testPassword, perfil: 'ADMIN' })
    });
    const data = await res.json();
    console.log('REGISTER OK:', data);

    console.log('Fazendo login...');
    const res2 = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testapi@fortal.com', senhaBruta: testPassword })
    });
    const data2 = await res2.json();
    console.log('LOGIN OK:', data2);
    
    if(data2.accessToken) {
      console.log('JWT GERADO COM SUCESSO! Tudo Funcional.');
    }
  } catch(e) {
    console.error('Erro no teste:', e);
  }
}
test();
