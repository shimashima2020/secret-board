'use strict';
const pug = require('pug');
//最初からあるモジュールで、テストするのに便利
const assert = require('assert');

// pug のテンプレートにおける XSS 脆弱性のテスト
const html = pug.renderFile('./views/posts.pug', {
  //投稿データを一時的に作って渡す
  posts: [{
    id: 1,
    content: '<script>alert(\'test\');</script>',
    postedBy: 'guest1',
    trackingCookie: '4391976947991005_0d6aeb0d6ad6bc82d29857339d6f304b3054dd5b',
    createdAt: new Date(),
    updatedAt: new Date()
  }],
  user: 'guest1'
});

// スクリプトタグがエスケープされて含まれていることをチェック
//includes : 特定の文字列を含むかどうか
assert(html.includes('&lt;script&gt;alert(\'test\');&lt;/script&gt;'));
console.log('テストが正常に完了しました');