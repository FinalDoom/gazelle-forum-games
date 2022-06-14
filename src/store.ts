interface GameState {
  /** Number of posts required before user can post again. */
  postCountLimit: number;
  /** true if this user can post in this game. */
  canPost: boolean;
  /** Date that next post will be allowed. */
  nextPostTime?: Date;
  /** Number of hours required before user can post again. */
  postTimeLimit: number;
}

interface StorableGM {
  /**
   * Api key that has "Forums" permission, stored for this script.
   */
  apiKey: string;
}
interface StorableLocalStorage {
  /**
   * Number of API requests made in last ten second window.
   */
  apiTenSecondRequests: number;
  /**
   * Start time of current ten second window.
   */
  apiTenSecondTime: number;
}
interface Storable extends StorableGM, StorableLocalStorage {}
export default interface Store extends Storable {
  /**
   * Map of thread id to game state.
   */
  readonly gameStates: Map<number, GameState>;

  /**
   * Initializes store with default/stored values. Should be called after new instances are made.
   */
  init: () => Promise<void>;
  /**
   * Resets API throttling store variables (new ten second {@link apiTenSecondTime}, 0 {@link apiTenSecondRequests}).
   */
  resetApiThrottle: () => void;
  /**
   * Increments count of requests made in ten second window ({@link apiTenSecondRequests}).
   */
  incrementApiRequestsCount: () => void;
  /**
   * Get a specific game state by thread id
   *
   * @param threadId the id of the thread to get state for
   */
  getGameState: (threadId: string | number) => GameState;
  /**
   * Sets a game state by id.
   *
   * @param threadId the id of the thread to get state for
   * @param state the state to set for that game
   */
  setGameState: (threadId: number, state: GameState) => void;
  /**
   * @param threadId thread id to check state for
   * @returns true if the game is monitored by this script, false otherwise
   */
  isGameMonitored: (threadId: number) => boolean;
  /**
   * Removes stored state and unmonitores thread by id.
   *
   * @param threadId thread id to remove monitoring for
   */
  removeMonitoring: (threadId: number) => void;
}

type GMKeys = {[key in keyof StorableGM]: string};
const GM_KEYS: GMKeys = {
  apiKey: 'forumgames_apikey',
};
type LocalStorageKeys = {[key in keyof StorableLocalStorage]: string};
const LOCAL_STORAGE_KEYS: LocalStorageKeys = {
  apiTenSecondTime: 'forumGamesTenSecondTime',
  apiTenSecondRequests: 'forumGamesApiRequests',
};

export const KEY_GAME_STATE_PREFIX = 'forumGamesState';

/**
 * @param key window.localStorage key to parse for thread id
 * @returns numeric thread id of the passed key
 */
function keyToThreadId(key: string) {
  return Number(key.substring(KEY_GAME_STATE_PREFIX.length));
}

export class ForumGameStore implements Store {
  #apiKey: string;
  #apiTenSecondRequests: number;
  #apiTenSecondTime: number;
  #gameStates: Map<number, GameState>;

  async init() {
    this.#apiKey = await this.#initGM('apiKey');
    this.#apiTenSecondRequests = this.#initLocalStorage('apiTenSecondRequests', 0);
    this.#apiTenSecondTime = this.#initLocalStorage('apiTenSecondTime', 0);
    this.#gameStates = this.#allGameStates();

    window.addEventListener('storage', this.#storageListener.bind(this));
  }

  async #initGM(name: keyof typeof GM_KEYS, defaultValue?: any) {
    if (!(await GM.getValue(GM_KEYS[name])) && defaultValue) {
      await GM.setValue(GM_KEYS[name], defaultValue);
      return defaultValue;
    }
    return await GM.getValue(GM_KEYS[name]);
  }

