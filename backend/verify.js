async function test() {
  try {
    console.log('Registrando usuario...');
    const res = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Teste API', email: 'testapi@fortal.com', senhaBruta: '123456', perfil: 'ADMIN' })
    });
    const data = await res.json();
    console.log('REGISTER OK:', data);

    console.log('Fazendo login...');
    const res2 = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testapi@fortal.com', senhaBruta: '123456' })
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
