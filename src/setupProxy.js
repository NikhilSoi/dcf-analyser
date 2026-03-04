const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/fmpapi',
    createProxyMiddleware({
      target: 'https://financialmodelingprep.com',
      changeOrigin: true,
      pathRewrite: { '^/fmpapi': '' },
    })
  );
};
