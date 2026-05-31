/**
 * Mahjong Premium - 麻雀ゲームエンジン (mahjong.js)
 * 役判定、点数計算、和了判定、COMの思考ロジックをカプセル化
 */

// 牌の定義
const ALL_PAI_TYPES = [
    // 萬子
    "m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9",
    // 筒子
    "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9",
    // 索子
    "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9",
    // 字牌 (1:東, 2:南, 3:西, 4:北, 5:白, 6:發, 7:中)
    "z1", "z2", "z3", "z4", "z5", "z6", "z7"
];

// 赤ドラの表記: "mr5" (赤五萬), "pr5" (赤五筒), "sr5" (赤五索)

/**
 * 牌を正規化（赤ドラを通常5に変換）
 */
function normalizeTile(tile) {
    if (!tile) return "";
    if (tile === "mr5") return "m5";
    if (tile === "pr5") return "p5";
    if (tile === "sr5") return "s5";
    return tile;
}

/**
 * 牌が赤ドラかどうか判定
 */
function isRedTile(tile) {
    return tile === "mr5" || tile === "pr5" || tile === "sr5";
}

/**
 * 牌のスートを取得 ('m', 'p', 's', 'z')
 */
function getTileSuit(tile) {
    return tile ? tile[0] : "";
}

/**
 * 牌の数値を取得 (字牌なら1-7、数牌なら1-9)
 */
function getTileValue(tile) {
    if (!tile) return 0;
    if (isRedTile(tile)) return 5;
    return parseInt(tile.substring(1));
}

/**
 * 2つの牌をソート用に比較
 */
function compareTiles(a, b) {
    const suitOrder = { 'm': 0, 'p': 1, 's': 2, 'z': 3 };
    const suitA = getTileSuit(a);
    const suitB = getTileSuit(b);

    if (suitOrder[suitA] !== suitOrder[suitB]) {
        return suitOrder[suitA] - suitOrder[suitB];
    }

    const valA = getTileValue(a);
    const valB = getTileValue(b);
    if (valA !== valB) {
        return valA - valB;
    }

    // 赤ドラを通常牌より先に並べる
    const redA = isRedTile(a) ? 1 : 0;
    const redB = isRedTile(b) ? 1 : 0;
    return redB - redA;
}

/**
 * 牌配列をソートする
 */
function sortHand(hand) {
    return [...hand].sort(compareTiles);
}

/**
 * 山札を生成してシャッフルする
 */
function createWall(akaDora = true) {
    let wall = [];
    // 通常の136枚を生成
    for (const type of ALL_PAI_TYPES) {
        for (let i = 0; i < 4; i++) {
            wall.push(type);
        }
    }

    // 赤ドラの導入
    if (akaDora) {
        // m5, p5, s5 のそれぞれ1枚を赤牌に置き換える
        replaceOneTile(wall, "m5", "mr5");
        replaceOneTile(wall, "p5", "pr5");
        replaceOneTile(wall, "s5", "sr5");
    }

    // シャッフル (Fisher-Yates)
    for (let i = wall.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wall[i], wall[j]] = [wall[j], wall[i]];
    }

    return wall;
}

function replaceOneTile(arr, target, replacement) {
    const idx = arr.indexOf(target);
    if (idx !== -1) {
        arr[idx] = replacement;
    }
}

/**
 * 手牌の特定牌の個数を数える (正規化基準)
 */
function getTileCount(hand, target) {
    const normTarget = normalizeTile(target);
    return hand.filter(t => normalizeTile(t) === normTarget).length;
}

/**
 * 手牌から特定の牌を1枚削除する
 */
function removeTile(hand, target) {
    const idx = hand.findIndex(t => t === target);
    if (idx !== -1) {
        hand.splice(idx, 1);
        return true;
    }
    // もし完全一致がなければ正規化一致で削除（赤ドラと通常5の区別を曖昧にするフォールバック）
    const normTarget = normalizeTile(target);
    const normIdx = hand.findIndex(t => normalizeTile(t) === normTarget);
    if (normIdx !== -1) {
        hand.splice(normIdx, 1);
        return true;
    }
    return false;
}

/**
 * 和了(アガリ)判定
 */
