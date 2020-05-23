'use strict';

//暗号化に関する関数を提供
const crypto = require('crypto');

const pug = require('pug');

/**複数回投稿されたものをまとめる
const contents = [];
Post.findAllがあるから要らない*/

//インストールしたモジュールを読み込む
//Cookie をヘッダに書き込む際、簡単な API で 
//Cookie を利用できるライブラリ
const Cookies = require('cookies');

//日本時間にするためのライブラリ
const moment = require('moment-timezone');

//未対応のメソッド
const util = require('./handler-util');

//postされたもののデータベース
const Post = require('./post');

//キーとなる文字列を変数に代入
const trackingIdKey = 'tracking_id';

//キーをユーザー名、値をトークンとする連想配列
const oneTimeTokenMap = new Map();

function handle(req, res) {
  const cookies = new Cookies(req, res);
  const trackingId = addTrackingCookie(cookies, req.user);

  switch (req.method) {
    // 投稿一覧
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      //Post.findAll : DBから全部データを取ってくる
      //.then : 取ってきたらpostsに入る
        //{order:[['id', 'DESC']]} : IDの降順にソート
        //新しい投稿が一番上に表示される
      Post.findAll({order:[['id', 'DESC']]}).then((posts) => {
        //配列の全ての要素を１つずつ取り出して以下を実行する
        posts.forEach((post) => {
          //半角スペースを入力すると+が表示されるので、置き換えを行う
          post.content = post.content.replace(/\+/g, ' ');
          //投稿時間を20XX年XX月XX日 XX時XX分XX秒（日本時間）にする
          post.formattedCreatedAt = moment(post.createdAt).tz('Asia/Tokyo').format('YYYY年MM月DD日 HH時mm分ss秒');
        });
        //crypto.randomBytes(n) : 暗号的に強力な擬似乱数データを生成
         // n : サイズ引数、生成するバイト数を示す数値を指定
        const oneTimeToken = crypto.randomBytes(8).toString('hex');
        //ユーザー名をキーとして連想配列にこのトークンを保存
        oneTimeTokenMap.set(req.user, oneTimeToken);
        res.end(pug.renderFile('./views/posts.pug', {
          //pug に渡す値
          posts: posts,
          //user : アクセスしたユーザー名 ex)admin, guest1
          user: req.user,
          //トークン文字列を利用できるように渡す
          oneTimeToken : oneTimeToken
        }));
        //コンソールに閲覧者情報を表示
        console.info(
          `閲覧されました: user: ${req.user}, ` +
          `trackingId: ${trackingId},` +
          `remoteAddress: ${req.connection.remoteAddress} ` +
          `userAgent: ${req.headers['user-agent']} `
          );
      });
      break;

    //投稿機能
    case 'POST':
      //データが入る配列
      let body = '';
        //細切れになったデータをちょっとずつ配列に足す
        req.on('data', (chunk) => {
          body = body + chunk;
        }).on('end', () => {
          //decodeURIComponent : デコードされた文字列を返す
          //中身は、content=投稿内容&oneTimeToken=トークン本体
          const decoded = decodeURIComponent(body);
          //matchResult[1] : 1つ目のカッコ内の文字列を取り出す
          //matchResult[2] : 2つ目のカッコ内の文字列を取り出す
          const matchResult = decoded.match(/content=(.*)&oneTimeToken=(.*)/);
          if (!matchResult) {
            //decodedがそもそも正規表現にマッチしない場合は400 ex)null
            util.handleBadRequest(req, res);
          } else {
            const content = matchResult[1];
            const requestedOneTimeToken = matchResult[2];
            //連想配列に格納されているワンタイムトークンと
            //リクエストされたワンタイムトークンが
            //同じときである場合のみ、投稿をデータベースに保存する
            if (oneTimeTokenMap.get(req.user) === requestedOneTimeToken) {
              console.info('投稿されました: ' + content);
              //投稿がある度にPost.createを実行
              //createは、DBにデータを作ってインストールしてくれる
              Post.create({
                //データベースの名前 : 値
                content: content,
                trackingCookie: trackingId,
                postedBy: req.user
              //保存が完了したらリダイレクトする
              }).then(() => {
                //投稿が成功したら、利用済のトークンを配列から削除する
                oneTimeTokenMap.delete(req.use);
                handleRedirectPosts(req, res);
              });
            } else {
              //トークンが正しくないときは、400-Badrequest
              util.handleBadRequest(req, res);
            }
          }
        });
    break;
    
    //POSTとGET以外のメソッドを要求された時
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

//削除機能
function handleDelete(req, res) {
  //リクエストメソッドで分岐
  switch (req.method) {
    case 'POST':
      let body = '';
      //'data'イベント
      //細切れデータをひとつ受け取ったらbodyに足していく
      req.on('data', (chunk) => {
        body += chunk;
      //'end'イベント : データ送信が全て完了
      }).on('end', () => {
        //decoded : content=投稿内容&oneTimeToken=トークン本体
        const decoded = decodeURIComponent(body);
        //受け取ったデータを & で分割
        const dataArray = decoded.split('&');
        //真理値 ? 正の場合 : 偽の場合
        //文字列は空文字以外は、正の値を返す
        const id = dataArray[0] ? dataArray[0].split('id=')[1]: '';
        const requestedOneTimeToken = dataArray[1] ? dataArray[1].split('oneTimeToken=')[1]:'';
        if(oneTimeTokenMap.get(req.user) === requestedOneTimeToken){
          //主キーを検索して投稿内容(post)取ってくる
          Post.findByPk(id).then((post) => {
            //リクエストした人と投稿者が同じ、または管理者かチェック
            //サーバー側でも必ずチェック
            if (req.user === post.postedBy || req.user === 'admin') {
              post.destroy().then(() => {
                //削除時にログを出力する
                console.info(
                  `削除されました: user: ${req.user}, ` +
                  `remoteAddress: ${req.connection.remoteAddress}, ` +
                  `userAgent: ${req.headers['user-agent']} `
                );
              oneTimeTokenMap.delete(res.user);
              //投稿一覧ページにリダイレクトして、削除できたことを確認
              handleRedirectPosts(req, res);
            });
          }
        });
      } else {
        util.handleBadRequest(req,res);
      }
    });
    break;

    default:
      util.handleBadRequest(req, res);
      break;
  }
}

/**
 * Cookieに含まれているトラッキングIDに異常がなければその値を返し、
 * 存在しない場合や異常なものである場合には、再度作成しCookieに付与してその値を返す
 * @param {Cookies} cookies
 * @param {String} userName
 * @return {String} トラッキングID
 */
function addTrackingCookie(cookies, userName) {
  const requestedTrackingId = cookies.get(trackingIdKey);
  //トラッキングIDが有効かどうか
  if (isValidTrackingId(requestedTrackingId, userName)) {
    return requestedTrackingId;
  } else {
    //JavaScriptの整数値の最大値は、2 の 53 乗 - 1 であり、
    //保持できる精度にも限りがあるためここで得られる数値は
    //4738441943151179000 のように下三桁から四桁が 000 や
    //0000 という値に丸められます。
    const originalId = parseInt(crypto.randomBytes(8).toString('hex'), 16);
    //「次の日」のデータを持った日付オブジェクトを作る
    //Date.now() : 現在時刻
    const tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
    const trackingId = originalId + '_' + createValidHash(originalId, userName);
    //値をセットする
    //expires : 有効期限
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
    return trackingId;
  }
}

function isValidTrackingId(trackingId, userName) {
  if (!trackingId) {
    //初回、有効期限後
    return false;
  }
  const splitted = trackingId.split('_');
  const originalId = splitted[0];
  const requestedHash = splitted[1];
  return createValidHash(originalId, userName) === requestedHash;
}

//秘密鍵
const secretKey =
'534376a03ae083b118cf7730e0e258c204097b7d79840b054bbf4ad425d1e0b210410405f3ca210e7602c8665a65af8ea188b94588c453f9b51474a41bd894e68bc0558fd9b38e66da24ea6f2afab56828117c4331e2aeceb28537b5fc82556c199f8227663b0ccce2f7e96d1379dec53201c52e87619f99dbcd923e70c3fac8166e278ccccf21d388ad09acef4093ce3ef6de1bea2c58b3d4778f81d0076f4bec664b19e43caf55c61786fa9f863c11004007d68a4424f10098940411f70323afd48bb28b0028b80ad11bbe924b70f031d3e4953d502489780ecf377c481c1b1a27e2bcd64b61081ab7f903dc924a81088ff6ff7a10269938824e3bd2c1d6d9';

function createValidHash(originalId, userName) {
  const sha1sum = crypto.createHash('sha1');
  sha1sum.update(originalId + userName + secretKey);
  //文字列で返す
  // hex : 16進数で返す
  return sha1sum.digest('hex');
}


function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}

module.exports = {
  handle,
  handleDelete
};

