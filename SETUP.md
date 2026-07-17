# 🛠 VSCode + Git セットアップ手順

---

## 1. Gitインストール

まだ入っていない場合は以下からインストール:
🔗 https://git-scm.com/download/win

インストール時の設定はすべてデフォルトでOKです。

---

## 2. VSCodeにGitHub連携を設定

VSCodeを開いてターミナルを起動します(`Ctrl + @`)。

以下を1行ずつ入力してEnter:

```bash
git config --global user.name "sunameri9191-hash"
git config --global user.email "GitHubに登録したメールアドレス"
```

---

## 3. リポジトリをクローン(最初の1回だけ)

作業したいフォルダに移動してから以下を実行:

```bash
git clone https://github.com/sunameri9191-hash/horoscope.git
```

すると、そのフォルダに `horoscope` フォルダが作成される。
中にファイル一式が入っている。

---

## 4. VSCodeでフォルダを開く

```
ファイル → フォルダを開く → 「horoscope」フォルダを選択
```

左のサイドバーにファイル一覧が表示されます。

---

## 5. ファイルを編集する

`app.js` や `style.css` を開いて編集するだけです。
保存は `Ctrl + S`。

---

## 6. 変更をGitHubに反映する(毎回の作業)

編集が終わったらターミナルで以下を実行:

```bash
# ①変更内容を確認
git status

# ②変更ファイルをステージ
git add .

# ③コミット(メモ書きの内容は自由)
git commit -m "デザイン修正"

# ④GitHubに送信
git push
```

しばらく待つと **https://sunameri9191-hash.github.io/horoscope/** に反映されます。
(GitHub Pagesの反映には最大1〜2分かかることがあります)

---

## 7. キャッシュバスティング(忘れずに！)

`app.js` や `style.css` を変更したとき、
`index.html` の以下の行のバージョン番号を毎回1つ上げてください:

```html
<script src="app.js?v=28"></script>
↓
<script src="app.js?v=29"></script>
```

これをしないと、古いJSファイルがキャッシュされて変更が反映されないことがあります。
`build v28` の表示も同様に更新してください。

---

## 8. 最新版をGitHubから取得する(他端末で更新した場合)

```bash
git pull
```

---

## よくあるエラー

| エラー | 原因 | 対処 |
|--------|------|------|
| `git push` でパスワードを聞かれる | 認証が必要 | GitHubでPersonal Access Token(PAT)を発行して使う |
| `rejected` と出る | リモートの方が新しい | `git pull` してから `git push` |
| 変更が反映されない | キャッシュ | バージョン番号を上げる / シークレットモードで確認 |

---

## Personal Access Token(PAT)の発行方法

`git push` でパスワードを求められたときは、GitHubのパスワードではなくPATが必要です。

1. GitHub → 右上アイコン → Settings
2. 左下「Developer settings」→「Personal access tokens」→「Tokens (classic)」
3. 「Generate new token」→ `repo` にチェック → 生成
4. 表示されたトークンをコピーしてパスワード欄に貼り付け

> ⚠️ トークンは一度しか表示されないのでメモしておいてください。

---

## 推奨VSCode拡張機能

| 拡張機能 | 用途 |
|----------|------|
| **Prettier** | コードの自動整形 |
| **GitLens** | Git履歴の可視化 |
| **Live Server** | ローカルでプレビュー確認 |
| **HTML CSS Support** | HTML/CSSの補完 |

Live Serverを使うと、ファイルを保存するたびにブラウザが自動でリロードされて便利です。
`index.html` を右クリック→「Open with Live Server」で起動できます。