function checkAgari(hand, melds = []) {
    const totalCount = hand.length + melds.length * 3;
    if (totalCount !== 14) return null;

    // 手牌の正規化
    const normHand = hand.map(normalizeTile).sort(compareTiles);

    // 1. 国士無双判定 (門前のみ)
    if (melds.length === 0) {
        const kokushiTiles = ["m1", "m9", "p1", "p9", "s1", "s9", "z1", "z2", "z3", "z4", "z5", "z6", "z7"];
        let hasPair = false;
        let isKokushi = true;
        const counts = {};
        for (const t of normHand) {
            counts[t] = (counts[t] || 0) + 1;
        }
        for (const t of kokushiTiles) {
            if (counts[t] === 2 && !hasPair) {
                hasPair = true;
            } else if (counts[t] === 1) {
                // ok
            } else {
                isKokushi = false;
                break;
            }
        }
        if (isKokushi && hasPair) {
            return { type: "kokushi", patterns: [{ eye: "kokushi", melds: [] }] };
        }
    }

    // 2. 七対子判定 (門前のみ)
    if (melds.length === 0) {
        const counts = {};
        for (const t of normHand) {
            counts[t] = (counts[t] || 0) + 1;
        }
        let pairCount = 0;
        let uniqueCount = 0;
        for (const t in counts) {
            if (counts[t] === 2) pairCount++;
            if (counts[t] > 0) uniqueCount++;
        }
        if (pairCount === 7 && uniqueCount === 7) {
            return { type: "chiitoitsu", patterns: [{ eye: "chiitoitsu", melds: [] }] };
        }
    }

    // 3. 一般形判定 (4面子1雀頭)
    const patterns = [];
    const uniqueTiles = [...new Set(normHand)];

    for (const eye of uniqueTiles) {
        if (getTileCount(normHand, eye) >= 2) {
            const remaining = [...normHand];
            removeTile(remaining, eye);
            removeTile(remaining, eye);

            const ways = findMelds(remaining, 4 - melds.length);
            if (ways.length > 0) {
                for (const w of ways) {
                    patterns.push({
                        eye: eye,
                        melds: [...w, ...melds]
                    });
                }
            }
        }
    }

    if (patterns.length > 0) {
        return { type: "normal", patterns: patterns };
    }

    return null;
}

/**
 * 面子の組み合わせを再帰探索
 */
function findMelds(tiles, needed) {
    if (needed === 0) return [[]];
    if (tiles.length === 0) return [];

    const first = tiles[0];
    const results = [];

    // 1. 刻子 (first, first, first)
    if (getTileCount(tiles, first) >= 3) {
        const remaining = [...tiles];
        removeTile(remaining, first);
        removeTile(remaining, first);
        removeTile(remaining, first);
        const sub = findMelds(remaining, needed - 1);
        for (const s of sub) {
            results.push([{ type: "koutsu", tiles: [first, first, first], open: false }, ...s]);
        }
    }

    // 2. 順子 (first, first+1, first+2)
    const suit = getTileSuit(first);
    if (suit !== 'z') {
        const val = getTileValue(first);
        const second = suit + (val + 1);
        const third = suit + (val + 2);
        if (tiles.includes(second) && tiles.includes(third)) {
            const remaining = [...tiles];
            removeTile(remaining, first);
            removeTile(remaining, second);
            removeTile(remaining, third);
            const sub = findMelds(remaining, needed - 1);
            for (const s of sub) {
                results.push([{ type: "shuntsu", tiles: [first, second, third], open: false }, ...s]);
            }
        }
    }

    return results;
}

/**
 * テンパイ判定と待ち牌（アガリ牌）の取得
 */
function getMachi(hand, melds = []) {
    if (hand.length + melds.length * 3 !== 13) return [];

    const machi = [];
    // すべての種類の牌を1枚ずつ追加して、アガリ形になるか検証
    for (const tile of ALL_PAI_TYPES) {
        const tempHand = [...hand, tile];
        if (checkAgari(tempHand, melds)) {
            machi.push(tile);
        }
    }
    return machi;
}

/**
 * ドラ表示牌から実際のドラ牌を特定
 */
function getDoraTile(indicator) {
    const suit = getTileSuit(indicator);
    const val = getTileValue(indicator);

    if (suit === 'z') {
        // 東風の循環: 東z1 -> 南z2 -> 西z3 -> 北z4 -> 東z1
        if (val <= 4) {
            return 'z' + (val === 4 ? 1 : val + 1);
        }
        // 三元牌の循環: 白z5 -> 發z6 -> 中z7 -> 白z5
        return 'z' + (val === 7 ? 5 : val + 1);
    } else {
        // 数牌: 1-9の循環
        return suit + (val === 9 ? 1 : val + 1);
    }
}

