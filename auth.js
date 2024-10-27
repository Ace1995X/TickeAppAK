const { auth } = require('express-oauth2-jwt-bearer');

const checkJwt = auth({
  audience: 'YOUR_API_IDENTIFIER',
  issuerBaseURL: `https://YOUR_DOMAIN/`,
});

module.exports = checkJwt;