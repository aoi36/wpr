
const http = require('http');
const server = http.createServer();
server.on('request', (req, res) => {
res.statusCode = 200;
res.setHeader('Content-Type', 'text/html');
res.end('<h1>Hello, World!</h1>');
});
const PORT = 3000;
server.listen(PORT, () => {
console.log(`Server running at 
http://localhost:${PORT}/`);
});
console.log("abc")