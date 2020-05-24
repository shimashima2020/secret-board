'use strict';

// HTTP のモジュールを読み込み
// (最初からあるモジュール)
const http = require('http');

//ユーザーの認証
const auth = require('http-auth');

const router = require('./lib/router');


const basic = auth.basic({
  //realm：文字列で入力
  realm: 'Enter username and password.',
  //ファイルの場所（./ : 同じフォルダにある）
  file: './users.htpasswd'
});

// http モジュールの機能で、サーバーを作成
// サーバーには、リクエストを表すオブジェクトの引数req と、
// レスポンスを表すオブジェクトの引数res を受け取る無名関数を渡す
  //サーバーの第一引数に、basic（ユーザーの認証）を入れる
const server = http.createServer(basic, (req, res) => {
  
  //アクセスがあったときは、 
  //./lib/router の route関数に処理を任せる
  router.route(req, res);

  //エラーが発生したら種類と一緒に表示する
}).on('error', (e) => {
  console.error('Server Error', e);
}).on('clientError', (e) => {
  console.error('Client Error', e);
});

// httpが起動するポートを宣言
const port = process.env.PORT || 8000;

// サーバーを起動する関数をlisten関数
server.listen(port, () => {

  // サーバーを起動した際に実行する関数
  console.info(`Listening on ${port}`);
  //memo : ` は　shift+@
});

