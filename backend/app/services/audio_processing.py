import numpy as np
from typing import Optional

def bytes_to_float32(raw_bytes: bytes, dtype: str = "int16") -> np.ndarray:
    """
    Converts raw binary audio bytes to float32 numpy array normalized to [-1.0, 1.0].
    Default input format is 16-bit signed PCM little-endian.
    Also supports 32-bit float PCM.
    """
    if not raw_bytes:
        return np.zeros(0, dtype=np.float32)

    if dtype == "int16":
        # 16-bit signed PCM
        int16_arr = np.frombuffer(raw_bytes, dtype=np.int16)
        float32_arr = int16_arr.astype(np.float32) / 32768.0
        return float32_arr
    elif dtype == "float32":
        # 32-bit float PCM
        return np.frombuffer(raw_bytes, dtype=np.float32).copy()
    else:
        raise ValueError(f"Unsupported audio dtype: {dtype}")

def float32_to_int16_bytes(audio: np.ndarray) -> bytes:
    """
    Converts float32 audio numpy array to 16-bit PCM bytes.
    """
    clipped = np.clip(audio, -1.0, 1.0)
    int16_arr = (clipped * 32767.0).astype(np.int16)
    return int16_arr.tobytes()

def compute_rms(audio: np.ndarray) -> float:
    """
    Computes Root Mean Square (RMS) energy of an audio array.
    """
    if len(audio) == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.square(audio))))

def resample_linear(audio: np.ndarray, orig_sr: int, target_sr: int = 16000) -> np.ndarray:
    """
    Fast linear interpolation resampling for when input sample rate differs from 16kHz.
    """
    if orig_sr == target_sr or len(audio) == 0:
        return audio
    duration = len(audio) / orig_sr
    num_target_samples = int(duration * target_sr)
    if num_target_samples == 0:
        return np.zeros(0, dtype=np.float32)
    orig_indices = np.linspace(0, len(audio) - 1, num_target_samples)
    return np.interp(orig_indices, np.arange(len(audio)), audio).astype(np.float32)