/**
 * 役判定と翻数・符の計算
 */
function judgeHand(hand, melds, winTile, isTsumo, context) {
    // context: { isRiichi, isIppatsu, jikaze, bakaze, doraIndicators, uraDoraIndicators, oyaSeat, playerSeat }
    const isMenzen = melds.filter(m => m.open).length === 0;
    const agariResult = checkAgari(hand, melds);
    if (!agariResult) return null;

    // 各アガリパターンについて役を計算し、最も高い役/点数のものを採用する
    let bestResult = { score: 0, han: 0, fu: 0, yaku: [], text: "役なし" };

    for (const pattern of agariResult.patterns) {
        const result = evaluatePattern(pattern, agariResult.type, hand, melds, winTile, isTsumo, isMenzen, context);
        if (result && result.han > 0) {
            // 基本点計算による比較
            const score = calcBaseScore(result.han, result.fu, context.playerSeat === context.oyaSeat, isTsumo);
            if (score.total > bestResult.score) {
                bestResult = {
                    score: score.total,
                    details: score,
                    han: result.han,
                    fu: result.fu,
                    yaku: result.yaku,
                    type: agariResult.type
                };
            }
        }
    }

    return bestResult.score > 0 ? bestResult : null;
}

/**
 * 各分解パターンに対する役判定と符計算
 */
