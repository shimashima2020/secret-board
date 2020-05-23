'use strict';
const postsHandler = require('./posts-handler');
const util = require('./handler-util');

function route(req, res) {
  switch (req.url) {
    // /posts にアクセスがあったら、
    // 投稿にまるわる機能を行う
    case '/posts':
      postsHandler.handle(req, res);
      break;
    //削除機能
    case '/posts?delete=1':
      postsHandler.handleDelete(req, res);
      break;    
    //ログアウト機能
    case '/logout':
      util.handleLogout(req, res);
      break;
    //ファビコン
    case '/favicon.ico':
      util.handleFavicon(req, res);
      break;
    //実装されていないページにアクセスされた時
    default:
      util.handleNotFound(req, res);
      break;
  }
}

// index.js で使えるようにする
module.exports = {
  route
};

