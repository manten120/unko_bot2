const SPREAD_SEAT_ID = PropertiesService.getScriptProperties().getProperty("SPREAD_SHEET_ID");

const TWITTER_TARGET_USER_ID = parseInt(PropertiesService.getScriptProperties().getProperty("TWITTER_TARGET_USER_ID"), 10)

// セルを取得
const sheetData = SpreadsheetApp.openById(SPREAD_SEAT_ID).getSheetByName("シート1"); // 「シート1」はシート名

// Twitter認証
const service  = getTwitterService();

/**
 いいね or RT 機能
 ① 検索ワードをスプレッドシートから取得する
 ② 検索ワードをTwitterで検索する（たくさん取れてしまうので「直近10分間」の検索を10分毎に行う）
 ③ ツイートに いいね or RT をする
 ④ 他に検索ワードがあれば②に戻る
*/
function main () {
  // ① 検索ワードをスプレッドシートから取得する
  const searchWords = pickUpSearchWords();
  
  // searchWordsの中身は
  // [ [ '投稿内容', 'いいね or RT', '最終TweetId'] ,  [ '投稿内容', 'いいね or RT', '最終TweetId'] ,  [ '投稿内容', 'いいね or RT', '最終TweetId'] ,....,] 
  // という形式になっているので1つずつ見ていく
  for (let i = 0, il = searchWords.length; i < il; i++ ) {
    const searchWord = searchWords[i][0];
    const type = searchWords[i][1];
    let lastTweetId = searchWords[i][2];
    
    // ② Twitterで検索する
    const tweetList = findTweets(searchWord, lastTweetId);

    console.log('tweetList.length', tweetList.length)
    
    // ③ 複数件ツイートを取得されるので for を使って1つずつツイートを取り出し いいね or RT をする
    for (let j = 0, jl = tweetList.length; j < jl; j++ ) {
      const tweet = tweetList[j];
      // 最新のツイートのIDを取る
      if (tweet.id_str > lastTweetId) {
        lastTweetId = tweet.id_str;
      }

      // ツイートの本文が"うんこ"でなければ現在のループをスキップする
      const text = tweet['text'].trim();
      const searchWordRegExp = new RegExp(`^${searchWord}$`);
      const isPureUnko = searchWordRegExp.test(text);
      console.log(searchWordRegExp);
      console.log(isPureUnko);
      console.log(tweet.user.id);
      if (!isPureUnko) {
        continue;
      }

      // りっちょんのツイートならslackに通知
      if (tweet.user.id == TWITTER_TARGET_USER_ID) {
        notifySlack();
      }

      const  status = getTweetStatus(tweet);
  
      if (type == 'いいね') {
        if (!status.favorited) {
          putFavorite (tweet);
        }
      } else if (type == 'RT') {
        if (!status.retweeted) {
          console.log(tweet['text']) 
          putRetweet (tweet);
        }
      }
    }

    // 重複処理をしないように最新のツイートIDを保存する
    const titleRow = 1; // 『検索ワード』とか書いている部分の行数
    const lastTweetIdCol = 3; // 『最終TweetId』の列までなので3列目まで
    const updateCell = sheetData.getRange(i + 1 + titleRow, lastTweetIdCol, 1, 1); // i = 0 の時1行目なので+1してる
    updateCell.setValue(lastTweetId);
  }
}

// 検索ワードをスプレッドシートから取得する
function pickUpSearchWords () {
  const titleRow = 1; // 『検索ワード』とか書いている部分の行数
  const startRow = 1 + titleRow; // 1行目は『検索ワード』とか書いているので2行目から
  const startCol = 1;
  const endRow = sheetData.getLastRow() - titleRow; // 最後の行まで（2行目から始まっているので-1している）
  const endCol = 3; // 『最終TweetId』の列までなので3列目まで
  
  // 一括で取得する
  const cells = sheetData.getRange(startRow, startCol, endRow, endCol).getValues();
  
  // ちなみにcellsの中身は
  // [ [ '投稿内容', 'いいね or RT', '最終TweetId'] ,  [ '投稿内容', 'いいね or RT', '最終TweetId'] ,  [ '投稿内容', 'いいね or RT', '最終TweetId'] ,....,] 
  // という形式になっている
  
  return cells;
}

// ツイートを検索する
// 【参考】 https://developer.twitter.com/en/docs/tweets/search/api-reference/get-search-tweets
function findTweets (searchWord, lastTweetId) {
  // var service  = getTwitterService();
  const query = {
    q: searchWord, // 検索ワード
    lang: 'ja', // 日本語検索
    locale: 'ja', // 日本限定で検索
    result_type: 'recent', // 直近のツイートを検索
    since_id: lastTweetId, // これ以前のツイートは見ない
    count: 100
  }
  // 検索の内容を queryStr にまとめていく
  let queryStr = '';
  for (let key in query) {
    // URLに日本語や記号を付けると上手く検索できないことがあるので#も変換する encodeURIComponent をする
    queryStr += key + '=' + encodeURIComponent(query[key]) + '&'
  }
  // &が余計に付いているので削除しておく
  queryStr = queryStr.slice(0, -1);
  
  const response = service.fetch('https://api.twitter.com/1.1/search/tweets.json?' + queryStr);
  const result = JSON.parse(response)
  return result.statuses
}

// いいね/RTの状態を確認
// 【参考】 https://developer.twitter.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/get-statuses-lookup
function getTweetStatus (tweet) {
  const response = service.fetch('https://api.twitter.com/1.1/statuses/lookup.json?id=' + tweet.id_str);
  const result = JSON.parse(response)
  return result[0];
}

// いいね を付ける
// 【参考】 https://developer.twitter.com/en/docs/tweets/post-and-engage/api-reference/post-favorites-create
function putFavorite (tweet) {
  service.fetch('https://api.twitter.com/1.1/favorites/create.json', {
    method: 'post',
    payload: { id: tweet.id_str }
  });
}

// RT を付ける
// 【参考】　https://developer.twitter.com/en/docs/tweets/post-and-engage/api-reference/post-statuses-retweet-id
function putRetweet (tweet) {
  service.fetch('https://api.twitter.com/1.1/statuses/retweet/' + tweet.id_str +'.json', {
    method: 'post'
  });
}
