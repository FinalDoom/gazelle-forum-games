import Api from './api';
import log, {Logger} from './log';
import Store from './store';

/**
 * Handles checking individual forum thread details and updating state if possible.
 */
export default class ForumThread {
  #api: Api;
  #isLastPage: boolean;
  #log: Logger;
  #store: Store;
  #threadId: number;

  constructor(api: Api, store: Store, threadId: number) {
    this.#api = api;
    this.#log = log.getLogger('Forum Thread');
    this.#store = store;
    this.#threadId = threadId;

    this.#isLastPage = !!document.querySelector('.linkbox_top > strong:last-child');
    this.#log.debug(`Forum thread detected (${this.#isLastPage ? '' : 'not '}last page)`);
  }

  /**
   * @param post the post to get the ID of.
   * @returns the ID of the post passed in.
   */
  static getPostId(post: HTMLTableElement) {
    return (
      post &&
      Number(new URLSearchParams(post.querySelector<HTMLAnchorElement>('a.post_id').href).get('postid').split('#')[0])
    );
  }

  /**
   * @param post the post to get the post time of.
   * @returns post date as epoch millis of the post passed in.
   */
  static getPostTime(post: HTMLTableElement) {
    return post && new Date(post.querySelector<HTMLSpanElement>('.time').title).getTime();
  }

  /**
   * Checks if the current thread is a forum game thread.
   *
   * @returns true if the current thread is a forum game.
   */
  static get isForumGame() {
    if (
      window.location.pathname === '/forums.php' &&
      new URLSearchParams(window.location.search).get('action') === 'viewthread'
    ) {
      const linkBox = document.querySelector('#content .linkbox_top');
      let prev = linkBox.previousElementSibling;
      while (prev && prev.tagName !== 'H2') {
        prev = prev.previousElementSibling;
      }
      return Array.from(prev.querySelectorAll('a')).some((el) => el.textContent.includes('Forum Games'));
    }

    return false;
  }

  /**
   * @returns true if the argument is a table element (type guard)
   */
  static isTableElement(elem: Element): elem is HTMLTableElement {
    return elem.tagName === 'table';
  }

  #getRecentPostInfo() {
    if (this.#isLastPage) {
      this.#log.debug('Getting user recent post info from last page');
      const userId = document.querySelector<HTMLAnchorElement>('#nav_userinfo a').href.match(/id=(\d+)/)![1];
      let lastPostByUser: HTMLTableElement | undefined;
      for (const el of document.querySelectorAll<HTMLAnchorElement>(`.forum_post a.username[href$='id=${userId}']`)) {
        // :visible
        if (el.offsetWidth > 0 || el.offsetHeight > 0) {
          lastPostByUser = el.closest('table');
        }
      }
      this.#log.debug(`Post by user ${lastPostByUser ? '' : 'not '} found on page.`);
      const firstPostOnPage = document.querySelector<HTMLTableElement>('.forum_post');
      const post = lastPostByUser ? lastPostByUser : firstPostOnPage;
      const otherPosts = [];
      if (post === firstPostOnPage) {
        // Include the first post (not belonging to this user)
        otherPosts.push(ForumThread.getPostId(firstPostOnPage));
      }
      let nextPost: Element | null = post;
      while ((nextPost = nextPost.nextElementSibling)) {
        if (ForumThread.isTableElement(nextPost) && !/\bsticky_post\b/.test(nextPost.className)) {
          otherPosts.push(ForumThread.getPostId(nextPost));
        }
      }
      return {lastPostTime: ForumThread.getPostTime(lastPostByUser), otherPostIds: otherPosts};
    }
  }

  get isMonitored() {
    return this.#store.isGameMonitored(this.#threadId);
  }
  get state() {
    return this.#store.getGameState(this.#threadId);
  }
  set state(state) {
    this.#store.setGameState(this.#threadId, state);
  }

  /**
   * Monitors or unmonitors this thread, if it was not already in that state.
   *
   * @param monitoringOn true to turn on monitoring, false to turn it off
   * @returns true if the monitoring state was changed, false if it was not
   */
  async changeMonitoring(monitoringOn) {
    if (this.isMonitored === monitoringOn) return true;
    if (monitoringOn) {
      this.#log.debug('Set monitoring on for thread ', this.#threadId);
      unsafeWindow.noty({type: 'success', text: 'Monitoring forum game for post readiness.'});
      const threadInfo = await this.#api.threadInfo(this.#threadId);
      if (threadInfo) {
        this.state = threadInfo;
      }
    } else {
      if (window.confirm('You are about to remove monitoring for this forum game. Press OK to confirm.')) {
        this.#log.debug('Turned monitoring off for thread ', this.#threadId);
        this.#store.removeMonitoring(this.#threadId);
      } else {
        return false;
      }
    }
    return true;
  }

  async init() {
    // Add link / checkbox to monitor thread
    this.#log.debug('Adding monitoring link to thread');
    const monitorLink = document.createElement('a');
    monitorLink.innerText = this.isMonitored ? '[ Unmonitor this game ]' : '[ Monitor this game ]';
    monitorLink.addEventListener('click', async () => {
      await this.changeMonitoring(!this.isMonitored);
      monitorLink.innerText = this.isMonitored ? '[ Unmonitor this game ]' : '[ Monitor this game ]';
    });
    document.querySelector('#subscribe-link').after(monitorLink);

    // Checkbox and label next to subscribe checkbox to change monitoring on post submission
    this.#log.debug('Adding monitoring checkbox to thread');
    const monitorCheckbox = document.createElement('input');
    monitorCheckbox.type = 'checkbox';
    monitorCheckbox.id = 'monitoring';
    if (this.isMonitored) monitorCheckbox.checked = true;

    const monitorLabel = document.createElement('label');
    monitorLabel.append(monitorCheckbox, 'Monitor game');
    if (document.querySelector('#subbox')) {
      document.querySelector('#subbox').nextElementSibling.after(monitorLabel);

      document.querySelector<HTMLFormElement>('#quickpostform').addEventListener('submit', async () => {
        this.#log.debug('Reply submitted, checking monitoring checkbox');
        return await this.changeMonitoring(monitorCheckbox.checked);
      });

      // Update state if monitored
      if (this.isMonitored && this.#isLastPage) {
        const state = this.state;
        if (state) {
          const {canPost: previousCanPost} = state;
          this.#log.debug('Updating thread states from', state);
          const {lastPostTime, otherPostIds} = this.#getRecentPostInfo();
          if (!isNaN(lastPostTime)) {
            const nextPostTime = new Date(lastPostTime + state.postTimeLimit * 3600000);
            state.nextPostTime = nextPostTime;
            state.canPost = otherPostIds.length >= state.postCountLimit || nextPostTime < new Date();
          } else {
            state.canPost = otherPostIds.length >= state.postCountLimit;
          }
          this.#log.debug('New state', state);
          if (previousCanPost != state.canPost) this.#store.setGameState(this.#threadId, state);
        }
      }
      this.#log.log('Current thread state:', this.state);
    } else {
      this.#log.info('Current thread is locked.');
    }
  }
}