function evaluatePattern(pattern, type, hand, melds, winTile, isTsumo, isMenzen, context) {
    const yakuList = [];
    let hanSum = 0;
    let isYakuman = false;

    // --- 役満判定 ---
    if (type === "kokushi") {
        yakuList.push({ name: "国士無双", han: 13, yakuman: true });
        isYakuman = true;
    }

    if (!isYakuman) {
        // 四暗刻
        let ankouCount = 0;
        if (type === "normal") {
            for (const m of pattern.melds) {
                if (m.type === "koutsu" && !m.open) {
                    // ロンあがりの場合、ロン牌を含む面子は明刻扱いになる（単騎待ちを除く）
                    if (isTsumo) {
                        ankouCount++;
                    } else {
                        // ロン牌がこの刻子に含まれる場合、明刻とする
                        const normWin = normalizeTile(winTile);
                        if (m.tiles.includes(normWin) && pattern.eye !== normWin) {
                            // 明刻
                        } else {
                            ankouCount++;
                        }
                    }
                }
            }
            if (ankouCount === 4) {
                yakuList.push({ name: "四暗刻", han: 13, yakuman: true });
                isYakuman = true;
            }
        }
    }

    if (!isYakuman && type === "normal") {
        // 大三元
        let sangenCount = 0;
        for (const m of pattern.melds) {
            if (m.type === "koutsu" && (m.tiles[0] === "z5" || m.tiles[0] === "z6" || m.tiles[0] === "z7")) {
                sangenCount++;
            }
        }
        if (sangenCount === 3) {
            yakuList.push({ name: "大三元", han: 13, yakuman: true });
            isYakuman = true;
        }
    }

    if (!isYakuman) {
        // 字一色
        const allTiles = [...hand, winTile].map(normalizeTile);
        if (allTiles.every(t => getTileSuit(t) === 'z')) {
            yakuList.push({ name: "字一色", han: 13, yakuman: true });
            isYakuman = true;
        }
    }

    if (isYakuman) {
        return { han: 13, fu: 0, yaku: yakuList };
    }

    // --- 通常役判定 ---
    // 1. 立直 / ダブル立直
    if (context.isRiichi === 2) {
        yakuList.push({ name: "ダブル立直", han: 2 });
        hanSum += 2;
    } else if (context.isRiichi === 1) {
        yakuList.push({ name: "立直", han: 1 });
        hanSum += 1;
    }

    // 2. 一発
    if (context.isRiichi && context.isIppatsu) {
        yakuList.push({ name: "一発", han: 1 });
        hanSum += 1;
    }

    // 3. 門前清自摸和
    if (isTsumo && isMenzen) {
        yakuList.push({ name: "門前清自摸和", han: 1 });
        hanSum += 1;
    }

    // 4. 断幺九 (クイタンあり)
    const normAllTiles = [...hand, winTile].map(normalizeTile);
    const hasYaochuu = normAllTiles.some(t => {
        const val = getTileValue(t);
        return getTileSuit(t) === 'z' || val === 1 || val === 9;
    });
    if (!hasYaochuu) {
        yakuList.push({ name: "断幺九", han: 1 });
        hanSum += 1;
    }

    // 5. 役牌 (白、發、中、場風、自風)
    const bakazeTile = 'z' + context.bakaze; // 1:東, 2:南
    const jikazeTile = 'z' + context.jikaze; // 自風
    if (type === "normal") {
        for (const m of pattern.melds) {
            if (m.type === "koutsu") {
                const tile = m.tiles[0];
                if (tile === "z5") { yakuList.push({ name: "役牌 白", han: 1 }); hanSum += 1; }
                if (tile === "z6") { yakuList.push({ name: "役牌 發", han: 1 }); hanSum += 1; }
                if (tile === "z7") { yakuList.push({ name: "役牌 中", han: 1 }); hanSum += 1; }
                if (tile === bakazeTile) { yakuList.push({ name: "場風 " + getWindName(context.bakaze), han: 1 }); hanSum += 1; }
                if (tile === jikazeTile) { yakuList.push({ name: "自風 " + getWindName(context.jikaze), han: 1 }); hanSum += 1; }
            }
        }
    }

    // 6. 七対子
    if (type === "chiitoitsu") {
        yakuList.push({ name: "七対子", han: 2 });
        hanSum += 2;
    }

    // 7. 対々和
    if (type === "normal") {
        const koutsuCount = pattern.melds.filter(m => m.type === "koutsu").length;
        if (koutsuCount === 4) {
            yakuList.push({ name: "対々和", han: 2 });
            hanSum += 2;
        }
    }

    // 8. 平和 (ピンフ) - 門前のみ
    let isPinfu = false;
    let machiType = ""; // 符計算用に待ちを判定する
    if (isMenzen && type === "normal") {
        const isAllShuntsu = pattern.melds.every(m => m.type === "shuntsu");
        const eyeSuit = getTileSuit(pattern.eye);
        // 雀頭が役牌以外
        const isEyeYaku = pattern.eye === "z5" || pattern.eye === "z6" || pattern.eye === "z7" || pattern.eye === bakazeTile || pattern.eye === jikazeTile;
        
        if (isAllShuntsu && !isEyeYaku) {
            // 両面待ちチェック：和了牌がいずれかの順子の両端の待ちになっているか
            let hasRyangmen = false;
            const normWin = normalizeTile(winTile);
            for (const m of pattern.melds) {
                const t0 = m.tiles[0];
                const val0 = getTileValue(t0);
                const suit = getTileSuit(t0);
                if (suit === getTileSuit(normWin)) {
                    // 順子 [val0, val0+1, val0+2] に対して、和了牌が端
                    if (val0 === getTileValue(normWin)) {
                        // 345の3待ち(2-5両面) のように両端に伸ばせるか？
                        // 123の1待ち(辺張待ち)は除外
                        if (val0 !== 1) hasRyangmen = true;
                    } else if (getTileValue(normWin) === val0 + 2) {
                        // 789の9待ち(辺張待ち)は除外
                        if (val0 !== 7) hasRyangmen = true;
                    }
                }
            }
            if (hasRyangmen) {
                isPinfu = true;
                yakuList.push({ name: "平和", han: 1 });
                hanSum += 1;
            }
        }
    }

    // 9. 一盃口 - 門前のみ
    if (isMenzen && type === "normal") {
        const shuntsuList = pattern.melds.filter(m => m.type === "shuntsu").map(m => m.tiles.join(","));
        let iipeikouCount = 0;
        const seen = new Set();
        for (const s of shuntsuList) {
            if (seen.has(s)) {
                iipeikouCount++;
            }
            seen.add(s);
        }
        if (iipeikouCount >= 1) {
            yakuList.push({ name: "一盃口", han: 1 });
            hanSum += 1;
        }
    }

    // 10. 三色同順
    if (type === "normal") {
        // 各スートの順子開始数字をリストアップ
        const mShuntsu = new Set();
        const pShuntsu = new Set();
        const sShuntsu = new Set();
        for (const m of pattern.melds) {
            if (m.type === "shuntsu") {
                const suit = getTileSuit(m.tiles[0]);
                const val = getTileValue(m.tiles[0]);
                if (suit === 'm') mShuntsu.add(val);
                if (suit === 'p') pShuntsu.add(val);
                if (suit === 's') sShuntsu.add(val);
            }
        }
        let hasSanshoku = false;
        for (const val of mShuntsu) {
            if (pShuntsu.has(val) && sShuntsu.has(val)) {
                hasSanshoku = true;
                break;
            }
        }
        if (hasSanshoku) {
            const han = isMenzen ? 2 : 1;
            yakuList.push({ name: "三色同順", han: han });
            hanSum += han;
        }
    }

    // 11. 一気通貫
    if (type === "normal") {
        const suits = ['m', 'p', 's'];
        let hasItts = false;
        for (const suit of suits) {
            const shuntsuVals = pattern.melds
                .filter(m => m.type === "shuntsu" && getTileSuit(m.tiles[0]) === suit)
                .map(m => getTileValue(m.tiles[0]));
            if (shuntsuVals.includes(1) && shuntsuVals.includes(4) && shuntsuVals.includes(7)) {
                hasItts = true;
                break;
            }
        }
        if (hasItts) {
            const han = isMenzen ? 2 : 1;
            yakuList.push({ name: "一気通貫", han: han });
            hanSum += han;
        }
    }

    // 12. 混一色 (ホンイツ)
    const allSuits = new Set(normAllTiles.map(getTileSuit));
    const hasZ = allSuits.has('z');
    allSuits.delete('z');
    if (allSuits.size === 1 && hasZ) {
        const han = isMenzen ? 3 : 2;
        yakuList.push({ name: "混一色", han: han });
        hanSum += han;
    }

    // 13. 清一色 (チンイツ)
    if (allSuits.size === 1 && !hasZ) {
        const han = isMenzen ? 6 : 5;
        yakuList.push({ name: "清一色", han: han });
        hanSum += han;
    }

    // アガリ役が無い場合は、ドラがあってもアガれない
    if (hanSum === 0) {
        return null;
    }

    // --- ドラ・赤ドラの加算 ---
    let doraCount = 0;
    const doraTiles = (context.doraIndicators || []).map(getDoraTile);
    const uraDoraTiles = context.isRiichi ? (context.uraDoraIndicators || []).map(getDoraTile) : [];

    for (const t of [...hand, winTile]) {
        const norm = normalizeTile(t);
        // 通常ドラ
        doraCount += doraTiles.filter(dt => dt === norm).length;
        // 裏ドラ
        doraCount += uraDoraTiles.filter(dt => dt === norm).length;
        // 赤ドラ
        if (isRedTile(t)) {
            doraCount++;
        }
    }

    if (doraCount > 0) {
        yakuList.push({ name: `ドラ / 赤ドラ`, han: doraCount });
        hanSum += doraCount;
    }

    // --- 符の計算 ---
    let fu = 20; // 基本符
    if (type === "chiitoitsu") {
        fu = 25; // 七対子固定
    } else {
        // 1. ツモ/ロンの基本符
        if (isTsumo) {
            if (isPinfu) {
                fu = 20; // 平和ツモは20符
            } else {
                fu = 30; // 通常ツモは30符（切り上げ前基本）
            }
        } else {
            // ロン
            if (isMenzen) {
                fu = 30; // 門前ロンは30符
            } else {
                fu = 30; // 食いロンは30符
            }
        }

        // 2. 面子の符
        for (const m of pattern.melds) {
            if (m.type === "koutsu") {
                const baseVal = getTileValue(m.tiles[0]);
                const isYao = getTileSuit(m.tiles[0]) === 'z' || baseVal === 1 || baseVal === 9;
                
                // ロンあがりのロン牌を含む刻子は明刻扱い
                let isMinko = m.open;
                if (!isTsumo && !m.open) {
                    const normWin = normalizeTile(winTile);
                    if (m.tiles.includes(normWin) && pattern.eye !== normWin) {
                        isMinko = true;
                    }
                }

                if (isMinko) {
                    fu += isYao ? 4 : 2;
                } else {
                    fu += isYao ? 8 : 4;
                }
            }
        }

        // 3. 雀頭の符
        const eyeTile = pattern.eye;
        const isEyeYaku = eyeTile === "z5" || eyeTile === "z6" || eyeTile === "z7" || eyeTile === bakazeTile || eyeTile === jikazeTile;
        if (isEyeYaku) {
            fu += 2;
            if (eyeTile === bakazeTile && eyeTile === jikazeTile) {
                fu += 2; // ダブル東などダブル役牌雀頭は+4符
            }
        }

        // 4. 待ちの符
        // 待ち判定：単騎、嵌張、辺張は+2符、両面・双碰は0符
        machiType = judgeMachiType(pattern, winTile, isTsumo);
        if (machiType === "tanki" || machiType === "kanchan" || machiType === "penchan") {
            fu += 2;
        }

        // 符の端数切り上げ（10の位）
        if (fu > 20 && fu % 10 !== 0) {
            fu = Math.ceil(fu / 10) * 10;
        }
    }

    return { han: hanSum, fu: fu, yaku: yakuList };
}

