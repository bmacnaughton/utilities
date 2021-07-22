'use strict';

const http = require('http');
const httpProxy = require('http-proxy');

const proxyServer = httpProxy.createProxyServer({});

const REWRITE_HEADER_PREFIX = /^x-bruce-masking-prefix-/;

// this provides a way to pass specific headers to an end application
// when there are other applications between the client and the end
// application.

proxyServer.on('proxyReq', (proxyReq, req) => {
  const rewriteHeaders = Object.keys(req.headers)
    .filter((key) => REWRITE_HEADER_PREFIX.test(key))
    .map((key) => [key, req.headers[key]]);

  rewriteHeaders.forEach(([oldKey, value]) => {
    const newKey = oldKey.replace(REWRITE_HEADER_PREFIX, '');
    proxyReq.removeHeader(oldKey);
    proxyReq.removeHeader(newKey);
    proxyReq.setHeader(newKey, value);
  });

});

proxyServer.on('error', (err, req, res) => {
  if (err.code === 'ECONNREFUSED') {
    res.writeHead(502, 'Bad Gateway');
    res.end();
  } else {
    throw err;
  }
});

http.createServer((req, res) => {
  proxyServer.web(req, res, {
    target: `http://127.0.0.1:${process.env.PORT}`
  })
}).listen(process.env.PROXY_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`reverse proxy listening on [:${process.env.PROXY_PORT}]`)
});
