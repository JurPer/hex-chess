
/**
 * URLs for the sound effects.
 *
 * @type {{ move: URL; capture: URL; }}
 */
const urls = {
  move: new URL('./assets/sfx/move.mp3', import.meta.url).href,
  capture: new URL('./assets/sfx/capture.mp3', import.meta.url).href,
  //place: new URL('./assets/sfx/place.mp3', import.meta.url).href,
  //promote: new URL('./assets/sfx/promote.mp3', import.meta.url).href,
};

class SFX {
  constructor(map) {
    this.players = {};
    this.enabled = true;
    this.unlocked = false;
    for (const key of Object.keys(map)) {
      const audio = new Audio(map[key]);
      audio.preload = 'auto';
      audio.volume = 0.6;
      this.players[key] = audio;
    }
  }

  play(name) {
    if (!this.enabled) return;
    const audio = this.players[name];
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play();
    } catch { /* empty */ }
  }

  setEnabled(enable) { this.enabled = enable; }

  /**
  * Sets the volume
  *
  * @param {number} v between 0 and 1
  */
  setVolume(v) { Object.values(this.players).forEach(a => (a.volume = v)); }

  /** call once after any user click to satisfy autoplay policies */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    for (const audio of Object.values(this.players)) {
      try {
        audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => { /* empty */ });
      } catch { /* empty */ }
    }
  }
}

export const sfx = new SFX(urls);

/**
 * Decide which sound to use based on the `moveString`
 *
 * @export
 * @param {string} moveString 
 * @returns {("move" | "capture")} 
 */
export function soundForMove(moveString) {
  if (!moveString) return 'move';
  if (moveString.includes('S:')) return 'move';
  if (moveString.includes('x')) return 'capture';
  //if (moveString.includes('=Q')) return 'promote';
  return 'move';
}