/**
 * 待ちの種類を判定する
 */
function judgeMachiType(pattern, winTile, isTsumo) {
    const normWin = normalizeTile(winTile);
    // 1. 単騎待ち: 雀頭がアガリ牌
    if (pattern.eye === normWin) {
        return "tanki";
    }

    // 2. 双碰待ち: 刻子のいずれかがアガリ牌かつ、その刻子がロン/ツモで完成した
    // 4面子のうち、アガリ牌を含む刻子があり、それが暗刻である場合（ツモまたはロン）
    let hasShabo = false;
    for (const m of pattern.melds) {
        if (m.type === "koutsu" && m.tiles[0] === normWin) {
            // 刻子で待っていた（手元に2枚あって3枚目が来た）
            hasShabo = true;
        }
    }
    if (hasShabo) {
        return "shabo";
    }

    // 順子待ちの分類
    for (const m of pattern.melds) {
        if (m.type === "shuntsu") {
            const t0 = m.tiles[0];
            const val0 = getTileValue(t0);
            const suit = getTileSuit(t0);
            if (suit === getTileSuit(normWin)) {
                const winVal = getTileValue(normWin);
                // 嵌張待ち: 順子の真ん中 (例: 4-5-6 の 5)
                if (winVal === val0 + 1) {
                    return "kanchan";
                }
                // 辺張待ち: 1-2-3 の 3 または 7-8-9 の 7
                if (winVal === 3 && val0 === 1) {
                    return "penchan";
                }
                if (winVal === 7 && val0 === 7) {
                    return "penchan";
                }
            }
        }
    }

    return "ryangmen";
}

