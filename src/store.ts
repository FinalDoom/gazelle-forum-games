export type GameState = -1 | boolean;
interface StorableGM {
  /**
   * Api key that has "Forums" permission, stored for this script.
   */
  apiKey: string;
  /**
   * True to show cached state initially prior to updates
   */
  showCached: boolean;
  [threadId: number]: GameState;
}
interface StorableLocalStorage {}
interface Storable extends StorableGM, StorableLocalStorage {}
export default interface Store extends Storable {
  /**
   * Initializes store with default/stored values. Should be called after new instances are made.
   */
  init: () => Promise<void>;
  /**
   * Get a specific game state by thread id
   *
   * @param threadId the id of the thread to get state for
   * @return -1 if the thread is monitored but state hasn't been fetched or true/false if canPost
   */
  getGameState: (threadId: number) => Promise<GameState>;
  /**
   * Sets a game state by id.
   *
   * @param threadId the id of the thread to get state for
   * @param state the state to set for that game
   */
  setGameState: (threadId: number, state: GameState) => Promise<void>;
  /**
   * @param threadId thread id to check state for
   * @returns true if the game is monitored by this script, false otherwise
   */
  isGameMonitored: (threadId: number) => Promise<boolean>;
  /**
   * Removes stored state and unmonitores thread by id.
   *
   * @param threadId thread id to remove monitoring for
   */
  removeMonitoring: (threadId: number) => Promise<void>;
}

type GMKeys = {[key in keyof StorableGM]: string};
const GM_KEYS: GMKeys = {
  apiKey: 'forumgames_apikey',
  showCached: 'forumgames_showcached',
};

export class ForumGameStore implements Store {
  [threadId: number]: GameState;
  #apiKey: string;
  #showCached: boolean;

  async init() {
    this.#apiKey = await this.#initGM('apiKey');
    this.#showCached = await this.#initGM('showCached', true);
  }

  async #initGM(name: keyof typeof GM_KEYS, defaultValue?: any) {
    if ((await GM.getValue(GM_KEYS[name])) === undefined && defaultValue !== undefined) {
      await GM.setValue(GM_KEYS[name], defaultValue);
      return defaultValue;
    }
    return await GM.getValue(GM_KEYS[name]);
  }

  async #setGM(name: number, value?: GameState): Promise<void>;
  async #setGM(name: keyof typeof GM_KEYS, value: Store[typeof name]): Promise<void>;
  async #setGM(name: keyof typeof GM_KEYS | number, value: Store[typeof name]) {
    const key = name in GM_KEYS ? GM_KEYS[name] : String(name);
    if (value !== undefined) await GM.setValue(key, value);
    else await GM.deleteValue(key);
  }

  get apiKey() {
    return this.#apiKey;
  }
  set apiKey(key) {
    this.#apiKey = key;
    this.#setGM('apiKey', key);
  }
  get showCached() {
    return this.#showCached;
  }
  set showCached(show) {
    this.#showCached = show;
    this.#setGM('showCached', show);
  }

  // Game state-related functions
  async getGameState(threadId: number): Promise<GameState | undefined> {
    const state = (await GM.getValue(String(threadId))) as GameState | undefined;
    return state;
  }
  async setGameState(threadId: number, state: GameState): Promise<void> {
    this.#setGM(threadId, state);
  }
  async isGameMonitored(threadId: number) {
    return (await this.getGameState(threadId)) !== undefined;
  }
  async removeMonitoring(threadId: number) {
    await GM.deleteValue(String(threadId));
  }
}
