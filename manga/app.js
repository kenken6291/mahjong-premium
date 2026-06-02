// ==========================================
// Web Manga Viewer Logic
// ==========================================

// コマ進行データの定義
const mangaSteps = [
    // ------------------------------------------
    // プロローグ
    // ------------------------------------------
    {
        episode: 0,
        episodeTitle: "プロローグ：明日からの地図",
        image: "assets/scene1.png",
        speaker: null,
        dialogue: null,
        stage: null,
        narration: "同じ会社で、同じ40年を過ごしてきた同期4人。だが、明日から歩む道は、四者四様。"
    },
    {
        episode: 0,
        episodeTitle: "プロローグ：明日からの地図",
        image: "assets/scene1.png",
        speaker: "佐藤 健一",
        dialogue: "「……終わったな。本当に俺たち、今日で定年なんだな」",
        stage: "（佐藤、ビールを一口飲み、ふうと息を吐き出す）",
        narration: null
    },
    {
        episode: 0,
        episodeTitle: "プロローグ：明日からの地図",
        image: "assets/scene1.png",
        speaker: "鈴木 達也",
        dialogue: "「実感がないよ。明日も普通に7時の電車に乗っちまいそうだ」",
        stage: "（少し寂しそうに微笑みながら）",
        narration: null
    },
    {
        episode: 0,
        episodeTitle: "プロローグ：明日からの地図",
        image: "assets/scene1.png",
        speaker: "田中 茂",
        dialogue: "「俺はもう働きたくない。これからは毎日が夏休みだよ。読書に旅行、やりたいことは山ほどある」",
        stage: "（自慢げに嬉しそうな表情で）",
        narration: null
    },
    {
        episode: 0,
        episodeTitle: "プロローグ：明日からの地図",
        image: "assets/scene1.png",
        speaker: "佐藤 健一",
        dialogue: "「俺は同じ会社で『嘱託再雇用』の契約をした。慣れたオフィスだしな。まあ、給与は半分以下になるが……」",
        stage: "（苦笑いを浮かべながら）",
        narration: null
    },
    {
        episode: 0,
        episodeTitle: "プロローグ：明日からの地図",
        image: "assets/scene1.png",
        speaker: "鈴木 達也",
        dialogue: "「俺はまだ体が動くうちは現場にいたい。外の中小企業だが、技術顧問として週5日、バリバリ働くつもりだ」",
        stage: "（やる気に満ちた力強い目で）",
        narration: null
    },
    {
        episode: 0,
        episodeTitle: "プロローグ：明日からの地図",
        image: "assets/scene1.png",
        speaker: "高橋 宏",
        dialogue: "「俺は来月から念願の蕎麦屋を開店する。自分で責任を取る。これこそが男のロマンだろ！ 俺たちの第二の人生に、乾杯！」",
        stage: "（ジョッキを掲げて大声を張り上げる。一同『乾杯！』）",
        narration: null
    },
    {
        episode: 0,
        episodeTitle: "プロローグ：明日からの地図",
        image: "assets/scene1.png",
        speaker: "佐藤 健一",
        dialogue: "（モノローグ）「同じ会社で、同じ40年を過ごしてきた俺たち。だが、明日から歩む道は四者四様。この選択が、俺たちの未来をどう変えていくのか……」",
        stage: null,
        narration: null
    },

    // ------------------------------------------
    // 第1話：再雇用（佐藤）
    // ------------------------------------------
    {
        episode: 1,
        episodeTitle: "第1話：再雇用の現実",
        image: "assets/scene2.png",
        speaker: null,
        dialogue: null,
        stage: null,
        narration: "定年後、佐藤は元の会社に「シニア嘱託」として再雇用された。しかし、そこには『再雇用』の厳しい現実が待っていた。"
    },
    {
        episode: 1,
        episodeTitle: "第1話：再雇用の現実",
        image: "assets/scene2.png",
        speaker: "佐藤 健一",
        dialogue: "（モノローグ）「席は部屋の隅になり、仕事はルーティン業務のみ。何より、かつての部下が今は私の上司。外野にいるような寂しさがあった。」",
        stage: "（かつての部下である山田課長からデータ入力を頼まれる佐藤）",
        narration: null
    },
    {
        episode: 1,
        episodeTitle: "第1話：再雇用の現実",
        image: "assets/scene2.png",
        speaker: "美智子 (妻)",
        dialogue: "「でもお父さん。毎月確実にこれだけの収入が入るというのはありがたいことよ。新しい職場でイチから人間関係を作るストレスもないしね」",
        stage: "（自宅で、給与の減った明細を見ながら優しく微笑む妻）",
        narration: null
    },
    {
        episode: 1,
        episodeTitle: "第1話：再雇用の現実",
        image: "assets/scene3.png",
        speaker: null,
        dialogue: null,
        stage: null,
        narration: "ある日、オフィスで若手社員たちが過去の重要なトラブル資料が見つからず、山田課長への提出期限に焦っていた。"
    },
    {
        episode: 1,
        episodeTitle: "第1話：再雇用の現実",
        image: "assets/scene3.png",
        speaker: "佐藤 健一",
        dialogue: "「それならファイルサーバーの『総務アーカイブ』じゃなくて、当時の営業本部のバックアップ先にあるよ。案内しよう」",
        stage: "（若手社員たちに画面を指さして教える佐藤）",
        narration: null
    },
    {
        episode: 1,
        episodeTitle: "第1話：再雇用の現実",
        image: "assets/scene3.png",
        speaker: "若手社員たち",
        dialogue: "「本当ですか！？ 助かります！ さすが佐藤さん、当時の歴史を全部知ってるんですね！」",
        stage: "（若手社員たちが目を輝かせて感謝する）",
        narration: null
    },
    {
        episode: 1,
        episodeTitle: "第1話：再雇用の現実",
        image: "assets/scene3.png",
        speaker: "佐藤 健一",
        dialogue: "（モノローグ）「主役ではない。だが長年この会社にいたからこそできるサポートがある。プライドを少し横に置き、若手を支える。それが今の新しいやりがいだ。」",
        stage: "（帰り道の駅のホームで、穏やかな表情で電車を待つ佐藤）",
        narration: null
    },

    // ------------------------------------------
    // 第2話：再就職（鈴木）
    // ------------------------------------------
    {
        episode: 2,
        episodeTitle: "第2話：再就職の壁",
        image: "assets/scene4.png",
        speaker: null,
        dialogue: null,
        stage: null,
        narration: "定年後も「現役の第一線」にこだわった鈴木。外の中小企業へ技術顧問として飛び込んだが……"
    },
    {
        episode: 2,
        episodeTitle: "第2話：再就職の壁",
        image: "assets/scene4.png",
        speaker: "鈴木 達也",
        dialogue: "（モノローグ）「ハローワークでは年齢の壁を痛感し、ようやく入った三和電子でも、大企業のやり方を押し付けて煙たがられるばかりだった。」",
        stage: "（ハローワークの検索画面や、工場で若い門倉部長に煙たがられる鈴木）",
        narration: null
    },
    {
        episode: 2,
        episodeTitle: "第2話：再就職の壁",
        image: "assets/scene5.png",
        speaker: null,
        dialogue: null,
        stage: null,
        narration: "ある夜、工場で翌日納品の試作機が原因不明のトラブルで停止。門倉部長はスパナを持ったまま頭を抱えていた。"
    },
    {
        episode: 2,
        episodeTitle: "第2話：再就職の壁",
        image: "assets/scene5.png",
        speaker: "鈴木 達也",
        dialogue: "「どれ、見せてごらん。ああ、これは真鍮の熱膨張を考慮して、コンマ数ミリ広く取るんだ。私の現場の知恵だよ」",
        stage: "（鈴木、スーツを脱ぎ油まみれになってスパナで手早く調整する）",
        narration: null
    },
    {
        episode: 2,
        episodeTitle: "第2話：再就職の壁",
        image: "assets/scene5.png",
        speaker: "門倉 (技術部長)",
        dialogue: "「動いた……！ すごい、本物の職人技だ。鈴木さん、すいませんでした。これからはその『現場の知恵』を教えてください」",
        stage: "（動いた機械を前に、深く頭を下げる門倉）",
        narration: null
    },
    {
        episode: 2,
        episodeTitle: "第2話：再就職の壁",
        image: "assets/scene5.png",
        speaker: "鈴木 達也",
        dialogue: "（モノローグ）「過去の看板を捨て、身一つで飛び込む。プライドにしがみつかず、相手をリスペクトし汗を流せば、定年後も必要とされる喜びを実感できる。」",
        stage: "（帰り道、油汚れの少し残った手を晴れやかに見つめる鈴木）",
        narration: null
    },

    // ------------------------------------------
    // 第3話：起業（高橋）
    // ------------------------------------------
    {
        episode: 3,
        episodeTitle: "第3話：起業の荒波",
        image: "assets/scene6.png",
        speaker: null,
        dialogue: null,
        stage: null,
        narration: "趣味と長年の地方創生の経験を活かし、念願の蕎麦処「庵 たかはし」を開業した高橋。"
    },
    {
        episode: 3,
        episodeTitle: "第3話&：起業の荒波",
        image: "assets/scene6.png",
        speaker: "高橋 宏",
        dialogue: "（モノローグ）「だが、オープンして3ヶ月。客足は途絶え、貯金は減り続けた。会社員時代と違い、毎日の赤字が直接身を削る重圧に押し潰されそうだった。」",
        stage: "（誰もいない店内で、通帳の残高を見つめ胃を押さえる高橋）",
        narration: null
    },
    {
        episode: 3,
        episodeTitle: "第3話：起業の荒波",
        image: "assets/scene7.png",
        speaker: null,
        dialogue: null,
        stage: null,
        narration: "このままでは潰れる。高橋は会社員時代の地方での人脈を活かし、「本日の地酒と地産珍味セット」という夜の蕎麦飲みプランを考案した。"
    },
    {
        episode: 3,
        episodeTitle: "第3話：起業の荒波",
        image: "assets/scene7.png",
        speaker: "客たち",
        dialogue: "「このお酒と珍味、めちゃくちゃ合いますね！ 東京じゃなかなか食べられないよ。夜も通っちゃうな！」",
        stage: "（サラリーマン風の客たちで賑わう店内）",
        narration: null
    },
    {
        episode: 3,
        episodeTitle: "第3話：起業の荒波",
        image: "assets/scene7.png",
        speaker: "高橋 宏",
        dialogue: "（モノローグ）「組織の盾はなく、胃が痛む夜も多い。だが、自分で仕入れ、自分の腕でお客様を喜ばせ、得た最初の1円の喜びは、何よりも震えるものだった。」",
        stage: "（レジを締め、目標売上達成の数字を見て小さくガッツポーズする高橋）",
        narration: null
    },

    // ------------------------------------------
    // 第4話：リタイア（田中）
    // ------------------------------------------
    {
        episode: 4,
        episodeTitle: "第4話：完全リタイアの孤独",
        image: "assets/scene8.png",
        speaker: null,
        dialogue: null,
        stage: null,
        narration: "「これからは毎日が日曜日だ」と宣言し、40年間の労働から完全に引退した田中。"
    },
    {
        episode: 4,
        episodeTitle: "第4話：完全リタイアの孤独",
        image: "assets/scene8.png",
        speaker: "田中 茂",
        dialogue: "（モノローグ）「最初の1ヶ月は天国だった。しかし、終わりのない空白の日々は、すぐに焦燥感と、社会から孤立したという孤独へ変わっていった。」",
        stage: "（昼間からパジャマ姿でソファーに寝転がり、テレビの画面をぼーっと見つめる田中）",
        narration: null
    },
    {
        episode: 4,
        episodeTitle: "第4話：完全リタイアの孤独",
        image: "assets/scene8.png",
        speaker: "佳代 (妻)",
        dialogue: "「お父さん、何もせずにずっとリビングでゴロゴロされると、私の息が詰まるの。少しは外に出て趣味でも見つけたらどう？」",
        stage: "（パートから帰宅し、荒れた部屋を見て冷たく言い放つ妻。田中はショックを受ける）",
        narration: null
    },
    {
        episode: 4,
        episodeTitle: "第4話：完全リタイアの孤独",
        image: "assets/scene9.png",
        speaker: null,
        dialogue: null,
        stage: null,
        narration: "居場所を失い、妻に促されて地域コミュニティセンターの子供向けおもちゃ作り教室にボランティアとして参加した田中。"
    },
    {
        episode: 4,
        episodeTitle: "第4話：完全リタイアの孤独",
        image: "assets/scene9.png",
        speaker: "子供たち",
        dialogue: "「田中先生！ これ、どうやって動かすの？ わぁ、ゴムを巻いたら動いた！ 田中先生すごい！」",
        stage: "（元エンジニアの知識を活かして子供たちに工作を教える田中。子供たちの笑顔）",
        narration: null
    },
    {
        episode: 4,
        episodeTitle: "第4話：完全リタイアの孤独",
        image: "assets/scene9.png",
        speaker: "田中 茂",
        dialogue: "（モノローグ）「無償であっても『自分の経験を誰かのために使う』場所を見つけられれば、再び社会との繋がりを取り戻せる。必要なのは名刺ではなく、ありがとうと言われる場所だった。」",
        stage: "（地域スタッフにも感謝され、生き生きとした表情で家路につく田中）",
        narration: null
    },

    // ------------------------------------------
    // エピローグ
    // ------------------------------------------
    {
        episode: 5,
        episodeTitle: "エピローグ：俺たちの第二章",
        image: "assets/scene10.png",
        speaker: null,
        dialogue: null,
        stage: null,
        narration: "定年退職の日からちょうど1年後。4人は再び居酒屋「わびすけ」に集まっていた。"
    },
    {
        episode: 5,
        episodeTitle: "エピローグ：俺たちの第二章",
        image: "assets/scene10.png",
        speaker: "高橋 宏",
        dialogue: "「どうにか店も軌道に乗ってな。休みは減ってサラリーマンの倍は働いているが、やっぱり自分の城は最高だ！」",
        stage: "（自家製の蕎麦チップスを振る舞う高橋）",
        narration: null
    },
    {
        episode: 5,
        episodeTitle: "エピローグ：俺たちの第二章",
        image: "assets/scene10.png",
        speaker: "田中 茂",
        dialogue: "「実は俺も工作教室が好評でね、今度はシニア向けパソコン教室の講師も頼まれたんだ。一番喜んでるのは俺が昼間いなくなってホッとしてる妻だがね」",
        stage: "（頭をかきながら笑顔で話す田中。一同大爆笑）",
        narration: null
    },
    {
        episode: 5,
        episodeTitle: "エピローグ：俺たちの第二章",
        image: "assets/scene10.png",
        speaker: "佐藤 健一",
        dialogue: "「みんなそれぞれ、自分の居場所を見つけたんだな。やっぱりどれが正解なんてのはない。自分が『何を一番大切にしたいか』で答えは変わるんだ」",
        stage: "（穏やかな笑顔でビールを飲む佐藤。鈴木も深く頷く）",
        narration: null
    },
    {
        episode: 5,
        episodeTitle: "エピローグ：俺たちの第二章",
        image: "assets/scene11.png",
        speaker: null,
        dialogue: null,
        stage: null,
        narration: "60歳定年。それはサラリーマンにとって、人生最大の分岐点。何を選んでも葛藤があり、メリットもデメリットもある。"
    },
    {
        episode: 5,
        episodeTitle: "エピローグ：俺たちの第二章",
        image: "assets/scene11.png",
        speaker: "佐藤・鈴木・高橋・田中",
        dialogue: "（モノローグ共通）「定年の日は、終わりの日ではない。自分自身の第二章を書き始める、新しい地図を開く日なのだ。さあ、明日もまた、私の道を行こう。」",
        stage: "（笑顔で手を振り、それぞれの帰路へ別れていく4人の背中）",
        narration: null
    }
];

