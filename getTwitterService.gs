// ツイッター認証
function getTwitterService() {
  return OAuth1.createService('twitter')
    .setAuthorizationUrl('https://api.twitter.com/oauth/authorize')
    .setConsumerKey(PropertiesService.getScriptProperties().getProperty('CONSUMER_API_KEY'))
    .setConsumerSecret(PropertiesService.getScriptProperties().getProperty('CONSUMER_API_SECRET_KEY'))
    .setAccessToken(PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN'),PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN_SECRET'));
}