  #initLocalStorage(
    name: keyof typeof LOCAL_STORAGE_KEYS,
    defaultValue: any,
    stringify = JSON.stringify,
    parse = JSON.parse,
  ) {
    if (!window.localStorage.hasOwnProperty(LOCAL_STORAGE_KEYS[name])) {
      window.localStorage.setItem(LOCAL_STORAGE_KEYS[name], stringify(defaultValue));
      return defaultValue;
    }
    return parse(window.localStorage.getItem(LOCAL_STORAGE_KEYS[name]));
  }

  async #setGM(name: keyof typeof GM_KEYS, oldValue: Store[typeof name], newValue: Store[typeof name]) {
    if (oldValue !== newValue) {
      if (newValue !== undefined) await GM.setValue(GM_KEYS[name], newValue);
      else await GM.deleteValue(GM_KEYS[name]);
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: name,
          newValue: JSON.stringify(newValue),
          oldValue: JSON.stringify(oldValue),
        }),
      );
    }
  }

  #setLocalStorage(
    name: keyof typeof LOCAL_STORAGE_KEYS,
    oldValue: Store[typeof name],
    newValue: Store[typeof name],
    stringify = JSON.stringify,
  ) {
    if (oldValue !== newValue) {
      if (newValue !== undefined) window.localStorage.setItem(LOCAL_STORAGE_KEYS[name], stringify(newValue));
      else window.localStorage.removeItem(LOCAL_STORAGE_KEYS[name]);
    }
  }

  #storageListener(storageEvent: StorageEvent) {
    if (storageEvent.key in this) {
      const key = storageEvent.key as keyof Storable;
      this[key] = JSON.parse(storageEvent.newValue) as never;
    } else if (storageEvent.key.startsWith(KEY_GAME_STATE_PREFIX)) {
      if (storageEvent.newValue)
        this.#gameStates.set(keyToThreadId(storageEvent.key), JSON.parse(storageEvent.newValue));
      else this.#gameStates.delete(keyToThreadId(storageEvent.key));
    }
  }

  get apiKey() {
    return this.#apiKey;
  }
  set apiKey(key) {
    const oldValue = this.#apiKey;
    this.#apiKey = key;
    this.#setGM('apiKey', oldValue, key);
  }

  // API-related functions
  get apiTenSecondRequests() {
    return this.#apiTenSecondRequests;
  }
  set apiTenSecondRequests(requests) {
    const oldValue = this.#apiTenSecondRequests;
    this.#apiTenSecondRequests = requests;
    this.#setLocalStorage('apiTenSecondRequests', oldValue, requests);
  }

  get apiTenSecondTime() {
    return this.#apiTenSecondTime;
  }
  set apiTenSecondTime(time) {
    const oldValue = this.#apiTenSecondTime;
    this.#apiTenSecondTime = time;
    this.#setLocalStorage('apiTenSecondTime', oldValue, time);
  }

  resetApiThrottle() {
    this.apiTenSecondRequests = 0;
    this.apiTenSecondTime = new Date().getTime();
  }
  incrementApiRequestsCount() {
    this.apiTenSecondRequests = this.#apiTenSecondRequests + 1;
  }

  // Game state-related functions
  getGameState(threadId: string | number): GameState {
    const key =
      typeof threadId === 'string' && threadId.startsWith(KEY_GAME_STATE_PREFIX)
        ? keyToThreadId(threadId)
        : Number(threadId);
    return this.#gameStates.get(key);
  }

  setGameState(threadId: number, state: GameState) {
    const key = KEY_GAME_STATE_PREFIX + threadId;
    this.#gameStates.set(threadId, state);
    window.localStorage.setItem(key, JSON.stringify(state));
  }
  #allGameStates() {
    return new Map<number, GameState>(
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith(KEY_GAME_STATE_PREFIX))
        .map((key) => [Number(keyToThreadId(key)), JSON.parse(window.localStorage.getItem(key))]),
    );
  }
  get gameStates() {
    return this.#gameStates;
  }
  isGameMonitored(threadId: number) {
    return this.#gameStates.has(threadId);
  }
  removeMonitoring(threadId: number) {
    if (this.#gameStates.has(threadId)) {
      this.#gameStates.delete(threadId);
      window.localStorage.removeItem(KEY_GAME_STATE_PREFIX + threadId);
    }
  }
}