// ==========================================
// 状態管理
// ==========================================
let currentStepIndex = 0;

// DOM要素の取得
const introScreen = document.getElementById("intro-screen");
const viewerScreen = document.getElementById("viewer-screen");
const btnStart = document.getElementById("btn-start");
const btnBackIntro = document.getElementById("btn-back-intro");
const episodeBadge = document.getElementById("episode-badge");
const selectEpisode = document.getElementById("select-episode");
const mangaImage = document.getElementById("manga-image");
const narrationOverlay = document.getElementById("narration-overlay");
const narrationText = document.getElementById("narration-text");
const speakerNameContainer = document.getElementById("speaker-name-container");
const speakerName = document.getElementById("speaker-name");
const dialogueText = document.getElementById("dialogue-text");
const stageDirectionText = document.getElementById("stage-direction-text");
const progressBar = document.getElementById("progress-bar");
const currentStepSpan = document.getElementById("current-step");
const totalStepsSpan = document.getElementById("total-steps");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");

// ==========================================
// 描画・更新処理
// ==========================================
function updateViewer() {
    const step = mangaSteps[currentStepIndex];
    
    // 画像のフェードインアニメーション切り替え
    mangaImage.classList.add("fade-out");
    setTimeout(() => {
        mangaImage.src = step.image;
        mangaImage.alt = `${step.episodeTitle} - コマ`;
        mangaImage.classList.remove("fade-out");
        mangaImage.classList.add("fade-in");
        setTimeout(() => {
            mangaImage.classList.remove("fade-in");
        }, 800);
    }, 200);

    // バッジとセレクトボックスの同期
    episodeBadge.textContent = step.episodeTitle;
    selectEpisode.value = step.episode.toString();

    // ナレーション (オーバーレイ) の表示制御
    if (step.narration) {
        narrationOverlay.classList.remove("hidden");
        narrationText.textContent = step.narration;
    } else {
        narrationOverlay.classList.add("hidden");
        narrationText.textContent = "";
    }

    // セリフと話者名の表示制御
    if (step.speaker) {
        speakerNameContainer.classList.remove("hidden");
        speakerName.textContent = step.speaker;
    } else {
        speakerNameContainer.classList.add("hidden");
    }

    // ダイアログテキストの更新
    if (step.dialogue) {
        dialogueText.classList.remove("hidden");
        dialogueText.textContent = step.dialogue;
    } else {
        dialogueText.classList.add("hidden");
        dialogueText.textContent = "";
    }

    // ト書き (演出・動作) の表示制御
    if (step.stage) {
        stageDirectionText.classList.remove("hidden");
        stageDirectionText.textContent = step.stage;
    } else {
        stageDirectionText.classList.add("hidden");
        stageDirectionText.textContent = "";
    }

    // プログレスバーと進捗情報の更新
    const progressPercent = ((currentStepIndex + 1) / mangaSteps.length) * 100;
    progressBar.style.width = `${progressPercent}%`;
    currentStepSpan.textContent = (currentStepIndex + 1).toString();
    totalStepsSpan.textContent = mangaSteps.length.toString();

    // ボタンの制御
    btnPrev.disabled = currentStepIndex === 0;
    if (currentStepIndex === mangaSteps.length - 1) {
        btnNext.textContent = "最初から読む";
    } else {
        btnNext.textContent = "次へ";
    }
}

