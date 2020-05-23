'use strict';
const Sequelize = require('sequelize');

//データベースに接続できる設定
const sequelize = new Sequelize(
  'postgres://postgres:postgres@localhost/secret_board',
  {
    logging: false,
    operatorsAliases: false 
  });
const Post = sequelize.define('Post', {
  id: {
    //データの型は数字
    type: Sequelize.INTEGER,
    //自動で数字が一つずつ増えていく
    autoIncrement: true,
    //重複を許さない
    //固有の値がチェックする
    primaryKey: true
  },
  //投稿内容
  content: {
    //TEXT : どんな長さでも保存できる
    type: Sequelize.TEXT
  },
  //投稿者情報
  postedBy: {
    //255文字まで
    type: Sequelize.STRING
  },
  trackingCookie: {
    type: Sequelize.STRING
  }
}, {
  freezeTableName: true,
  //データが作成された時に自動でその時刻を保存してくれる
  timestamps: true
});

Post.sync();
//他のファイルでもアクセスできるように
module.exports = Post;
