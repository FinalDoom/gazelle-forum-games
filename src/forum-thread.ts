import Api from './api';
import Log from './log';
import Store from './store';

export default class ForumThread {
  #api: Api;
  #isLastPage: boolean;
  #log: Log;
  #store: Store;
  #threadId: number;

  constructor(api: Api, log: Log, store: Store, threadId: number) {
    this.#api = api;
    this.#log = log;
    this.#store = store;
    this.#threadId = threadId;

    this.#isLastPage = $('.linkbox_top > :last-child').is('strong');
  }

  static getPostId(post) {
    return parseInt(new URLSearchParams(post.find('a.post_id').attr('href')).get('postid').split('#')[0]);
  }

  static getPostTime(post) {
    return new Date(post.find('.time').attr('title')).getTime();
  }

  static get isForumGame() {
    return (
      window.location.pathname === '/forums.php' &&
      new URLSearchParams(window.location.search).get('action') === 'viewthread' &&
      $('#content .linkbox_top').prev('h2').find('a:contains("Forum Games")').length
    );
  }

  #getRecentPostInfo() {
    if (this.#isLastPage) {
      const userId = $('#nav_userinfo a')
        .attr('href')
        .match(/id=(\d+)/)[1];
      const lastPostByUser = $(`.forum_post a.username[href$='id=${userId}']:visible`).last().closest('table');
      const firstPostOnPage = $('.forum_post').eq(0);
      const post = lastPostByUser.length ? lastPostByUser : firstPostOnPage;
      const otherPosts = [
        ...(post === firstPostOnPage // Include the first post (not belonging to this user)
          ? [ForumThread.getPostId(firstPostOnPage)]
          : []),
        ...post // Get the post IDs after this one
          .nextAll('table:not(.sticky_post)')
          .map(function () {
            return ForumThread.getPostId($(this));
          })
          .toArray(),
      ];
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

  async changeMonitoring(monitoringOn) {
    if (this.isMonitored === monitoringOn) return true;
    if (monitoringOn) {
      window.noty({type: 'success', text: 'Monitoring forum game for post readiness.'});
      const threadInfo = await this.#api.threadInfo(this.#threadId);
      if (threadInfo) {
        this.state = threadInfo;
      }
    } else {
      if (window.confirm('You are about to remove monitoring for this forum game. Press OK to confirm.')) {
        this.#store.removeMonitoring(this.#threadId);
      } else {
        return false;
      }
    }
    return true;
  }

  async init() {
    // Add link / checkbox to monitor thread
    const thread = this;
    $('#subscribe-link').after(
      $('<a>')
        .text(this.isMonitored ? '[ Unmonitor this game ]' : '[ Monitor this game ]')
        .click(async function () {
          await thread.changeMonitoring(!thread.isMonitored);
          $(this).text(thread.isMonitored ? '[ Unmonitor this game ]' : '[ Monitor this game ]');
        }),
    );
    let checkbox: JQuery;
    $('#subbox')
      .next()
      .after(
        $('<label>').append(
          (checkbox = $('<input type="checkbox" id="monitoring" />').attr('checked', this.isMonitored.toString())),
          'Monitor game',
        ),
      );
    $('#quickpostform').on('submit.monitor', async () => {
      return await this.changeMonitoring(checkbox.prop('checked'));
    });

    // Update state if monitored
    if (this.isMonitored && this.#isLastPage) {
      const state = this.state;
      const {canPost: previousCanPost} = state;
      if (state) {
        this.#log.debug('Updating states from', state);
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
    this.#log.log('Current thread state:', () => this.state);
  }
}
