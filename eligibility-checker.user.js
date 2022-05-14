// ==UserScript==
// @name         GGn Forum Games Checker
// @namespace    https://gazellegames.net/
// @version      2.0.2
// @description  Tracks forum games participation eligibility and marks thread read indicators accordingly.
// @author       FinalDoom
// @match        https://gazellegames.net/forums.php?*action=viewforum&forumid=55*
// @match        https://gazellegames.net/forums.php?*action=viewthread&threadid=*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(async function (window, $) {
  ('use strict');

  //
  // #region Window localstorage functions
  //
  const KEY_GAME_STATE_PREFIX = 'forumGamesState';
  const KEY_TEN_SECOND_TIME = 'forumGamesTenSecondTime';
  const KEY_TEN_SECOND_REQUESTS = 'forumGamesApiRequests';
  const STORAGE = {
    get: function (key) {
      return window.localStorage.hasOwnProperty(key) ? JSON.parse(window.localStorage.getItem(key)) : undefined;
    },
    set: function (key, value) {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new StorageEvent('storage', {key: key}));
    },
    clear: function (key) {
      window.localStorage.removeItem(key);
      window.dispatchEvent(new StorageEvent('storage', {key: key}));
    },

    // Game state-related
    getGameState: function (threadId) {
      const key = threadId.startsWith(KEY_GAME_STATE_PREFIX) ? threadId : KEY_GAME_STATE_PREFIX + threadId;
      return this.get(key);
    },
    setGameState: function (threadId, state) {
      const key = KEY_GAME_STATE_PREFIX + threadId;
      this.set(key, state);
    },
    allGameStates: function () {
      return Object.fromEntries(
        Object.keys(window.localStorage)
          .filter((key) => key.startsWith(KEY_GAME_STATE_PREFIX))
          .map((key) => [key, this.getGameState(key)]),
      );
    },
    isGameMonitored: function (threadId) {
      return window.localStorage.hasOwnProperty(KEY_GAME_STATE_PREFIX + threadId);
    },
    removeMonitoring: function (threadId) {
      STORAGE.clear(KEY_GAME_STATE_PREFIX + threadId);
    },
    keyToThreadId: function (key) {
      return key.substring(15);
    },

    // API-related functions

    //
    // API call throttling is done through window.localStorage
    //
    // API calls are restricted to 5 calls per ten seconds.
    //
    // forumGamesTenSecondTime: number        // The date time when the first API request in the most recent ten second period was made
    // forumGamesApiRequests: number          // The number of API requests that have been made in the most recent ten second period
    // forumGamesLastConversationDate: number // The date time of the most recent inbox conversation that was checked
    //
    getApiTime: function () {
      return parseInt(this.get(KEY_TEN_SECOND_TIME)) || 0;
    },
    getApiRequestsCount: function () {
      return parseInt(this.get(KEY_TEN_SECOND_REQUESTS)) || 0;
    },
    resetApiThrottle: function () {
      this.set(KEY_TEN_SECOND_TIME, new Date().getTime());
      this.set(KEY_TEN_SECOND_REQUESTS, 0);
    },
    incrementApiRequestsCount: function () {
      this.set(KEY_TEN_SECOND_REQUESTS, this.get(KEY_TEN_SECOND_REQUESTS) + 1);
    },
  };
  //
  // #endregion Window localstorage functions
  //

  const LOG = {
    level: 2, // 0 = none, 1 = errors, 2 = log, 3 = debug, 4 = timing
    start: new Date(),
    logToConsole: function (logMethod, ...args) {
      const resolvedArgs = args.map((arg) => (typeof arg === 'function' ? arg() : arg));
      logMethod('[GGn Forum Games Helper]', ...resolvedArgs);
    },
    timing: function (message, ...args) {
      if (this.level >= 4) this.logToConsole(console.debug, () => `(${new Date() - this.start}) ${message}`, ...args);
    },
    debug: function (message, ...args) {
      if (this.level >= 3) this.logToConsole(console.debug, `${message}`, ...args);
    },
    log: function (message, ...args) {
      if (this.level >= 2) this.logToConsole(console.log, `${message}`, ...args);
    },
    error: function (message, ...args) {
      if (this.level >= 1) this.logToConsole(console.error, `${message}`, ...args);
    },
  };

  //
  // #region API functions
  //
  const TEN_SECOND_THROTTLE_COUNT = 5;
  const TEN_SECOND_DELAY_MILLIS = 11000; // 5 api calls per tenSecondDelay milliseconds (plus a bit for wiggle room)
  const KEY_GM_API_KEY = 'forumgames_apikey';
  const API = {
    // Query the user for an API key. This is only done once, and the result is stored in script storage
    key: (function getApiKey() {
      const key = GM_getValue(KEY_GM_API_KEY);
      if (!key) {
        const input = window.prompt(`Please input your GGn API key.
  If you don't have one, please generate one from your Edit Profile page: https://gazellegames.net/user.php?action=edit.
  The API key must have "Forums" permission

  Please disable this userscript until you have one as this prompt will continue to show until you enter one in.`);
        const trimmed = input.trim();

        if (/[a-f0-9]{64}/.test(trimmed)) {
          GM_setValue(KEY_GM_API_KEY, trimmed);
          return trimmed;
        }
      }

      return key;
    })(),

    // Execute an API call and also handle throttling to 5 calls per 10 seconds
    call: async function (options) {
      while (true) {
        const tenSecondTime = STORAGE.getApiTime();
        const nowTimeBeforeWait = new Date().getTime();
        if (
          STORAGE.getApiRequestsCount() >= TEN_SECOND_THROTTLE_COUNT &&
          nowTimeBeforeWait - tenSecondTime < TEN_SECOND_DELAY_MILLIS
        ) {
          LOG.log(
            `Waiting ${((TEN_SECOND_DELAY_MILLIS - (nowTimeBeforeWait - tenSecondTime)) / 1000).toFixed(
              1,
            )} seconds for more API calls.`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, TEN_SECOND_DELAY_MILLIS - (nowTimeBeforeWait - tenSecondTime)),
          );
        } else {
          break;
        }
      }
      if (new Date().getTime() - STORAGE.getApiTime() > TEN_SECOND_DELAY_MILLIS) {
        STORAGE.resetApiThrottle();
      }
      STORAGE.incrementApiRequestsCount();
      LOG.debug('API call', options.data);
      return $.ajax({
        ...options,
        method: 'GET',
        url: '/api.php',
        headers: {'X-API-Key': this.key},
      }).then((data) => {
        const status = data.status;
        if (status !== 'success' || !'response' in data) {
          LOG.error(`API returned unsuccessful: ${status}`, options, data);
          throw data.error;
        }
        return data.response;
      });
    },

    // Specific API calls
    /**
     * Gets thread info from the API
     * @param {int} threadId The id of the thread to look up info on
     * @returns undefined if thread does not exist or can't be participated in (locked etc), false on other errors, info on success
     */
    threadInfo: async function (threadId) {
      return await this.call({data: {request: 'forums', type: 'thread_info', id: threadId}})
        // Also available title and subscribed
        .then(({id, forumID, locked, postCountLimit, postTimeLimit, canPost}) => {
          if (parseInt(forumID) !== 55) {
            const fail = `Thread ${id} is not a forum game post`;
            LOG.error(fail);
            throw fail;
          }
          if (locked) return undefined;
          return {
            postCountLimit: parseInt(postCountLimit),
            postTimeLimit: parseInt(postTimeLimit),
            canPost: canPost.toString() === 'true',
          };
        })
        .catch((reason) => console.log(reason) && (reason !== 'thread does not exist' ? false : undefined));
    },
  };
  //
  // #endregion API functions
  //

  //
  // #region Game forum-thread logic
  //

  //
  // Game state is stored in window.localStorage.forumGamesState##### where ##### is the thread ID
  //
  // State is an object:
  // {
  //   postCountLimit: number,   // Number of posts required before user can post again
  //   postTimeLimit: number,    // Number of hours required before user can post again
  //   nextPostTime: Date,     // Date that next post will be allowed
  //   canPost: boolean,         // true if this user can post in this game
  // }
  //
  function ForumThread(threadId) {
    this.threadId = threadId;
  }
  ForumThread.prototype.isLastPage = function () {
    return $('.linkbox_top > :last-child').is('strong');
  };
  ForumThread.prototype.getPostId = function (post) {
    return parseInt(new URLSearchParams(post.find('a.post_id').attr('href')).get('postid').split('#')[0]);
  };
  ForumThread.prototype.getPostTime = function (post) {
    return new Date(post.find('.time').attr('title')).getTime();
  };

  ForumThread.prototype.getRecentPostInfo = function () {
    if (this.isLastPage()) {
      const userId = $('#nav_userinfo a')
        .attr('href')
        .match(/id=(\d+)/)[1];
      const lastPostByUser = $(`.forum_post a.username[href$='id=${userId}']:visible`).last().closest('table');
      const firstPostOnPage = $('.forum_post');
      const post = lastPostByUser.length ? lastPostByUser : firstPostOnPage;
      const thread = this;
      const otherPosts = [
        ...(post === firstPostOnPage // Include the first post (not belonging to this user)
          ? [this.getPostId(firstPostOnPage)]
          : []),
        ...post // Get the post IDs after this one
          .nextAll('table:not(.sticky_post)')
          .map(function () {
            return thread.getPostId($(this));
          })
          .toArray(),
      ];
      return {lastPostTime: this.getPostTime(lastPostByUser), otherPostIds: otherPosts};
    }
  };

  ForumThread.prototype.isForumGame = function () {
    return (
      window.location.pathname === '/forums.php' &&
      new URLSearchParams(window.location.search).get('action') === 'viewthread' &&
      $('#content .linkbox_top').prev('h2').find('a:contains("Forum Games")').length
    );
  };

  ForumThread.prototype.isMonitored = function () {
    return STORAGE.isGameMonitored(this.threadId);
  };
  ForumThread.prototype.state = function () {
    return STORAGE.getGameState(this.threadId);
  };
  ForumThread.prototype.setState = function (state) {
    STORAGE.setGameState(this.threadId, state);
  };
  ForumThread.prototype.updateGameStates = function () {
    const state = this.state();
    const {canPost: previousCanPost} = state;
    if (state) {
      LOG.debug('Updating states from', state);
      const {lastPostTime, otherPostIds} = this.getRecentPostInfo();
      const nextPostTime = new Date(lastPostTime + state.postTimeLimit * 3600000);
      state.nextPostTime = nextPostTime;
      state.canPost = otherPostIds.length >= state.postCountLimit || nextPostTime < new Date();
      LOG.debug('New state', state);
      if (previousCanPost != state.canPost) STORAGE.setGameState(this.threadId, state);
    }
  };
  ForumThread.prototype.changeMonitoring = async function (monitoringOn) {
    if (this.isMonitored() === monitoringOn) return true;
    if (monitoringOn) {
      window.noty({type: 'success', text: 'Monitoring forum game for post readiness.'});
      this.setState(await API.threadInfo(this.threadId));
      this.updateGameStates();
    } else {
      if (window.confirm('You are about to remove monitoring for this forum game. Press OK to confirm.')) {
        STORAGE.removeMonitoring(this.threadId);
      } else {
        return false;
      }
    }
    return true;
  };
  /** Adds monitor/unmonitor link to page */
  ForumThread.prototype.addMonitoringLinks = function () {
    const thread = this;
    $('#subscribe-link').after(
      $('<a>')
        .text(this.isMonitored() ? '[ Unmonitor this game ]' : '[ Monitor this game ]')
        .click(async function () {
          await thread.changeMonitoring(!thread.isMonitored());
          $(this).text(thread.isMonitored() ? '[ Unmonitor this game ]' : '[ Monitor this game ]');
        }),
    );
    let checkbox;
    $('#subbox')
      .next()
      .after(
        $('<label>').append(
          (checkbox = $('<input type="checkbox" id="monitoring" />').attr('checked', this.isMonitored())),
          'Monitor game',
        ),
      );
    $('#quickpostform').on('submit.monitor', async () => {
      return await this.changeMonitoring(checkbox.prop('checked'));
    });
  };
  ForumThread.prototype.init = async function () {
    if (this.isForumGame()) {
      this.addMonitoringLinks();
      if (this.isMonitored() && this.isLastPage()) this.updateGameStates();
      LOG.log('Current thread state:', () => this.state());
    }
    return this;
  };
  new ForumThread(new URLSearchParams(window.location.search).get('threadid')).init();
  //
  // #endregion Game thread logic
  //

  //
  // #region Forum games forum logic
  //
  const Style = function (styleName) {
    const isInternalCss = styleName !== 'External CSS'; // FIX External mask isn't working. Figure out how to make it work.
    const svgCircleMask =
      "data:image/svg+xml,%3csvg height='100' width='100'%3e%3ccircle cx='50' cy='50' r='40' fill='black' /%3e%3c/svg%3e";
    const maskImage = isInternalCss
      ? `url(static/styles/${styleName}/images/balloon-unread.png)`
      : `url(${svgCircleMask})`;
    this.sharedReadIconStyle = {
      backgroundBlendMode: 'overlay',
      // This needs to come from current stylesheet somehow
      // it's ../images... relative to forums.css but forums.css isn't anywhere
      maskImage: maskImage,
      maskPosition: '50%',
      maskRepeat: 'no-repeat',
    };
    this.unreadIconIneligibleStyle = {
      ...this.sharedReadIconStyle,
      backgroundColor: 'brown', // "red" colors. tomato more rounded, coral lighter, brown has less attention
    };
    this.unreadIconEligibleStyle = {
      ...this.sharedReadIconStyle,
      backgroundColor: 'olive', // "green" colors. olive or olivedrab fit the theme really well
    };
    this.readIconIneligibleStyle = {
      ...this.sharedReadIconStyle,
      backgroundColor: 'rgba(255, 0, 0, 0.3)',
    };
    this.readIconEligibleStyle = {
      ...this.sharedReadIconStyle,
      backgroundColor: 'rgba(0, 255, 0, 0.2)',
    };
  };
  Style.prototype.rowAStyle = {backgroundColor: $('.rowa').first().find('td').first().css('background-color')}; // this.isInternalCss() ?'var(--rowa)':''};
  Style.prototype.rowBStyle = {backgroundColor: $('.rowb').first().find('td').first().css('background-color')}; // this.isInternalCss()?'var(--rowb)':''};
  Style.prototype.setPostState = function (threadId, state) {
    if (!state) return;
    const icon = $(`a[href$='threadid=${threadId}']`)
      .closest('td')
      .prev()
      .attr('title', `You are ${state.canPost ? 'eligible' : 'ineligible'} to participate in this forum game.`);

    if (
      !icon.length ||
      // Technically only locked should be excluded, but we don't have sticky logic
      icon.is(
        '.unread_locked_sticky, .read_locked_sticky, ' +
          '.unread_sticky, .read_sticky, ' +
          '.unread_locked, .read_locked',
      )
    ) {
      return;
    }

    if (icon.is('.unread')) icon.css(state.canPost ? this.unreadIconEligibleStyle : this.unreadIconIneligibleStyle);
    else icon.css(state.canPost ? this.readIconEligibleStyle : this.readIconIneligibleStyle);

    const row = icon.closest('tr');
    if (row.hasClass('rowa')) row.css(this.rowAStyle);
    else row.css(this.rowBStyle);
  };
  const STYLE = new Style($('link[rel="stylesheet"][title]').attr('title'));

  const FORUM = {
    isForumGamesForum: function () {
      const urlParams = new URLSearchParams(window.location.search);
      return (
        window.location.pathname === '/forums.php' &&
        urlParams.get('action') === 'viewforum' &&
        urlParams.get('forumid') === '55'
      );
    },
    showForumGamePostAvailability: function () {
      Object.entries(STORAGE.allGameStates()).forEach(([key, state]) =>
        STYLE.setPostState(STORAGE.keyToThreadId(key), state),
      );
    },
    listenForStateChanges: function () {
      window.addEventListener(
        'storage',
        ({key}) =>
          key.startsWith(KEY_GAME_STATE_PREFIX) &&
          STYLE.setPostState(STORAGE.keyToThreadId(key), STORAGE.getGameState(key)),
      );
    },
    listenForMorePages: function () {
      var observer = new MutationObserver(() => {
        observer.disconnect();
        FORUM.showForumGamePostAvailability();
      });
      observer.observe($('.forum_55 table.forum_index')[0], {
        attributes: false,
        childList: true,
        characterData: false,
        subtree: true,
      });
    },
    registerTimedUpdates: function () {
      Object.entries(STORAGE.allGameStates())
        .filter(([_, state]) => !state.canPost)
        .forEach(([key, state]) => {
          const threadId = STORAGE.keyToThreadId(key);
          const {nextPostTime} = state;
          nextPostTime &&
            nextPostTime instanceof Date &&
            window.setTimeout(
              async () =>
                STORAGE.setGameState(threadId, {nextPostTime: nextPostTime, ...(await API.threadInfo(threadId))}),
              nextPostTime.getTime() - new Date().getTime(),
            );
        });
    },
    recheckEligibility: async function () {
      for (const [key, {nextPostTime}] of Object.entries(STORAGE.allGameStates()).filter(
        ([_, state]) => !state.canPost,
      )) {
        await new Promise(
          (resolve) =>
            window.setTimeout(async function () {
              const threadId = STORAGE.keyToThreadId(key);
              STORAGE.setGameState(threadId, {nextPostTime: nextPostTime, ...(await API.threadInfo(threadId))});
              resolve();
            }, TEN_SECOND_DELAY_MILLIS / TEN_SECOND_THROTTLE_COUNT), // space out our checks to not constantly hit limit
        );
      }
      window.setTimeout(this.recheckEligibility, 60000);
    },
    init: function () {
      if (this.isForumGamesForum()) {
        this.showForumGamePostAvailability();
        this.listenForStateChanges();
        this.listenForMorePages();
        this.registerTimedUpdates();
        this.recheckEligibility();
      }
    },
  };
  FORUM.init();
  //
  // #endregion Forum games forum logic
  //
})(unsafeWindow || window, (unsafeWindow || window).jQuery);
