import http from 'http';

const data = JSON.stringify({
    name: 'Test Admin',
    email: 'test' + Date.now() + '@example.com',
    password: 'password123',
    role: 'MODERATOR'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/signup',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
    },
};

console.log("SENDING:", data);

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
