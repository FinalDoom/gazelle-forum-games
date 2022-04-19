// ==UserScript==
// @name         GGn Forum Games Checker
// @namespace    https://gazellegames.net/
// @version      0.5.0
// @description  Tracks forum games participation eligibility and marks thread read indicators accordingly.
// @author       FinalDoom
// @match        https://gazellegames.net/inbox.php*
// @match        https://gazellegames.net/forums.php?*action=viewforum&forumid=55*
// @match        https://gazellegames.net/forums.php?*action=viewthread&threadid=*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==

// Fix there's some sort of problem with after post not updating. check it next time you post

(async function (window, $) {
  ('use strict');

  //
  // #region Helper functions
  //
  let tenSecondTime = GM_getValue('forumgames_tensecond_time');
  let requestsInLastTenSeconds = GM_getValue('forumgames_tensecond_requests');
  $.extend({
    apiCall: async (options) => {
      const nowTimeBeforeWait = new Date().getTime();
      if (requestsInLastTenSeconds >= 5 && nowTimeBeforeWait - tenSecondTime < tenSecondDelay) {
        log(`Waiting ${((nowTimeBeforeWait - tenSecondTime) / 1000).toFixed(1)} seconds for more API calls.`);
        await new Promise((resolve) => setTimeout(resolve, nowTimeBeforeWait - tenSecondTime));
      }
      const nowTime = new Date().getTime();
      if (!tenSecondTime || nowTime - tenSecondTime > tenSecondDelay) {
        tenSecondTime = nowTime;
        GM_setValue('forumgames_tensecond_time', tenSecondTime);
        requestsInLastTenSeconds = 0;
      }
      ++requestsInLastTenSeconds;
      GM_setValue('forumgames_tensecond_requests', requestsInLastTenSeconds);
      debug('API call', options.data);
      return $.ajax({
        ...options,
        method: 'GET',
        url: '/api.php',
        headers: {'X-API-Key': API_KEY},
      });
    },
  });

  function getApiKey() {
    const key = GM_getValue('forumgames_apikey');
    if (!key) {
      const input = window.prompt(`Please input your GGn API key.
If you don't have one, please generate one from your Edit Profile page: https://gazellegames.net/user.php?action=edit.
The API key must have "User" permission

Please disable this userscript until you have one as this prompt will continue to show until you enter one in.`);
      const trimmed = input.trim();

      if (/[a-f0-9]{64}/.test(trimmed)) {
        GM_setValue('forumgames_apikey', trimmed);
        return trimmed;
      }
    }
    console.log(key);

    return key;
  }

  async function getUserId() {
    if (window.userid) GM_setValue('forumgames_userid', window.userid);
    if (!GM_getValue('forumgames_userid')) {
      return await $.apiCall({data: {request: 'quick_user'}}).then((data) => {
        const status = data.status;
        if (status !== 'success' || !'response' in data) {
          error(`API returned unsuccessful: ${status}`, data);
          return -1;
        }
        log('returning', data.response.id);
        GM_setValue('forumgames_userid', data.response.id);
        return data.response.id;
      });
    }
    return GM_getValue('forumgames_userid');
  }

  async function asyncEvery(arr, predicate) {
    for (let e of arr) {
      if (!(await predicate(e))) return false;
    }
    return true;
  }

  const DATE_REGEX = /(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)/;
  function dateFromUTCString(utc) {
    const parts = DATE_REGEX.exec(utc);
    // Javascript dates are stupid. Real stupid. 0 indexed month for some reason...
    return new Date(Date.UTC(parts[1], parts[2] - 1, ...parts.slice(3)));
  }

  const SCRIPT_START = new Date();
  function timing(message, ...args) {
    console.debug(`[GGn Forum Games Helper] (${new Date() - SCRIPT_START}) ${message}`, ...args);
  }

  function debug(message, ...args) {
    //console.debug(`[GGn Forum Games Helper] ${message}`, ...args);
  }

  function log(message, ...args) {
    console.log(`[GGn Forum Games Helper] ${message}`, ...args);
  }

  function error(message, ...args) {
    console.error(`[GGn Forum Games Helper] ${message}`, ...args);
  }
  //
  // #endregion Helper functions
  //

  //
  // Maps [thread ID] to object of states:
  //   {
  //     requiredPosts: number, // Number of posts required before user can post again
  //     requiredTime: number, // Number of milliseconds that must pass before user can post again
  //     title: string, // Thread title
  //     lastPostId: number, // ID of the last post this user made
  //     lastPostTime: number, // Date milliseconds that the last post was made at
  //     conversationLastCheckTime: number, // Date milliseconds that the related conversation was last checked
  //     otherPostIds: Array, // Array of other people's post IDs (counted against requiredPosts)
  //   }
  const gameStates = GM_getValue('forumgames_states', {});
  const tenSecondDelay = 11000; // 5 api calls per tenSecondDelay milliseconds (plus a bit for wiggle room)

  const API_KEY = getApiKey();
  const USER_ID = await getUserId();

  //
  // #region Inbox cleanup functions
  //
  const subscribedMessageRegex = /New Post in Subscribed Thread: (.*)/;
  const messageSubjectToThreadTitle = ({subject}) =>
    subscribedMessageRegex.test(subject) && subscribedMessageRegex.exec(subject)[1];
  const conversationGroupBorder = '1px solid rgba(100, 100, 100, 0.3)';

  function doHiding(hide) {
    GM_setValue('forumgames_inboxhide', hide);
    if (!$('.forumgames-hider').length) {
      const monitoredTitles = Object.values(gameStates).map(({title}) => title);
      const conversationGroups = [];
      let currentGroup = $();
      $('tr:not(.colhead)').each(function () {
        if (monitoredTitles.includes(messageSubjectToThreadTitle({subject: $(this).find('a').text().trim()}))) {
          currentGroup = currentGroup.add(this);
        } else if (currentGroup.length) {
          conversationGroups.push(currentGroup);
          currentGroup = $();
        }
      });
      if (currentGroup.length) {
        conversationGroups.push(currentGroup);
      }
      conversationGroups.forEach((group) => {
        let hider, info;
        const infoText = ` ${group.length} monitored forum games conversation${group.length > 1 ? 's' : ''}.`;
        group.first().before((hider = $('<tr class="forumgames-hider">')));
        hider
          .append(
            $('<td>').append(
              $('<input type="checkbox">').click(function (event) {
                group.find('input[type="checkbox"]').prop('checked', $(this).prop('checked'));
                event.stopPropagation();
              }),
            ),
            (info = $('<td>').text(`Hiding ${infoText}`).css({opacity: '0.7'})),
            '<td>',
            '<td>',
          )
          .click(function () {
            group.toggle();
            if (hider.is('.forumgames--shown')) {
              hider.css({borderBottom: conversationGroupBorder}).removeClass('forumgames--shown');
              info.text(`Hiding ${infoText}`);
            } else {
              hider.css({borderBottom: ''}).addClass('forumgames--shown');
              info.text(`Showing ${infoText}`);
            }
          })
          .css({
            border: conversationGroupBorder,
            fontWeight: 'bold',
          });
        group.addClass('forumgames--monitored');
        group.first().addClass('forumgames-group--first');
        group.last().addClass('forumgames-group--last');
      });
    }
    if (hide) {
      $('.forumgames-hider').show();
      $('.forumgames--monitored').hide().css({
        borderLeft: conversationGroupBorder,
        borderRight: conversationGroupBorder,
        backgroundColor: 'rgba(50, 50, 50, 0.2)',
      });
      $('.forumgames-group--last').css({borderBottom: conversationGroupBorder});
    } else {
      $('.forumgames-hider').hide();
      $('.forumgames--monitored').show().css({borderLeft: '', borderRight: '', backgroundColor: ''});
      $('.forumgames-group--last').css({borderBottom: ''});
    }
    // Fixes a really weird phantom border bug--borders between two sections with 1 non-monitored between
    $('tr:not(.forumgames--monitored,.forumgames-hider,.colhead)').css({
      borderLeft: '1px solid transparent',
      borderRight: '1px solid transparent',
    });
  }

  function cleanInbox() {
    const startHidden = GM_getValue('forumgames_inboxhide', false);
    $('#searchbox').after(
      $('<div>')
        .css({display: 'inline-flex', flexDirection: 'row', alignItems: 'center'})
        .append(
          $('<input type="checkbox" id="forumgamehide">')
            .attr('checked', startHidden)
            .change(function () {
              doHiding($(this).prop('checked'));
            }),
          $('<label for="forumgamehide">').text('Hide monitored forum game messages'),
        ),
    );
    if (startHidden) doHiding(startHidden);
  }
  //
  // #endregion Inbox cleanup functions
  //

  //
  // #region Game state logic and conversation tracking
  //
  const threadPostParams = (url) => {
    const params = new URLSearchParams(url);
    return [params.get('threadid'), params.get('postid')];
  };
  const isEligibleState = (state) =>
    new Date().getTime() - state.lastPostTime > state.requiredTime || state.otherPostIds.length >= state.requiredPosts;
  const isEligible = (threadId) => threadId in gameStates && isEligibleState(gameStates[threadId]);

  async function checkConversationPosts() {
    timing('Started conversation posts check');
    const lastCheckedConversationDate = GM_getValue('forumgames_lastconversationdate', 0);
    let didUpdates = false;
    let monitoredConversationTitles = Object.values(gameStates).map((state) => state.title);
    debug('Checking monitored titles:', monitoredConversationTitles);
    let page = 1;
    while (~page) {
      await $.apiCall({
        data: {request: 'inbox', type: 'inbox', sort: 'unread', page: page},
      })
        .then(async (data) => {
          const status = data.status;
          if (status !== 'success' || !'response' in data) {
            error(`API returned unsuccessful: ${status}`, data);
            page = -1;
            return;
          }
          const {pages, messages: conversations} = data.response;
          timing(`Processing page ${page}`);
          if (page === pages) {
            page = -1;
          } else {
            ++page;
          }

          const monitoredConversations = conversations
            // Filter conversations that have been updated since last run
            .filter((c) => c && dateFromUTCString(c.date).getTime() > lastCheckedConversationDate)
            // Filter conversations in our monitor list
            .filter((c) => monitoredConversationTitles.includes(messageSubjectToThreadTitle(c)))
            // Get the first matched -- We don't care about any later ones
            .filter((c, _, all) => c === all.find((u) => u.title === c.title));
          if (!monitoredConversations.length) {
            page = -1;
            return;
          }
          if (page == 2) {
            didUpdates = true;
            // Send notification once, but only if we're actually checking something
            window.noty({type: 'warning', text: 'Updating forum games post eligibility. Please wait...'});
          }
          timing(`Filtered page ${page - 1}`);

          await asyncEvery(monitoredConversations, async (conversation) => {
            timing(`Iterating conversations: conversation ${conversation.convId}`);
            const title = messageSubjectToThreadTitle(conversation);
            const state = Object.values(gameStates).find((state) => state.title === title);
            debug('Operating on (title, state):', title, state);
            if (isEligibleState(state)) {
              // Already eligible, no need to check further
              return true;
            }

            // Check the actual messages to count posts
            await $.apiCall({
              data: {request: 'inbox', type: 'viewconv', id: conversation.convId},
            })
              .then((data) => {
                const status = data.status;
                if (status !== 'success' || !'response' in data) {
                  error(`API returned unsuccessful: ${status}`, data);
                  page = -1;
                  return;
                }
                const {messages} = data.response;
                timing(`API call for conversation ${conversation.convId}`);

                messages.every((message) => {
                  const [threadId, postId] = threadPostParams($(message.body).filter('a').attr('href'));
                  if (
                    state.otherPostIds.includes(postId) ||
                    dateFromUTCString(message.sentDate).getTime() <= state.conversationLastCheckTime
                  ) {
                    return false; // Skip the rest
                  }
                  timing(`Conversation ${conversation.convId} message ${message.messageId}`);
                  state.otherPostIds.push(postId); // This results in them being out of order, but does it matter?
                });
              })
              .catch((err) => error(`Error fetching conversation ${conversation.convId} data`, err));
            // Update last check time
            state.conversationLastCheckTime = dateFromUTCString(conversation.date).getTime();
            timing(`Processed messages for conversation ${conversation.convId}`);
            return true;
          });
          GM_setValue(
            'forumgames_lastconversationdate',
            Math.max(
              lastCheckedConversationDate,
              ...monitoredConversations.map((c) => dateFromUTCString(c.date).getTime()),
            ),
          );
        })
        .catch((err) => error('Error fetching inbox data.', err));
      timing(`Processed page ${page - 1}`);
    }

    timing('Finished check');
    debug('forumgames_states from checkConversationPosts', gameStates);
    GM_setValue('forumgames_states', gameStates);
    if (didUpdates) {
      window.noty({type: 'success', text: 'Post eligibility updated.', killer: true});
    }
  }
  //
  // #endregion Game state logic
  //

  //
  // #region Game forum-thread logic
  //
  const isLastPage = () => $('.linkbox_top > :last-child').is('strong');
  const isMonitored = () => threadId() in gameStates;
  const isSubscribed = () => $('#subscribe-link').is(':contains("Unsubscribe")');
  const threadId = () => threadPostParams(window.location.search)[0];
  const getPostId = (post) =>
    parseInt(new URLSearchParams(post.find('a.post_id').attr('href')).get('postid').split('#')[0]);
  const getPostTime = (post) => new Date(post.find('.time').attr('title')).getTime();
  const isForumGame = () =>
    window.location.pathname === '/forums.php' &&
    new URLSearchParams(window.location.search).get('action') === 'viewthread' &&
    $('#content .linkbox_top').prev('h2').find('a:contains("Forum Games")').length;

  function parseLastUserPostInfo() {
    if (isLastPage()) {
      const lastPostByUser = $(`.forum_post a.username[href$='id=${USER_ID}']:visible`).last().closest('table');
      const firstPostOnPage = $('.forum_post');
      const post = lastPostByUser.length ? lastPostByUser : firstPostOnPage;
      const otherPosts = [
        ...(post === firstPostOnPage // Include the first post (not belonging to this user)
          ? [getPostId(firstPostOnPage)]
          : []),
        ...post // Get the post IDs after this one
          .nextAll('table:not(.sticky_post)')
          .map(function () {
            return getPostId($(this));
          })
          .toArray(),
      ];
      const state = gameStates[threadId()];
      const postId =
        state && state.lastPostId
          ? Math.max(state.lastPostId, lastPostByUser.length && getPostId(lastPostByUser))
          : getPostId(post);
      const postTime =
        state && state.lastPostTime
          ? Math.max(state.lastPostTime, lastPostByUser.length && getPostTime(lastPostByUser))
          : getPostTime(post);
      return {lastPostId: postId, lastPostTime: postTime, otherPostIds: otherPosts};
    }
    return {};
  }

  function parseThreadRequirements() {
    const limits = $('h3:contains("Post reply (Limits: ")').text();
    const posts = parseInt(/(\d+)\s+posts/.exec(limits)[0]);
    const time = parseInt(/(\d+)\s+hours/.exec(limits)[0]) * (1000 * 3600); // TODO are there "days" games? or any other time?
    const title = $('.linkbox_top').prev('h2').text().split('>')[2].trim();
    return {requiredPosts: posts, requiredTime: time, title: title, otherPostIds: []};
  }

  function updateGameStates() {
    debug('Updating states');
    gameStates[threadId()] = {...parseThreadRequirements(), ...parseLastUserPostInfo()};
    debug('forumgames_states from updateGameStates', gameStates);
    GM_setValue('forumgames_states', gameStates);
  }

  function changeMonitoring(monitoringOn) {
    if (isMonitored() === monitoringOn) return true;
    if (monitoringOn) {
      window.noty({type: 'success', text: 'Monitoring forum game for post readiness.'});
      updateGameStates();
    } else {
      if (window.confirm('You are about to remove monitoring for this forum game. Press OK to confirm.')) {
        delete gameStates[threadId()];
        debug('forumgames_states from changeMonitoring', gameStates);
        GM_setValue('forumgames_states', gameStates);
      } else {
        return false;
      }
    }
    return true;
  }

  // Patches subscribe/unsubscribe/post to verify unmonitor/notify etc.
  function patchSubscribeAndPost() {
    log('Patching subscribe and post');
    const oldSubscribe = window.subscribe_thread;
    const oldUnsubscribe = window.unsubscribe_thread;
    // Bind our monitoring to subscribe action
    window.subscribe_thread = (passedThreadId) => {
      if (changeMonitoring(true)) oldSubscribe(passedThreadId);
      else $('#subscribe-link a').text('[Subscribe to Thread]');
    };
    window.unsubscribe_thread = (passedThreadId) => {
      if (changeMonitoring(false)) oldUnsubscribe(passedThreadId);
      else $('#subscribe-link a').text('[Unsubscribe from Thread]');
    };
    // Checking/unchecking subscribe checkbox then clicking post does change subscription in the background
    // Handle our monitor/unmonitor prior to that
    $('#quickpostform').on('submit.monitor', () => {
      const monitoringOn = $('#subbox').prop('checked');
      return changeMonitoring(monitoringOn);
    });
  }
  //
  // #endregion Game thread logic
  //

  //
  // #region Forum games forum logic
  //
  const rowAStyle = {backgroundColor: 'var(--rowa)'};
  const rowBStyle = {backgroundColor: 'var(--rowb)'};
  const sharedReadIconStyle = {
    backgroundBlendMode: 'overlay',
    // This needs to come from current stylesheet somehow
    // it's ../images... relative to forums.css but forums.css isn't anywhere
    maskImage: `url('static/styles/${window.document.styleSheetSets[0]}/images/balloon-unread.png')`,
    maskPosition: '50%',
    maskRepeat: 'no-repeat',
  };
  const unreadIconIneligibleStyle = {
    ...sharedReadIconStyle,
    backgroundColor: 'brown', // "red" colors. tomato more rounded, coral lighter, brown has less attention
  };
  const unreadIconEligibleStyle = {
    ...sharedReadIconStyle,
    backgroundColor: 'olive', // "green" colors. olive or olivedrab fit the theme really well
  };
  const readIconIneligibleStyle = {
    ...sharedReadIconStyle,
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  };
  const readIconEligibleStyle = {
    ...sharedReadIconStyle,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
  };

  function isForumGamesForum() {
    const urlParams = new URLSearchParams(window.location.search);
    return (
      window.location.pathname === '/forums.php' &&
      urlParams.get('action') === 'viewforum' &&
      urlParams.get('forumid') === '55'
    );
  }

  function showForumGamePostAvailability() {
    // All thread rows
    $('.forum_55 table.forum_index tr:not(.colhead)')
      .filter(function notStaticOrLockedThreadRow() {
        // if first td hasClass unread_locked_sticky read_locked_sticky unread_sticky read_sticky, skip it
        return !$(this).find(
          'td.unread_locked_sticky, td.read_locked_sticky, ' +
            'td.unread_sticky, td.read_sticky, ' +
            'td.unread_locked, td.read_locked',
        ).length;
      })
      .filter(function trackedGameThreadRow() {
        // if this thread is monitored
        return threadPostParams($(this).find('.last_topic strong a').attr('href'))[0] in gameStates;
      })
      .each(function colorTrackedUnreadIndicator() {
        const threadId = threadPostParams($(this).find('.last_topic strong a').attr('href'))[0];
        const participationEligible = isEligible(threadId);
        const icon = $(this)
          .children('td:first-child') // Unread indicator
          // Test that it is an unread indicator, for coloring, and hasn't been colored
          .filter(':not(.icon--eligible, .icon--ineligible)')
          .attr(
            'title',
            `You are ${participationEligible ? 'eligible' : 'ineligible'} to participate in this forum game.`,
          );
        if (icon.is('.unread'))
          icon
            .addClass(participationEligible ? 'icon--eligible' : 'icon--ineligible')
            .css(participationEligible ? unreadIconEligibleStyle : unreadIconIneligibleStyle);
        else
          icon
            .addClass(participationEligible ? 'icon--eligible' : 'icon--ineligible')
            .css(participationEligible ? readIconEligibleStyle : readIconIneligibleStyle);
        if ($(this).hasClass('rowa')) $(this).css(rowAStyle);
        else $(this).css(rowBStyle);
      });

    // rerun on document mutation, eg. endless scroll scripts
    var observer = new MutationObserver(() => {
      observer.disconnect();
      showForumGamePostAvailability();
    });
    observer.observe($('.forum_55 table.forum_index')[0], {
      attributes: false,
      childList: true,
      characterData: false,
      subtree: true,
    });
  }
  //
  // #endregion Forum games forum logic
  //

  if (isForumGame()) {
    patchSubscribeAndPost();
    if (!isMonitored() && isSubscribed()) changeMonitoring(true);
    if (isMonitored() && isLastPage()) updateGameStates();
    log('Current thread state:', gameStates[threadId()]);
    checkConversationPosts();
  } else if (isForumGamesForum()) {
    showForumGamePostAvailability();
    await checkConversationPosts();
    showForumGamePostAvailability();
  } else {
    cleanInbox();
  }
  window.gameStates = gameStates;
})(unsafeWindow || window, (unsafeWindow || window).jQuery);
