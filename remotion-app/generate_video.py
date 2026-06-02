import os
import sys
import json
import subprocess
import shutil
from PIL import Image, ImageDraw, ImageFont

# パスの設定
cwd = "c:/Users/user/Antigravity/remotion-app"
public_dir = os.path.join(cwd, "public")
src_dir = os.path.join(cwd, "src")
temp_dir = os.path.join(cwd, "temp_rendering")

os.makedirs(temp_dir, exist_ok=True)
remotion_cli = os.path.abspath(os.path.join(cwd, "node_modules", "@remotion", "cli", "remotion-cli.js"))

# 1. データのロード
json_path = os.path.join(src_dir, "mangaData.json")
if not os.path.exists(json_path):
    print(f"Error: {json_path} does not exist. Run voice generation first.")
    sys.exit(1)

with open(json_path, "r", encoding="utf-8") as f:
    manga_data = json.load(f)

# 2. フォントの選択 (Windows環境)
font_candidates_serif = [
    "C:/Windows/Fonts/yumin.ttf",
    "C:/Windows/Fonts/yumin.ttc",
    "C:/Windows/Fonts/msmincho.ttc",
    "C:/Windows/Fonts/msgothic.ttc"
]
font_candidates_sans = [
    "C:/Windows/Fonts/meiryo.ttc",
    "C:/Windows/Fonts/msjh.ttc",
    "C:/Windows/Fonts/msui.ttf"
]

font_path_serif = None
for path in font_candidates_serif:
    if os.path.exists(path):
        font_path_serif = path
        break

font_path_sans = None
for path in font_candidates_sans:
    if os.path.exists(path):
        font_path_sans = path
        break

print(f"Using Serif Font: {font_path_serif}")
print(f"Using Sans Font: {font_path_sans}")

# テキスト折り返し関数
def wrap_text(text, font, max_width, draw):
    words = list(text) # 日本語なので文字単位で分割
    lines = []
    current_line = []
    
    for word in words:
        current_line.append(word)
        # 現在の行の幅を取得
        line_text = "".join(current_line)
        bbox = draw.textbbox((0, 0), line_text, font=font)
        width = bbox[2] - bbox[0]
        
        if width > max_width:
            current_line.pop()
            lines.append("".join(current_line))
            current_line = [word]
            
    if current_line:
        lines.append("".join(current_line))
    return lines

# 3. 各ステップの一時画像生成
print("Generating annotated images with subtitles...")
for i, step in enumerate(manga_data):
    # 背景画像の読み込みと1080pへのリサイズ
    orig_img_path = os.path.join(public_dir, step["image"])
    if not os.path.exists(orig_img_path):
        print(f"Warning: Image {orig_img_path} not found. Creating placeholder.")
        img = Image.new("RGB", (1920, 1080), (15, 16, 19))
    else:
        img = Image.open(orig_img_path).convert("RGBA")
        img = img.resize((1920, 1080), Image.Resampling.LANCZOS)
    
    # 描画用のレイヤー
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # フォントサイズ設定
    font_size_narration = 48
    font_size_dialogue = 44
    font_size_speaker = 28
    font_size_stage = 32
    
    font_narration = ImageFont.truetype(font_path_serif, font_size_narration) if font_path_serif else ImageFont.load_default()
    font_dialogue = ImageFont.truetype(font_path_serif, font_size_dialogue) if font_path_serif else ImageFont.load_default()
    font_speaker = ImageFont.truetype(font_path_sans, font_size_speaker) if font_path_sans else ImageFont.load_default()
    font_stage = ImageFont.truetype(font_path_serif, font_size_stage) if font_path_serif else ImageFont.load_default()

    # A. ナレーション（画面中央に半透明黒背景とテキスト）
    if step["narration"]:
        # 画面全体に半透明の黒を被せる
        draw.rectangle([(0, 0), (1920, 1080)], fill=(0, 0, 0, 160))
        
        # テキストの折り返しと描画
        wrapped_lines = wrap_text(step["narration"], font_narration, 1400, draw)
        
        # 中央寄せで描画
        total_height = len(wrapped_lines) * (font_size_narration + 15)
        start_y = (1080 - total_height) // 2
        
        for j, line in enumerate(wrapped_lines):
            line_bbox = draw.textbbox((0, 0), line, font=font_narration)
            line_width = line_bbox[2] - line_bbox[0]
            x = (1920 - line_width) // 2
            y = start_y + j * (font_size_narration + 15)
            # 文字影
            draw.text((x+2, y+2), line, font=font_narration, fill=(0, 0, 0, 255))
            draw.text((x, y), line, font=font_narration, fill=(243, 244, 246, 255))
            
    # B. セリフ（画面下部に半透明黒帯とテキスト）
    elif step["dialogue"]:
        # 下部280pxの半透明黒帯
        draw.rectangle([(0, 800), (1920, 1080)], fill=(0, 0, 0, 200))
        
        y_offset = 830
        
        # 話者名タグの描画
        if step["speaker"]:
            speaker_text = step["speaker"]
            # テキストサイズ取得
            spk_bbox = draw.textbbox((0, 0), speaker_text, font=font_speaker)
            spk_width = spk_bbox[2] - spk_bbox[0]
            spk_height = spk_bbox[3] - spk_bbox[1]
            
            # タグの背景枠
            tag_x1, tag_y1 = 100, y_offset
            tag_x2, tag_y2 = tag_x1 + spk_width + 30, tag_y1 + spk_height + 15
            
            draw.rounded_rectangle([tag_x1, tag_y1, tag_x2, tag_y2], radius=6, fill=(205, 168, 105, 30), outline=(205, 168, 105, 255), width=1)
            draw.text((tag_x1 + 15, tag_y1 + 6), speaker_text, font=font_speaker, fill=(205, 168, 105, 255))
            
            # セリフは話者名の右隣に配置（100px間隔）
            dialogue_x = tag_x2 + 40
        else:
            dialogue_x = 100
            
        # セリフとト書きの描画
        dialogue_y = y_offset - 5
        wrapped_lines = wrap_text(step["dialogue"], font_dialogue, 1920 - dialogue_x - 100, draw)
        
        for line in wrapped_lines:
            # 影付き描画
            draw.text((dialogue_x+2, dialogue_y+2), line, font=font_dialogue, fill=(0, 0, 0, 255))
            draw.text((dialogue_x, dialogue_y), line, font=font_dialogue, fill=(255, 255, 255, 255))
            dialogue_y += font_size_dialogue + 10
            
        # ト書き（セリフの下部）
        if step["stage"]:
            stage_text = step["stage"]
            draw.text((dialogue_x+2, dialogue_y+2), stage_text, font=font_stage, fill=(0, 0, 0, 255))
            draw.text((dialogue_x, dialogue_y), stage_text, font=font_stage, fill=(156, 163, 175, 255))

    # 画像の合成と保存
    final_img = Image.alpha_composite(img, overlay)
    temp_img_path = os.path.join(temp_dir, f"temp_{i}.png")
    final_img.convert("RGB").save(temp_img_path, "JPEG", quality=90)

