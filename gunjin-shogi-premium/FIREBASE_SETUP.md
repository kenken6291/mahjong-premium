# Firebase Realtime Database セットアップ手順

Gunjin Shogi Premium（軍人将棋）でオンライン通信対戦機能を利用するには、Google Firebaseアカウントを作成し、データベースを設定する必要があります。
以下の手順に沿って設定を行ってください。

---

## 🛠️ ステップ1: Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセスし、Googleアカウントでログインします。
2. 「**プロジェクトを追加**」をクリックします。
3. プロジェクト名（例: `gunjin-shogi-premium`）を入力し、規約に同意して「続行」を押します。
4. Google アナリティクスの設定画面が表示されますが、このアプリでは不要なため「**このプロジェクトで Google アナリティクスを無効にする**」にチェックするか、無効化して「**プロジェクトを作成**」をクリックします。
5. 作成完了画面が表示されたら「続行」をクリックします。

---

## 🛠️ ステップ2: Realtime Database の作成とルール設定

オンライン対戦でリアルタイムに駒の移動や戦闘、準備状態のデータを同期するためのデータベースを作成します。

1. Firebaseコンソールの左側メニューから「**構築**」をクリックし、「**Realtime Database**」を選択します。
2. 「**データベースを作成**」をクリックします。
3. データベースの場所（ロケーション）を選択します（「**米国（us-central1）**」または「**アジア（asia-southeast1）**」が推奨されます）。
4. セキュリティルールの初期設定で「**テストモードで開始する**」を選択します。（これにより誰でも読み書きできるようになり、デモプレイが可能になります）。
   > [!IMPORTANT]
   > テストモードは30日後にアクセスできなくなります。永続的に利用したい場合は、作成後に「ルール」タブを開き、以下のように書き換えて「公開」をクリックしてください。
   > ```json
   > {
   >   "rules": {
   >     ".read": true,
   >     ".write": true
   >   }
   > }
   > ```
5. 「**有効にする**」をクリックします。

---

## 🛠️ ステップ3: アプリの登録と設定のコピー

データベースの接続情報をゲームに埋め込むためのAPIキー等を取得します。

1. Firebaseコンソールの左メニュー上部にある「**プロジェクトの概要**」の横の「歯車マーク」をクリックし、「**プロジェクトの設定**」を選択します。
2. 下部にある「マイアプリ」セクションで、**ウェブ（ `</>` アイコン）** をクリックします。
3. アプリのニックネーム（例: `gunjin-shogi-web`）を入力します。※Firebase Hostingは**チェック不要**です。
4. 「**アプリを登録**」をクリックします。
5. 画面に設定用のコード（SDKの追加）が表示されます。その中にある `firebaseConfig` オブジェクトをコピーします。

```javascript
// コピーする対象の例：
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "gunjin-shogi-premium.firebaseapp.com",
  databaseURL: "https://gunjin-shogi-premium-default-rtdb.firebaseio.com",
  projectId: "gunjin-shogi-premium",
  storageBucket: "gunjin-shogi-premium.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

---

## 🛠️ ステップ4: `app.js` への貼り付け

1. ローカルの `app.js` をエディタで開きます。
2. ファイルの先頭付近にある以下の部分を探します：

```javascript
// --- Firebase Config (ユーザー設定エリア) ---
const firebaseConfig = {
    // ⚠️ コピーした firebaseConfig の中身をここに貼り付けてください
};
```

3. コピーした接続情報をここに貼り付けて保存します。
4. ファイルを保存し、再び Git にコミットして GitHub にプッシュすれば、オンライン対戦がすぐに使えるようになります！
5. 設定していない場合は、自動的にオフラインの「COM対戦」および「ローカル対戦（1台の端末で交互プレイ）」のみが選択可能になります。
