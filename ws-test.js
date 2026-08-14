const io = require('socket.io-client');
const socket = io('http://localhost:3000/dashboard', { 
    transports: ['websocket'],
    auth: { token: 'invalido' },
    reconnection: false
});

socket.on('connect_error', (err) => {
    console.log('Connect Error:', err.message);
    process.exit(0);
});

socket.on('connect', () => {
    console.log('Connect: Success');
    process.exit(1);
});

setTimeout(() => {
    console.log('Timeout');
    process.exit(1);
}, 2000);