function getWindName(windVal) {
    // 1:東, 2:南, 3:西, 4:北
    return ["", "東", "南", "西", "北"][windVal] || "";
}

/**
 * 基本点数計算 (符と翻から)
 */
function calcBaseScore(han, fu, isOya, isTsumo) {
    let base = 0;
    let limitName = "";

    if (han >= 13) {
        base = 8000; // 役満
        limitName = "役満";
    } else if (han >= 11) {
        base = 6000; // 三倍満
        limitName = "三倍満";
    } else if (han >= 8) {
        base = 4000; // 倍満
        limitName = "倍満";
    } else if (han >= 6) {
        base = 3000; // 跳満
        limitName = "跳満";
    } else if (han >= 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 60)) {
        base = 2000; // 満貫
        limitName = "満貫";
    } else {
        // 通常計算: base = fu * 2^(han + 2)
        base = fu * Math.pow(2, han + 2);
        if (base > 2000) {
            base = 2000; // 満貫切り上げ
            limitName = "満貫";
        }
    }

    let text = "";
    let total = 0;
    let pay = {}; // ロンなら1人、ツモなら親/子に応じた支払い額

    if (isTsumo) {
        if (isOya) {
            // 親のツモ：子3人からそれぞれ 2*base
            const each = ceil100(base * 2);
            total = each * 3;
            pay = { child: each };
            text = `${each}点オール`;
        } else {
            // 子のツモ：親から 2*base、他の子から base
            const oyaPay = ceil100(base * 2);
            const childPay = ceil100(base);
            total = oyaPay + childPay * 2;
            pay = { oya: oyaPay, child: childPay };
            text = `${childPay} / ${oyaPay}点`;
        }
    } else {
        // ロン
        if (isOya) {
            // 親のロン: 6 * base
            total = ceil100(base * 6);
            pay = { main: total };
            text = `${total}点`;
        } else {
            // 子のロン: 4 * base
            total = ceil100(base * 4);
            pay = { main: total };
            text = `${total}点`;
        }
    }

    return {
        total: total,
        pay: pay,
        text: text,
        han: han,
        fu: fu,
        limitName: limitName
    };
}

function ceil100(val) {
    return Math.ceil(val / 100) * 100;
}

/**
 * COM（AI）の打牌意思決定
 * 最も不要な牌を1枚選んで捨てる
 */
