import Api, {MAX_API_QUERIES_BEFORE_THROTTLE, TEN_SECOND_DELAY_MILLIS} from './api';
import Store, {KEY_GAME_STATE_PREFIX} from './store';
import {Style} from './styles/style';

export default class Forum {
  #api: Api;
  #store: Store;
  #style: Style;

  constructor(api: Api, store: Store, style: Style) {
    this.#api = api;
    this.#store = store;
    this.#style = style;

    this.showForumGamePostAvailability();
    this.listenForMorePages();
    this.recheckEligibility();

    window.addEventListener(
      'storage',
      (event) => event.key.startsWith(KEY_GAME_STATE_PREFIX) && this.showForumGamePostAvailability(),
    );
  }

  showForumGamePostAvailability() {
    for (const [key, state] of this.#store.gameStates.entries()) {
      this.#style.setPostState(key, state.canPost);
    }
  }

  listenForMorePages() {
    var observer = new MutationObserver(() => {
      observer.disconnect();
      this.showForumGamePostAvailability();
      this.listenForMorePages();
    });
    observer.observe($('.forum_55 table.forum_index')[0], {
      attributes: false,
      childList: true,
      characterData: false,
      subtree: true,
    });
  }

  async recheckEligibility() {
    for (const [key, {nextPostTime}] of Object.entries(this.#store.gameStates)) {
      await new Promise<void>(
        (resolve) =>
          window.setTimeout(async () => {
            const threadId = Store.keyToThreadId(key);
            const threadInfo = await this.#api.threadInfo(threadId);
            if (threadInfo) {
              this.#store.setGameState(threadId, {nextPostTime: nextPostTime, ...threadInfo});
            }
            resolve();
          }, TEN_SECOND_DELAY_MILLIS / MAX_API_QUERIES_BEFORE_THROTTLE), // space out our checks to not constantly hit limit
      );
    }
    window.setTimeout(this.recheckEligibility.bind(this), 60000);
  }
}