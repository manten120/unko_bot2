const postUrl = PropertiesService.getScriptProperties().getProperty("SLACK_WEB_HOOK"); // Incoming WebHooksで発行されたURL
const username = 'うんこbot';  // 通知時に表示されるユーザー名
const icon = ':shit:';  // 通知時に表示されるアイコン
const message = 'りっちょんのうんこをRTしました:shit:';  // 投稿メッセージ

function notifySlack() {
  const jsonData =
  {
     "username" : username,
     "icon_emoji" : icon,
     "text" : message
  };
  
  const payload = JSON.stringify(jsonData);

  const options =
  {
    "method" : "post",
    "contentType" : "application/json",
    "payload" : payload
  };

  UrlFetchApp.fetch(postUrl, options);
}