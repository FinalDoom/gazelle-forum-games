import Api, {API_MAX_QUERIES_PER_WINDOW, API_THROTTLE_WINDOW_MILLLIS} from './api';
import {Message, messageListener} from './ipc';
import log, {Logger} from './log';
import Store from './store';
import Style from './styles/style';

/**
 * Handles displaying game state on the forum index.
 */
export default class Forum {
  #api: Api;
  #cooldown: number;
  #log: Logger;
  #store: Store;
  #style: Style;

  constructor(api: Api, store: Store, style: Style) {
    this.#api = api;
    this.#log = log.getLogger('Forum');
    this.#store = store;
    this.#style = style;

    this.#listenForMorePages();
    this.#updateThreads(true);

    messageListener(this.#messageListenerCallback.bind(this));

    // Show cached state
    if (this.#store.showCached) {
      this.#log.debug('Showing cached states');
      this.#visibleThreads().forEach(async (threadId) => {
        const state = await this.#store.getGameState(threadId);
        if (state === true || state === false) {
          this.#log.debug('Cached thread state', threadId, state);
          this.#style.setPostState(threadId, state);
        }
      });
    }
  }

  #messageListenerCallback(message: Message) {
    this.#log.debug('Got ipc message', message);
    switch (message.type) {
      case 'unmonitor':
        this.#style.unsetPostState(message.threadId);
        break;
      case 'monitor':
      case 'trigger':
        this.#updateThread(message.threadId);
        break;
    }
  }

  /**
   * Watch for additional forum thread lines added by other endless scroll scripts
   * and style them accordingly.
   */
  #listenForMorePages() {
    const forumTable = document.querySelector('.forum_55 table.forum_index');
    if (forumTable) {
      var observer = new MutationObserver(() => {
        this.#log.debug('Detected more pages, updating states');
        observer.disconnect();
        window.clearTimeout(this.#cooldown);
        this.#updateThreads();
        this.#listenForMorePages();
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
   * @returns a list of all visible thread IDs
   */
  #visibleThreads() {
    return Array.from(document.querySelectorAll<HTMLAnchorElement>(`strong a[href*='threadid=']`)).map((a) =>
      Number(new URLSearchParams(a.href).get('threadid')),
    );
  }

  /**
   * Update a single thread's eligibility state and display
   *
   * @param threadId ID of the thread to update
   */
  async #updateThread(threadId: number) {
    // this.#log.debug('Updating thread state', threadId);
    try {
      const state = await this.#api.threadInfo(threadId);
      // Precheck state so we don't re-monitor an unmonitored thread
      if (this.#store.isGameMonitored(threadId)) {
        this.#log.debug('Got new thread state', threadId, state);
        this.#store.setGameState(threadId, state.canPost);
        this.#style.setPostState(threadId, state.canPost);
      }
      return true;
    } catch (reason) {
      this.#log.error('Failed updating a thread: ', reason);
      return false;
    }
  }

  /**
   * Updates state and eligibility of all visible threads (that are monitored)
   */
  async #updateThreads(first = false) {
    this.#log.debug('Updating thread states');
    const monitoredThreads = (
      await Promise.all(
        this.#visibleThreads().map(async (threadId) =>
          (await this.#store.getGameState(threadId)) === undefined ? undefined : threadId,
        ),
      )
    ).filter((id) => id !== undefined);
    await Promise.allSettled(
      monitoredThreads.map((threadId, i) => {
        return new Promise((resolve) =>
          window.setTimeout(
            async () => {
              const success = await this.#updateThread(threadId);
              resolve(success);
            },
            first
              ? // Fire them all off at once for the first update
                0
              : // Fire off N-2 per api window for subsequent updates,
                // so that other requests can still go through while updates
                // are happening.
                Math.floor(i / (API_MAX_QUERIES_PER_WINDOW - 2)) * API_THROTTLE_WINDOW_MILLLIS,
          ),
        );
      }),
    );
    this.#log.debug('Waiting 60 seconds to recheck thread states');
    this.#cooldown = window.setTimeout(this.#updateThreads.bind(this), 60000);
  }
}
