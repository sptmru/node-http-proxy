import express from 'express';
import https from 'https';
import http from 'http';

const app = express();

const targetUrl = process.env.TARGET_URL || 'https://habr.com';
const proxyServerPort = process.env.PROXY_SERVER_PORT || 8080;

app.use('/', function (clientRequest, clientResponse) {
  const parsedHost = targetUrl.split('/').splice(2).splice(0, 1).join('/');
  let parsedPort;
  let parsedSSL;
  if (targetUrl.startsWith('https://')) {
    parsedPort = 443;
    parsedSSL = https;
  } else if (targetUrl.startsWith('http://')) {
    parsedPort = 80;
    parsedSSL = http;
  }
  let path = clientRequest.url;
  path = path.endsWith('/') ? path : path + '/';

  const options = {
    hostname: parsedHost,
    port: parsedPort,
    path: path,
    method: clientRequest.method,
    headers: {
      'User-Agent': clientRequest.headers['user-agent']
    }
  };

  const serverRequest = parsedSSL.request(options, function (serverResponse) {
    let body = '';
    if (String(serverResponse.headers['content-type']).indexOf('text/html') !== -1) {
      serverResponse.on('data', function (chunk) {
        body += chunk;
      });

      serverResponse.on('end', function () {
        clientResponse.writeHead(serverResponse.statusCode, serverResponse.headers);
        clientResponse.end(body);
      });
    } else {
      serverResponse.pipe(clientResponse, {
        end: true
      });
      clientResponse.contentType(serverResponse.headers['content-type']);
    }
  });

  serverRequest.end();
});

app.listen(proxyServerPort);
console.log(`Proxy server listening on port ${proxyServerPort}`);