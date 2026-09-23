import math
import os
import random
import struct
import wave
from PIL import Image

# Directories
AUDIO_DIR = os.path.join("assets", "audio")
SPRITES_DIR = os.path.join("assets", "sprites")

os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(SPRITES_DIR, exist_ok=True)

SAMPLE_RATE = 44100


def save_wav(filename, samples, sample_rate=SAMPLE_RATE):
    """Save float samples (-1.0 to 1.0) as 16-bit mono WAV file."""
    path = os.path.join(AUDIO_DIR, filename)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)

        raw_bytes = bytearray()
        for s in samples:
            # Clamp sample to -1.0 .. 1.0
            clamped = max(-1.0, min(1.0, s))
            val = int(clamped * 32767.0)
            raw_bytes.extend(struct.pack("<h", val))

        wf.writeframes(raw_bytes)
    print(f"Generated: {path}")


def generate_se_jump():
    """se_jump.wav: 矩形波の上昇スウィープ（150Hz → 600Hz, 0.15秒）"""
    duration = 0.15
    num_samples = int(SAMPLE_RATE * duration)
    f_start = 150.0
    f_end = 600.0

    samples = []
    phase = 0.0

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        progress = t / duration
        f = f_start + (f_end - f_start) * progress

        phase += 2.0 * math.pi * f / SAMPLE_RATE

        # Square wave
        val = 0.5 if (phase % (2.0 * math.pi)) < math.pi else -0.5

        # Envelope (slight fade out at the very end to avoid click)
        env = 1.0
        if progress > 0.8:
            env = (1.0 - progress) / 0.2

        samples.append(val * env)

    save_wav("se_jump.wav", samples)


def generate_se_coin():
    """se_coin.wav: 高音2段階トーン（987Hz 0.08秒 → 1318Hz 0.25秒）"""
    t1_duration = 0.08
    t2_duration = 0.25
    total_duration = t1_duration + t2_duration
    num_samples = int(SAMPLE_RATE * total_duration)

    samples = []
    phase = 0.0

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        if t < t1_duration:
            f = 987.0
            env = 0.6
        else:
            f = 1318.0
            t_in_t2 = t - t1_duration
            env = 0.6 * (1.0 - t_in_t2 / t2_duration)

        phase += 2.0 * math.pi * f / SAMPLE_RATE

        # Square wave
        val = 0.5 if (phase % (2.0 * math.pi)) < math.pi else -0.5

        samples.append(val * env)

    save_wav("se_coin.wav", samples)


def generate_se_explosion():
    """se_explosion.wav: 低域通過フィルター付き擬似乱数ノイズの減衰（0.3秒）"""
    duration = 0.3
    num_samples = int(SAMPLE_RATE * duration)

    samples = []
    last_sample = 0.0
    alpha = 0.15  # Low-pass filter coefficient

    random.seed(42)  # Deterministic seed

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        progress = t / duration

        # Exponential decay envelope
        env = (1.0 - progress) ** 2.0

        # White noise
        noise = random.uniform(-1.0, 1.0)

        # Low-pass filter
        filtered = alpha * noise + (1.0 - alpha) * last_sample
        last_sample = filtered

        samples.append(filtered * env * 0.8)

    save_wav("se_explosion.wav", samples)


def create_sprite_image(filename, grid_data, color_map, scale=4):
    """
    grid_data: 16x16 grid of characters representing color keys
    color_map: dict mapping char to RGBA tuple
    scale: scale factor (16x16 * 4 = 64x64)
    """
    width, height = 16, 16
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    for y in range(height):
        for x in range(width):
            char = grid_data[y][x]
            color = color_map.get(char, (0, 0, 0, 0))
            img.putpixel((x, y), color)

    # Scale up using Nearest Neighbor
    scaled_img = img.resize((width * scale, height * scale), Image.NEAREST)
    path = os.path.join(SPRITES_DIR, filename)
    scaled_img.save(path)
    print(f"Generated: {path}")


def generate_sprites():
    # Hero Grid (16x16)
    # Palette: . = transparent, K = Black/Outline, H = Hair (Brown), S = Skin, B = Armor/Shirt (Blue), R = Boots/Details (Red), W = White/Eye
    hero_colors = {
        ".": (0, 0, 0, 0),
        "K": (20, 20, 20, 255),
        "H": (100, 50, 20, 255),
        "S": (255, 205, 160, 255),
        "B": (30, 100, 220, 255),
        "R": (200, 40, 40, 255),
        "W": (255, 255, 255, 255),
        "Y": (240, 200, 40, 255),
    }

    hero_art = [
        "................",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "....HHHHHHHH....",
        "....HHSSSSHH....",
        "....HWSWWSWH....",
        "....SSSSSSSS....",
        ".....SSSSSS.....",
        "....KBBBBBBK....",
        "...KBBBBBBBBK...",
        "...KBBBYYBBBK...",
        "...KBBBKKBBBK...",
        "....KRRRRRRK....",
        "....KRR..RRK....",
        "....KK....KK....",
        "................",
    ]

    # Slime Grid (16x16)
    # Palette: . = transparent, K = Dark Green Outline, G = Green Body, L = Light Green Highlight, W = White Eye, P = Pupil
    slime_colors = {
        ".": (0, 0, 0, 0),
        "K": (10, 60, 20, 255),
        "G": (40, 180, 60, 255),
        "L": (120, 230, 100, 255),
        "W": (255, 255, 255, 255),
        "P": (0, 0, 0, 255),
    }

    slime_art = [
        "................",
        "................",
        "................",
        "......KKKK......",
        "....KKGGGGKK....",
        "...KGGLLGGGGK...",
        "..KGGLLLLGGGGK..",
        "..KGGWWGGWWGGK..",
        ".KGGGWPGGWPGGGK.",
        ".KGGGGGGGGGGGGK.",
        ".KGGGGGGGGGGGGK.",
        ".KGGGGGGGGGGGGK.",
        ".KGGGGGGGGGGGGK.",
        "..KKGGGGGGGGKK..",
        "...KKKKKKKKKK...",
        "................",
    ]

    # Coin Grid (16x16)
    # Palette: . = transparent, K = Dark Gold/Outline, Y = Yellow, L = Light Yellow, W = White shine
    coin_colors = {
        ".": (0, 0, 0, 0),
        "K": (160, 110, 10, 255),
        "Y": (240, 190, 20, 255),
        "L": (255, 230, 80, 255),
        "W": (255, 255, 220, 255),
    }

    coin_art = [
        "................",
        ".....KKKKKK.....",
        "...KKYYYYYYKK...",
        "..KYYWWYYYYYYK..",
        "..KYYWWYYYYYYK..",
        ".KYYWWYYKKYYYYK.",
        ".KYYWWYYKKYYYYK.",
        ".KYYYYYYKKYYYYK.",
        ".KYYYYYYKKYYYYK.",
        ".KYYYYYYKKYYYYK.",
        ".KYYYYYYKKYYYYK.",
        "..KYYYYYYYYYYK..",
        "..KYYYYYYYYYYK..",
        "...KKYYYYYYKK...",
        ".....KKKKKK.....",
        "................",
    ]

    create_sprite_image("hero.png", hero_art, hero_colors)
    create_sprite_image("slime.png", slime_art, slime_colors)
    create_sprite_image("coin.png", coin_art, coin_colors)


def main():
    print("Generating 8-bit Sound Effects...")
    generate_se_jump()
    generate_se_coin()
    generate_se_explosion()

    print("Generating Retro Pixel Art Sprites...")
    generate_sprites()

    print("Asset generation complete!")


if __name__ == "__main__":
    main()
