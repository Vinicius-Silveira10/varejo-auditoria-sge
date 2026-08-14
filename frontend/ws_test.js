const io = require('socket.io-client');
const socket = io('http://localhost:3333');
socket.on('connect', () => { console.log('CONECTADO'); });
socket.on('disconnect', (reason) => {
  console.log('DESCONECTADO_LITERAL: ' + reason);
  process.exit(0);
});
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 3000);