function comDecideDiscard(hand) {
    if (hand.length === 0) return null;

    // テンパイしていて、アガリ牌を待つ場合は、テンパイを維持するように打牌する
    // ここでは、手牌14枚から1枚抜いたときに、残りの13枚の待ち（シャンテン数）が最も良くなる牌を選ぶ
    let bestDiscard = hand[0];
    let bestScore = -99999;

    for (let i = 0; i < hand.length; i++) {
        const candidateDiscard = hand[i];
        const tempHand = [...hand];
        tempHand.splice(i, 1); // 1枚捨てる

        const score = evaluateHandStrength(tempHand);
        if (score > bestScore) {
            bestScore = score;
            bestDiscard = candidateDiscard;
        }
    }

    return bestDiscard;
}

/**
 * 手牌(13枚)の手作り評価スコアを計算する簡易関数
 */
function evaluateHandStrength(hand13) {
    const normHand = hand13.map(normalizeTile).sort(compareTiles);
    
    // 刻子、順子、対子、搭子を簡易的に検出し点数化する
    let score = 0;
    
    // 各牌のカウンタ
    const counts = {};
    for (const t of normHand) {
        counts[t] = (counts[t] || 0) + 1;
    }

    // 1. 刻子 (3枚) ＆ 対子 (2枚) 判定
    for (const t in counts) {
        if (counts[t] === 3) {
            score += 15; // 刻子は強い
        } else if (counts[t] === 2) {
            score += 6;  // 対子
        }
    }

    // 2. 順子 (3連続) ＆ 塔子 (2連続、または1つ飛ばし)
    // 萬子、筒子、索子のスートごとに処理
    const suits = ['m', 'p', 's'];
    for (const suit of suits) {
        // そのスートの数字の存在リスト
        const vals = normHand.filter(t => getTileSuit(t) === suit).map(getTileValue);
        const uniqueVals = [...new Set(vals)].sort((a,b)=>a-b);

        // 順子(3連続)の簡易評価
        for (let i = 0; i < uniqueVals.length - 2; i++) {
            if (uniqueVals[i+1] === uniqueVals[i] + 1 && uniqueVals[i+2] === uniqueVals[i] + 2) {
                score += 12; // 順子完成
            }
        }

        // 塔子(2連続: 両面・辺張、または1つ飛ばし: 嵌張)の簡易評価
        for (let i = 0; i < uniqueVals.length - 1; i++) {
            const diff = uniqueVals[i+1] - uniqueVals[i];
            if (diff === 1) {
                score += 4; // 2連続 (両面/辺張チャンス)
            } else if (diff === 2) {
                score += 2; // 1つ飛ばし (嵌張チャンス)
            }
        }
    }

    // 3. 孤立牌のペナルティ
    for (const t of normHand) {
        const suit = getTileSuit(t);
        const val = getTileValue(t);

        if (suit === 'z') {
            // 字牌の孤立
            if (counts[t] === 1) {
                // 役牌（白発中）は少し残す
                if (t === "z5" || t === "z6" || t === "z7") {
                    score += 0.5;
                } else {
                    score -= 2; // 風牌の孤立は最優先で捨てる
                }
            }
        } else {
            // 数牌の孤立
            // 周囲の牌 (val-1, val+1, val-2, val+2) が存在するかチェック
            const hasNeighbor = normHand.some(other => {
                return getTileSuit(other) === suit && 
                       other !== t && 
                       Math.abs(getTileValue(other) - val) <= 2;
            });

            if (!hasNeighbor && counts[t] === 1) {
                // 完全に孤立している
                if (val === 1 || val === 9) {
                    score -= 1.5; // 1,9の孤立牌は捨てる
                } else if (val === 2 || val === 8) {
                    score -= 1.0; // 2,8の孤立牌
                } else {
                    score -= 0.5; // 3-7の孤立牌
                }
            }
        }
    }

    return score;
}

// ブラウザとNode両方で動作するようにモジュールエクスポート
const MahjongEngine = {
    compareTiles,
    sortHand,
    createWall,
    normalizeTile,
    isRedTile,
    getTileSuit,
    getTileValue,
    getTileCount,
    removeTile,
    checkAgari,
    getMachi,
    getDoraTile,
    judgeHand,
    calcBaseScore,
    comDecideDiscard
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MahjongEngine;
} else {
    window.MahjongEngine = MahjongEngine;
}
