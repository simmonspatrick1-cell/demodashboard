const crypto = require('crypto');

function buildOAuthHeader({
  account,
  consumerKey,
  consumerSecret,
  tokenId,
  tokenSecret,
  url,
  method = 'POST'
}) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const signatureMethod = 'HMAC-SHA256';
  const version = '1.0';

  const parsedUrl = new URL(url);
  const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
  const encodedUrl = encodeURIComponent(baseUrl.toLowerCase());
  const encodedMethod = encodeURIComponent(method.toUpperCase());

  const params = {
    oauth_consumer_key: consumerKey,
    oauth_token: tokenId,
    oauth_nonce: nonce,
    oauth_timestamp: timestamp,
    oauth_signature_method: signatureMethod,
    oauth_version: version
  };

  parsedUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const parameterString = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const encodedParams = encodeURIComponent(parameterString);
  const baseString = `${encodedMethod}&${encodedUrl}&${encodedParams}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(baseString)
    .digest('base64');

  const authHeader =
    'OAuth ' +
    `oauth_consumer_key="${consumerKey}", ` +
    `oauth_token="${tokenId}", ` +
    `oauth_signature_method="${signatureMethod}", ` +
    `oauth_timestamp="${timestamp}", ` +
    `oauth_nonce="${nonce}", ` +
    `oauth_version="${version}", ` +
    `oauth_signature="${encodeURIComponent(signature)}", ` +
    `realm="${account}"`;

  return {
    Authorization: authHeader,
    'Content-Type': 'application/json'
  };
}

module.exports = { buildOAuthHeader };
