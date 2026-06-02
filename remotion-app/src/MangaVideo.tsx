import React from "react";
import {
  Sequence,
  Audio,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig
} from "remotion";
import mangaDataRaw from "./mangaData.json";

// JSONデータの型定義
interface MangaStep {
  episode: number;
  episodeTitle: string;
  image: string;
  speaker: string | null;
  dialogue: string | null;
  stage: string | null;
  narration: string | null;
  audioUrl: string | null;
  duration: number;
}

const mangaData = mangaDataRaw as MangaStep[];

// 各ステップの開始フレームと終了フレームを算出
let currentFrame = 0;
export const stepsWithFrames = mangaData.map((step, index) => {
  const durationFrames = Math.ceil(step.duration * 10); // 10fps換算
  const startFrame = currentFrame;
  const endFrame = currentFrame + durationFrames;
  currentFrame = endFrame;
  return {
    ...step,
    startFrame,
    endFrame,
    durationFrames,
    index
  };
});

export const totalVideoFrames = currentFrame;

// 個別ステップを描画するコンポーネント
const StepComponent: React.FC<{
  step: typeof stepsWithFrames[0];
}> = ({ step }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // フェードイン効果（最初の10フレームで不透明度 0 -> 1）
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  // かすかなズームイン効果（ケン・バーンズ・エフェクト: 1.0 -> 1.04）
  const scale = interpolate(frame, [0, step.durationFrames], [1.0, 1.04], {
    extrapolateRight: "clamp",
  });

  // 字幕の出現アニメーション（springを使用）
  const textTranslateY = spring({
    frame,
    fps,
    config: { damping: 15 },
    from: 20,
    to: 0,
  });

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "#000" }}>
      {/* 1. コマ画像 (16:9) */}
      <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
        <Img
          src={staticFile(step.image)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity,
            transform: `scale(${scale})`,
          }}
        />
      </div>

      {/* 2. 音声アセットの再生 */}
      {step.audioUrl && (
        <Audio src={staticFile(step.audioUrl)} />
      )}

      {/* 3. ナレーション・オーバーレイ（画面中央に表示） */}
      {step.narration && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "80px",
            opacity,
          }}
        >
          <p
            style={{
              fontFamily: "'Shippori Mincho', serif",
              fontSize: "3.5rem",
              lineHeight: "1.8",
              textAlign: "center",
              color: "#f3f4f6",
              maxWidth: "1400px",
              textShadow: "0 4px 15px rgba(0,0,0,0.8)",
              transform: `translateY(${textTranslateY}px)`,
            }}
          >
            {step.narration}
          </p>
        </div>
      )}

      {/* 4. セリフ・ト書き・字幕（画面下部に表示） */}
      {step.dialogue && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)",
            padding: "80px 100px 60px",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            opacity,
          }}
        >
          {/* 話者名（佐藤、鈴木など） */}
          {step.speaker && (
            <div style={{ alignSelf: "flex-start" }}>
              <span
                style={{
                  color: "#cda869",
                  border: "1px solid rgba(205, 168, 105, 0.3)",
                  padding: "4px 18px",
                  borderRadius: "8px",
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  backgroundColor: "rgba(205, 168, 105, 0.08)",
                  fontFamily: "'Outfit', 'Noto Sans JP', sans-serif",
                }}
              >
                {step.speaker}
              </span>
            </div>
          )}

          {/* セリフ・ト書き内容 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p
              style={{
                fontFamily: "'Shippori Mincho', serif",
                fontSize: "2.8rem",
                lineHeight: "1.6",
                color: "#ffffff",
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              }}
            >
              {step.dialogue}
            </p>
            {step.stage && (
              <p
                style={{
                  fontSize: "1.8rem",
                  color: "#9ca3af",
                  fontStyle: "italic",
                  lineHeight: "1.5",
                  textShadow: "0 2px 6px rgba(0,0,0,0.8)",
                }}
              >
                {step.stage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const MangaVideo: React.FC = () => {
  return (
    <div style={{ flex: 1, backgroundColor: "#000" }}>
      {stepsWithFrames.map((step) => (
        <Sequence
          key={step.index}
          start={step.startFrame}
          duration={step.durationFrames}
        >
          <StepComponent step={step} />
        </Sequence>
      ))}
    </div>
  );
};
