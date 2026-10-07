# exec'd by make_meme.py: the music is the trailer's own tune, re-arranged in audio/meme_score.py (128 BPM, 9 bars),
# mixed under the effects. See that file for the arrangement.
import runpy

_score = runpy.run_path(str(ROOT / "audio/meme_score.py"))
_m = _score["MUSIC"]
_n = min(len(_m), N)
out[:_n] += _m[:_n] * 0.75