// 次のコマへ進む
function nextStep() {
    if (currentStepIndex < mangaSteps.length - 1) {
        currentStepIndex++;
        updateViewer();
    } else {
        // 最終ステップで「次へ」を押した場合は最初に戻る
        currentStepIndex = 0;
        updateViewer();
    }
}

// 前のコマへ戻る
function prevStep() {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        updateViewer();
    }
}

// エピソードの先頭へジャンプする
function jumpToEpisode(episodeIndex) {
    const targetIndex = mangaSteps.findIndex(step => step.episode === episodeIndex);
    if (targetIndex !== -1) {
        currentStepIndex = targetIndex;
        updateViewer();
    }
}

// ==========================================
// イベントリスナーの登録
// ==========================================

// スタートボタン
btnStart.addEventListener("click", () => {
    introScreen.classList.remove("active");
    viewerScreen.classList.add("active");
    currentStepIndex = 0;
    updateViewer();
});

// タイトルに戻るボタン
btnBackIntro.addEventListener("click", () => {
    viewerScreen.classList.remove("active");
    introScreen.classList.add("active");
});

// 前へ / 次へ ボタン
btnPrev.addEventListener("click", prevStep);
btnNext.addEventListener("click", nextStep);

// エピソードセレクトボックスの変更時
selectEpisode.addEventListener("change", (e) => {
    const episodeVal = parseInt(e.target.value, 10);
    jumpToEpisode(episodeVal);
});

// キーボード操作のサポート
document.addEventListener("keydown", (e) => {
    // ビューア画面がアクティブな場合のみ処理
    if (viewerScreen.classList.contains("active")) {
        if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
            e.preventDefault();
            nextStep();
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            prevStep();
        }
    }
});

// 画像エリアのクリックでも進むようにする
document.getElementById("manga-frame").addEventListener("click", (e) => {
    // ボタンやセレクトボックス自体のクリックは除く
    nextStep();
});

// 初期初期化
totalStepsSpan.textContent = mangaSteps.length.toString();