# 4. 各ステップ動画のFFmpegによる個別合成
print("Rendering individual scene clips...")
clip_paths = []
for i, step in enumerate(manga_data):
    temp_img_path = os.path.join(temp_dir, f"temp_{i}.png")
    audio_filename = f"step_{i}.mp3"
    audio_path = os.path.join(public_dir, "audio", audio_filename)
    clip_output_path = os.path.join(temp_dir, f"clip_{i}.mp4")
    
    # FFmpegコマンドの組み立て
    # 静止画と音声を結合する
    cmd = [
        "node", remotion_cli, "ffmpeg",
        "-loop", "1", "-i", temp_img_path
    ]
    
    if step["audioUrl"] and os.path.exists(audio_path):
        cmd.extend(["-i", audio_path])
        # 音声の長さに合わせて動画を終わらせる
        cmd.extend([
            "-c:v", "libx264", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p", "-shortest", "-y", clip_output_path
        ])
    else:
        # 音声がない場合は指定した秒数（デフォルト2秒）の動画を作る
        duration = step["duration"] if step["duration"] else 2.0
        cmd.extend([
            "-t", str(duration),
            "-c:v", "libx264", "-tune", "stillimage",
            "-pix_fmt", "yuv420p", "-y", clip_output_path
        ])
        
    print(f"Generating clip {i}: {clip_output_path} (dur: {step['duration']}s)")
    
    # 実行
    res = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if res.returncode != 0:
        print(f"Error rendering clip {i}: {res.stderr}")
        sys.exit(1)
        
    clip_paths.append(clip_output_path)

# 5. 動画の連結リストファイル生成
list_file_path = os.path.join(temp_dir, "clips.txt")
with open(list_file_path, "w", encoding="utf-8") as f:
    for path in clip_paths:
        # Windowsのバックスラッシュをスラッシュに変換
        normalized_path = path.replace("\\", "/")
        f.write(f"file '{normalized_path}'\n")

# 6. 動画の連結実行 (Concat)
final_output_path = "c:/Users/user/Antigravity/manga_video.mp4"
print(f"Concatenating all clips into final video: {final_output_path}...")
concat_cmd = [
    "node", remotion_cli, "ffmpeg",
    "-f", "concat", "-safe", "0", "-i", list_file_path,
    "-c", "copy", "-y", final_output_path
]

res = subprocess.run(concat_cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
if res.returncode != 0:
    print(f"Error concatenating clips: {res.stderr}")
    sys.exit(1)

print("Video generation successfully completed!")

# 7. 一時ファイルのクリーンアップ
print("Cleaning up temporary rendering directory...")
try:
    shutil.rmtree(temp_dir)
    print("Cleanup successful.")
except Exception as e:
    print(f"Warning: Cleanup failed: {e}")
