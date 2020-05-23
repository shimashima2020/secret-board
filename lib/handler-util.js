'use strict';

// memo : いろんなモジュールが入っているフォルダを
//        ライブラリフォルダと呼ぶ

//画像ファイルを読み込むため
const fs = require('fs');

// ログアウト機能
function handleLogout(req, res) {
  res.writeHead(401, {
    'Content-Type': 'text/html; charset=utf-8'
  });
  //ログインするリンク
  res.end('<!DOCTYPE html><html lang="ja"><body>' +
    '<h1>ログアウトしました</h1>' +
    '<a href="/posts">ログイン</a>' +
    '</body></html>'
  );
}

// 実装されていないページでは404を返す
// サーバーがぐるぐる探し続けないように
function handleNotFound(req, res) {
  res.writeHead(404, {
    'Content-Type': 'text/plain; charset=utf-8'
  });
  res.end('ページがみつかりません');
}

//未対応のメソッド
function handleBadRequest(req, res) {
  res.writeHead(400, {
    'Content-Type': 'text/plain; charset=utf-8'
  });
  res.end('未対応のリクエストです');
}

//ファビコン
function handleFavicon(req, res) {
  res.writeHead(200, {
    //'アイコンデータをこれから返しますよ'というメッセージ
    'Content-Type': 'image/vnd.microsoft.icon'
  });
  //アイコン画像をファイルから読み込む
  const favicon = fs.readFileSync('./favicon.ico');
  //カッコ内のデータを送信してから通信終了
  res.end(favicon);
}

//他のファイルから使えるように登録
module.exports = {
  handleLogout,
  handleNotFound,
  handleBadRequest,
  handleFavicon
};

