import Api from './api';
import log, {Logger} from './log';
import GameState from './models/game-state';
import Store, {KEY_GAME_STATE_PREFIX} from './store';
import Style from './styles/style';

const isRejected = (input: PromiseSettledResult<unknown>): input is PromiseRejectedResult =>
  input.status === 'rejected';

const isFulfilled = <T>(input: PromiseSettledResult<T>): input is PromiseFulfilledResult<T> =>
  input.status === 'fulfilled';

/**
 * Handles displaying game state on the forum index.
 */
export default class Forum {
  #api: Api;
  #log: Logger;
  #store: Store;
  #style: Style;

  constructor(api: Api, store: Store, style: Style) {
    this.#api = api;
    this.#log = log.getLogger('Forum');
    this.#store = store;
    this.#style = style;

    this.showForumGamePostAvailability();
    this.listenForMorePages();
    this.updateEligibility();

    window.addEventListener('storage', (event) => {
      if (event.key.startsWith(KEY_GAME_STATE_PREFIX)) {
        this.#log.debug('Listener heard state update for ', event.key);
        this.showForumGamePostAvailability();
      }
    });
  }

  /**
   * Style each thread row with its state.
   */
  showForumGamePostAvailability() {
    for (const [key, state] of this.#store.gameStates.entries()) {
      this.#style.setPostState(key, state.canPost);
    }
  }

  /**
   * Watch for additional forum thread lines added by other endless scroll scripts
   * and style them accordingly.
   */
  listenForMorePages() {
    const forumTable = document.querySelector('.forum_55 table.forum_index');
    if (forumTable) {
      var observer = new MutationObserver(() => {
        observer.disconnect();
        this.showForumGamePostAvailability();
        this.listenForMorePages();
      });
      observer.observe(forumTable, {
        attributes: false,
        childList: true,
        characterData: false,
        subtree: true,
      });
    }
  }

  /**
   * @param canPostInThread true to get threads that can be posted in, false otherwise
   * @returns thread ids for tracked threads that can or cannot be posted in (according to {@link canPostInThread})
   */
  getThreadIds(canPostInThread: boolean) {
    return [...this.#store.gameStates.entries()]
      .filter(([_, {canPost}]) => {
        return canPost === canPostInThread;
      })
      .map(([threadId, _]) => threadId);
  }

  /**
   * Checks all thread eligibility first, then sets up a recheck every minute that only checks
   * ineligible threads.
   *
   * The assumption is that the state may not match on initial load, but once updated, the script
   * should be updating states to ineligible when posts are made. So we just have to check those
   * going forward. There is an exceedingly rare case where a game's eligibility requirements
   * might change, but the initial load will catch those next time.
   */
  updateEligibility() {
    this.#log.debug('Updating state of threads marked as posting eligible');
    this.updateThreads(this.getThreadIds(true));
    this.recheckEligibility();
  }

  /**
   * Checks all threads marked as canPost === false via API to see if eligibility has changed.
   * Repeats every minute after all checks are done.
   */
  async recheckEligibility() {
    this.#log.debug('Updating state of threads marked as posting ineligible');
    await this.updateThreads(this.getThreadIds(false));
    this.#log.debug('Waiting 60 seconds before rechecking ineligible threads');
    window.setTimeout(this.updateEligibility.bind(this), 60000);
  }

  /**
   * @param threads IDs of threads to check eligibility for.
   */
  async updateThreads(threads: number[]) {
    const updates = await Promise.allSettled(
      threads.map(
        (threadId) =>
          new Promise<[number, GameState]>((resolve, reject) => {
            this.#api
              .threadInfo(threadId)
              .then((info) => resolve([threadId, info]))
              .catch(reject);
          }),
      ),
    );
    updates.forEach((result) => {
      if (isRejected(result)) {
        this.#log.error('Failed updating a thread: ', result.reason);
      } else if (isFulfilled(result)) {
        const [threadId, threadInfo] = result.value;
        this.#store.setGameState(threadId, {
          nextPostTime: this.#store.gameStates.get(threadId).nextPostTime,
          ...threadInfo,
        });
      }
    });
  }
}
