// ==UserScript==
// @name        GGn Forum Games Checker
// @description Tracks forum games participation eligibility and marks thread read indicators accordingly.
// @namespace   https://gazellegames.net/
// @require     https://code.jquery.com/jquery-3.6.0.js
// @match       https://gazellegames.net/forums.php?*action=viewforum&forumid=55*
// @match       https://gazellegames.net/forums.php?*action=viewthread&threadid=*
// @version     3.1.1
// @homepage    https://github.com/FinalDoom/gazelle-forum-games
// @author      FinalDoom
// @license     ISC
// @grant       GM.getValue
// @grant       GM.setValue
// ==/UserScript==

/*
ISC License

Copyright (c) 2022 FinalDoom

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.*/

/* globals React, ReactDOM */
(function () {
  'use strict';

  

  function ___$insertStylesToHeader(css) {
    if (!css) {
      return
    }
    if (typeof window === 'undefined') {
      return
    }

    const style = document.createElement('style');

    style.setAttribute('type', 'text/css');
    style.innerHTML = css;
    document.head.appendChild(style);
    return css
  }

  ___$insertStylesToHeader(".forum-games-checker-game_room__row.rowa {\n  background-color: var(--rowa); }\n\n.forum-games-checker-game_room__row.rowb {\n  background-color: var(--rowb); }\n\n.forum-games-checker-game_room__row--unread-ineligible td:first-of-type {\n  background-blend-mode: overlay;\n  background-color: brown;\n  mask-image: url(\"static/styles/game_room/images/balloon-unread.png\");\n  mask-position: 50%;\n  mask-repeat: no-repeat; }\n\n.forum-games-checker-game_room__row--unread-eligible td:first-of-type {\n  background-blend-mode: overlay;\n  background-color: olive;\n  mask-image: url(\"static/styles/game_room/images/balloon-unread.png\");\n  mask-position: 50%;\n  mask-repeat: no-repeat; }\n\n.forum-games-checker-game_room__row--read-ineligible td:first-of-type {\n  background-blend-mode: overlay;\n  background-color: rgba(255, 0, 0, 0.3);\n  mask-image: url(\"static/styles/game_room/images/balloon-unread.png\");\n  mask-position: 50%;\n  mask-repeat: no-repeat; }\n\n.forum-games-checker-game_room__row--read-eligible td:first-of-type {\n  background-blend-mode: overlay;\n  background-color: rgba(0, 255, 0, 0.2);\n  mask-image: url(\"static/styles/game_room/images/balloon-unread.png\");\n  mask-position: 50%;\n  mask-repeat: no-repeat; }\n");

  /******************************************************************************
  Copyright (c) Microsoft Corporation.

  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** */
  function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
  }
  function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
  }

  ___$insertStylesToHeader(".forum-games-checker-default__row--unread-ineligible span.last_topic::before {\n  content: '';\n  border-radius: 7.5px;\n  background-color: red;\n  float: left;\n  margin-right: 5px;\n  margin-top: 3px;\n  height: 15px;\n  width: 15px; }\n\n.forum-games-checker-default__row--unread-eligible span.last_topic::before {\n  content: '';\n  border-radius: 7.5px;\n  background-color: green;\n  float: left;\n  margin-right: 5px;\n  margin-top: 3px;\n  height: 15px;\n  width: 15px; }\n\n.forum-games-checker-default__row--read-ineligible span.last_topic::before {\n  content: '';\n  border-radius: 7.5px;\n  background-color: red;\n  float: left;\n  margin-right: 5px;\n  margin-top: 3px;\n  height: 15px;\n  width: 15px; }\n\n.forum-games-checker-default__row--read-eligible span.last_topic::before {\n  content: '';\n  border-radius: 7.5px;\n  background-color: green;\n  float: left;\n  margin-right: 5px;\n  margin-top: 3px;\n  height: 15px;\n  width: 15px; }\n");

  var _BaseStyle_rowClassName;
  class StyleFactory {
      static build() {
          return StyleFactory.registeredStyles.find(([testFunction, _]) => testFunction())[1]();
      }
      static registerStyle(testFunction, createFunction) {
          this.registeredStyles.unshift([testFunction, createFunction]);
      }
  }
  StyleFactory.registeredStyles = [
      [() => true, () => new BaseStyle('forum-games-checker-default__row')],
  ];
  class BaseStyle {
      constructor(rowClassName) {
          _BaseStyle_rowClassName.set(this, void 0);
          __classPrivateFieldSet(this, _BaseStyle_rowClassName, rowClassName, "f");
      }
      modifyIcon(icon, canPost) {
          console.log(icon, icon.find('.last_topic'));
          icon
              .next()
              .find('.last_topic')
              .attr('title', `You are ${canPost ? 'eligible' : 'ineligible'} to participate in this forum game.`);
      }
      setPostState(threadId, canPost) {
          const icon = $(`a[href$='threadid=${threadId}']`).closest('td').prev();
          this.modifyIcon(icon, canPost);
          if (!icon.length ||
              // Technically only locked should be excluded, but we don't have sticky logic
              icon.is('.unread_locked_sticky, .read_locked_sticky, ' +
                  '.unread_sticky, .read_sticky, ' +
                  '.unread_locked, .read_locked')) {
              return;
          }
          const row = icon.closest('tr');
          console.log(threadId, threadId, canPost);
          if (icon.is('.unread')) {
              if (canPost)
                  this.styleRow(row, 'unread-eligible');
              else
                  this.styleRow(row, 'unread-ineligible');
          }
          else {
              if (canPost)
                  this.styleRow(row, 'read-eligible');
              else
                  this.styleRow(row, 'read-ineligible');
          }
      }
      styleRow(row, stateName) {
          row.addClass([__classPrivateFieldGet(this, _BaseStyle_rowClassName, "f"), __classPrivateFieldGet(this, _BaseStyle_rowClassName, "f") + '--' + stateName]);
      }
  }
  _BaseStyle_rowClassName = new WeakMap();

  StyleFactory.registerStyle(() => $('link[rel="stylesheet"][title]').attr('title') === 'game_room', () => new GameRoomStyle());
  class GameRoomStyle extends BaseStyle {
      constructor() {
          super('forum-games-checker-game_room__row');
      }
      modifyIcon(icon, canPost) {
          icon.attr('title', `You are ${canPost ? 'eligible' : 'ineligible'} to participate in this forum game.`);
      }
  }

  var _Api_key, _Api_log, _Api_store;
  const TEN_SECOND_DELAY_MILLIS = 11000;
  const MAX_API_QUERIES_BEFORE_THROTTLE = 5;
  class Api {
      constructor(store, log) {
          _Api_key.set(this, void 0);
          _Api_log.set(this, void 0);
          _Api_store.set(this, void 0);
          __classPrivateFieldSet(this, _Api_store, store, "f");
          __classPrivateFieldSet(this, _Api_log, log, "f");
          __classPrivateFieldSet(this, _Api_key, __classPrivateFieldGet(this, _Api_store, "f").apiKey, "f");
          if (!__classPrivateFieldGet(this, _Api_key, "f")) {
              const input = window.prompt(`Please input your GGn API key.
If you don't have one, please generate one from your Edit Profile page: https://gazellegames.net/user.php?action=edit.
The API key must have "Items" permission

Please disable this userscript until you have one as this prompt will continue to show until you enter one in.`);
              const trimmed = input.trim();
              if (/[a-f0-9]{64}/.test(trimmed)) {
                  __classPrivateFieldGet(this, _Api_store, "f").apiKey = trimmed;
                  __classPrivateFieldSet(this, _Api_key, trimmed, "f");
              }
          }
      }
      // Execute an API call and also handle throttling to 5 calls per 10 seconds
      async call(options) {
          while (true) {
              const nowTimeBeforeWait = new Date().getTime();
              if (__classPrivateFieldGet(this, _Api_store, "f").apiTenSecondRequests >= MAX_API_QUERIES_BEFORE_THROTTLE &&
                  nowTimeBeforeWait - __classPrivateFieldGet(this, _Api_store, "f").apiTenSecondTime < TEN_SECOND_DELAY_MILLIS) {
                  __classPrivateFieldGet(this, _Api_log, "f").log(() => `Waiting ${((TEN_SECOND_DELAY_MILLIS - (nowTimeBeforeWait - __classPrivateFieldGet(this, _Api_store, "f").apiTenSecondTime)) / 1000).toFixed(1)} seconds for more API calls.`);
                  await new Promise((resolve) => setTimeout(resolve, TEN_SECOND_DELAY_MILLIS - (nowTimeBeforeWait - __classPrivateFieldGet(this, _Api_store, "f").apiTenSecondTime)));
              }
              else {
                  break;
              }
          }
          if (new Date().getTime() - __classPrivateFieldGet(this, _Api_store, "f").apiTenSecondTime > TEN_SECOND_DELAY_MILLIS) {
              __classPrivateFieldGet(this, _Api_store, "f").resetApiThrottle();
          }
          __classPrivateFieldGet(this, _Api_store, "f").incrementApiRequestsCount();
          __classPrivateFieldGet(this, _Api_log, "f").debug('API call', options.data);
          return $.ajax({
              ...options,
              method: 'GET',
              url: '/api.php',
              headers: { 'X-API-Key': __classPrivateFieldGet(this, _Api_key, "f") },
          }).then((data) => {
              const status = data.status;
              if (status !== 'success' || !('response' in data)) {
                  __classPrivateFieldGet(this, _Api_log, "f").error(`API returned unsuccessful: ${status}`, data);
                  return;
              }
              return data.response;
          });
      }
      async threadInfo(threadId) {
          return await this.call({ data: { request: 'forums', type: 'thread_info', id: threadId } })
              // Also available title and subscribed
              .then(({ id, forumID, locked, postCountLimit, postTimeLimit, canPost }) => {
              if (parseInt(forumID) !== 55) {
                  const fail = `Thread ${id} is not a forum game post`;
                  __classPrivateFieldGet(this, _Api_log, "f").error(fail);
                  throw fail;
              }
              if (locked)
                  return undefined;
              return {
                  postCountLimit: Number(postCountLimit),
                  postTimeLimit: Number(postTimeLimit),
                  canPost: canPost.toString() === 'true',
              };
          })
              .catch((reason) => {
              __classPrivateFieldGet(this, _Api_log, "f").error(reason);
              return reason !== 'thread does not exist' ? false : undefined;
          });
      }
  }
  _Api_key = new WeakMap(), _Api_log = new WeakMap(), _Api_store = new WeakMap();

  var _Store_instances, _Store_apiKey, _Store_apiTenSecondRequests, _Store_apiTenSecondTime, _Store_gameStates, _Store_initGM, _Store_initLocalStorage, _Store_notifyStoreChanged, _Store_setGM, _Store_setLocalStorage, _Store_storageListener, _Store_allGameStates;
  const GM_KEYS = {
      apiKey: 'forumgames_apikey',
  };
  const LOCAL_STORAGE_KEYS = {
      apiTenSecondTime: 'forumGamesTenSecondTime',
      apiTenSecondRequests: 'forumGamesApiRequests',
  };
  const KEY_GAME_STATE_PREFIX = 'forumGamesState';
  class Store {
      constructor() {
          _Store_instances.add(this);
          _Store_apiKey.set(this, void 0);
          _Store_apiTenSecondRequests.set(this, void 0);
          _Store_apiTenSecondTime.set(this, void 0);
          _Store_gameStates.set(this, void 0);
      }
      async init() {
          __classPrivateFieldSet(this, _Store_apiKey, await __classPrivateFieldGet(this, _Store_instances, "m", _Store_initGM).call(this, 'apiKey'), "f");
          __classPrivateFieldSet(this, _Store_apiTenSecondRequests, __classPrivateFieldGet(this, _Store_instances, "m", _Store_initLocalStorage).call(this, 'apiTenSecondRequests', 0), "f");
          __classPrivateFieldSet(this, _Store_apiTenSecondTime, __classPrivateFieldGet(this, _Store_instances, "m", _Store_initLocalStorage).call(this, 'apiTenSecondTime', 0), "f");
          __classPrivateFieldSet(this, _Store_gameStates, __classPrivateFieldGet(this, _Store_instances, "m", _Store_allGameStates).call(this), "f");
          window.addEventListener('storage', __classPrivateFieldGet(this, _Store_instances, "m", _Store_storageListener));
      }
      get apiKey() {
          return __classPrivateFieldGet(this, _Store_apiKey, "f");
      }
      set apiKey(key) {
          const oldValue = __classPrivateFieldGet(this, _Store_apiKey, "f");
          __classPrivateFieldSet(this, _Store_apiKey, key, "f");
          __classPrivateFieldGet(this, _Store_instances, "m", _Store_setGM).call(this, 'apiKey', oldValue, key);
      }
      // API-related functions
      get apiTenSecondRequests() {
          return __classPrivateFieldGet(this, _Store_apiTenSecondRequests, "f");
      }
      set apiTenSecondRequests(requests) {
          const oldValue = __classPrivateFieldGet(this, _Store_apiTenSecondRequests, "f");
          __classPrivateFieldSet(this, _Store_apiTenSecondRequests, requests, "f");
          __classPrivateFieldGet(this, _Store_instances, "m", _Store_setLocalStorage).call(this, 'apiTenSecondRequests', oldValue, requests);
      }
      get apiTenSecondTime() {
          return __classPrivateFieldGet(this, _Store_apiTenSecondTime, "f");
      }
      set apiTenSecondTime(time) {
          const oldValue = __classPrivateFieldGet(this, _Store_apiTenSecondTime, "f");
          __classPrivateFieldSet(this, _Store_apiTenSecondTime, time, "f");
          __classPrivateFieldGet(this, _Store_instances, "m", _Store_setLocalStorage).call(this, 'apiTenSecondTime', oldValue, time);
      }
      resetApiThrottle() {
          this.apiTenSecondRequests = 0;
          this.apiTenSecondTime = new Date().getTime();
      }
      incrementApiRequestsCount() {
          this.apiTenSecondRequests = __classPrivateFieldGet(this, _Store_apiTenSecondRequests, "f") + 1;
      }
      // Game state-related functions
      getGameState(threadId) {
          const key = typeof threadId === 'string' && threadId.startsWith(KEY_GAME_STATE_PREFIX)
              ? Store.keyToThreadId(threadId)
              : Number(threadId);
          return __classPrivateFieldGet(this, _Store_gameStates, "f").get(key);
      }
      setGameState(threadId, state) {
          const key = KEY_GAME_STATE_PREFIX + threadId;
          const oldValue = __classPrivateFieldGet(this, _Store_gameStates, "f").get(threadId);
          __classPrivateFieldGet(this, _Store_gameStates, "f").set(threadId, state);
          window.localStorage.setItem(key, JSON.stringify(state));
          window.dispatchEvent(new StorageEvent('storage', { key: key, newValue: JSON.stringify(state), oldValue: JSON.stringify(oldValue) }));
      }
      get gameStates() {
          return __classPrivateFieldGet(this, _Store_gameStates, "f");
      }
      isGameMonitored(threadId) {
          return threadId in __classPrivateFieldGet(this, _Store_gameStates, "f");
      }
      removeMonitoring(threadId) {
          if (threadId in __classPrivateFieldGet(this, _Store_gameStates, "f")) {
              const oldValue = __classPrivateFieldGet(this, _Store_gameStates, "f").get(threadId);
              __classPrivateFieldGet(this, _Store_gameStates, "f").delete(threadId);
              window.dispatchEvent(new StorageEvent('storage', {
                  key: KEY_GAME_STATE_PREFIX + threadId,
                  newValue: undefined,
                  oldValue: JSON.stringify(oldValue),
              }));
          }
      }
      static keyToThreadId(key) {
          return Number(key.substring(15));
      }
  }
  _Store_apiKey = new WeakMap(), _Store_apiTenSecondRequests = new WeakMap(), _Store_apiTenSecondTime = new WeakMap(), _Store_gameStates = new WeakMap(), _Store_instances = new WeakSet(), _Store_initGM = async function _Store_initGM(name, defaultValue) {
      if (!(await GM.getValue(GM_KEYS[name])) && defaultValue) {
          await GM.setValue(GM_KEYS[name], defaultValue);
          return defaultValue;
      }
      return await GM.getValue(GM_KEYS[name]);
  }, _Store_initLocalStorage = function _Store_initLocalStorage(name, defaultValue, stringify = JSON.stringify, parse = JSON.parse) {
      if (!window.localStorage.hasOwnProperty(LOCAL_STORAGE_KEYS[name])) {
          window.localStorage.setItem(LOCAL_STORAGE_KEYS[name], stringify(defaultValue));
          return defaultValue;
      }
      return parse(window.localStorage.getItem(LOCAL_STORAGE_KEYS[name]));
  }, _Store_notifyStoreChanged = function _Store_notifyStoreChanged(name, oldValue, newValue) {
      window.dispatchEvent(new StorageEvent('storage', { key: name, newValue: JSON.stringify(newValue), oldValue: JSON.stringify(oldValue) }));
  }, _Store_setGM = async function _Store_setGM(name, oldValue, newValue) {
      console.log('setgm', name, oldValue, newValue);
      if (oldValue !== newValue) {
          if (newValue !== undefined)
              await GM.setValue(GM_KEYS[name], newValue);
          else
              await GM.deleteValue(GM_KEYS[name]);
          console.log('set', await GM.getValue(GM_KEYS[name]));
          __classPrivateFieldGet(this, _Store_instances, "m", _Store_notifyStoreChanged).call(this, name, oldValue, newValue);
      }
  }, _Store_setLocalStorage = function _Store_setLocalStorage(name, oldValue, newValue, stringify = JSON.stringify) {
      if (oldValue !== newValue) {
          if (newValue !== undefined)
              window.localStorage.setItem(LOCAL_STORAGE_KEYS[name], stringify(newValue));
          else
              window.localStorage.removeItem(LOCAL_STORAGE_KEYS[name]);
          __classPrivateFieldGet(this, _Store_instances, "m", _Store_notifyStoreChanged).call(this, name, oldValue, newValue);
      }
  }, _Store_storageListener = function _Store_storageListener(storageEvent) {
      if (storageEvent.key in this) {
          const key = storageEvent.key;
          this[key] = JSON.parse(storageEvent.newValue);
      }
      else if (storageEvent.key.startsWith(KEY_GAME_STATE_PREFIX)) {
          if (storageEvent.newValue)
              __classPrivateFieldGet(this, _Store_gameStates, "f").set(Store.keyToThreadId(storageEvent.key), JSON.parse(storageEvent.newValue));
          else
              __classPrivateFieldGet(this, _Store_gameStates, "f").delete(Store.keyToThreadId(storageEvent.key));
      }
  }, _Store_allGameStates = function _Store_allGameStates() {
      return new Map(Object.keys(window.localStorage)
          .filter((key) => key.startsWith(KEY_GAME_STATE_PREFIX))
          .map((key) => [Number(Store.keyToThreadId(key)), JSON.parse(window.localStorage.getItem(key))]));
  };

  var _Forum_api, _Forum_store, _Forum_style;
  class Forum {
      constructor(api, store, style) {
          _Forum_api.set(this, void 0);
          _Forum_store.set(this, void 0);
          _Forum_style.set(this, void 0);
          __classPrivateFieldSet(this, _Forum_api, api, "f");
          __classPrivateFieldSet(this, _Forum_store, store, "f");
          __classPrivateFieldSet(this, _Forum_style, style, "f");
          this.showForumGamePostAvailability();
          this.listenForMorePages();
          this.recheckEligibility();
          window.addEventListener('storage', (event) => event.key.startsWith(KEY_GAME_STATE_PREFIX) && this.showForumGamePostAvailability());
      }
      showForumGamePostAvailability() {
          for (const [key, state] of __classPrivateFieldGet(this, _Forum_store, "f").gameStates.entries()) {
              __classPrivateFieldGet(this, _Forum_style, "f").setPostState(key, state.canPost);
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
          for (const [key, { nextPostTime }] of Object.entries(__classPrivateFieldGet(this, _Forum_store, "f").gameStates)) {
              await new Promise((resolve) => window.setTimeout(async () => {
                  const threadId = Store.keyToThreadId(key);
                  const threadInfo = await __classPrivateFieldGet(this, _Forum_api, "f").threadInfo(threadId);
                  if (threadInfo) {
                      __classPrivateFieldGet(this, _Forum_store, "f").setGameState(threadId, { nextPostTime: nextPostTime, ...threadInfo });
                  }
                  resolve();
              }, TEN_SECOND_DELAY_MILLIS / MAX_API_QUERIES_BEFORE_THROTTLE));
          }
          window.setTimeout(this.recheckEligibility.bind(this), 60000);
      }
  }
  _Forum_api = new WeakMap(), _Forum_store = new WeakMap(), _Forum_style = new WeakMap();

  var _ForumThread_instances, _ForumThread_api, _ForumThread_log, _ForumThread_store, _ForumThread_threadId, _ForumThread_getRecentPostInfo;
  class ForumThread {
      constructor(api, log, store, threadId) {
          _ForumThread_instances.add(this);
          _ForumThread_api.set(this, void 0);
          _ForumThread_log.set(this, void 0);
          _ForumThread_store.set(this, void 0);
          _ForumThread_threadId.set(this, void 0);
          __classPrivateFieldSet(this, _ForumThread_api, api, "f");
          __classPrivateFieldSet(this, _ForumThread_log, log, "f");
          __classPrivateFieldSet(this, _ForumThread_store, store, "f");
          __classPrivateFieldSet(this, _ForumThread_threadId, threadId, "f");
          this.isLastPage = $('.linkbox_top > :last-child').is('strong');
      }
      static getPostId(post) {
          return parseInt(new URLSearchParams(post.find('a.post_id').attr('href')).get('postid').split('#')[0]);
      }
      static getPostTime(post) {
          return new Date(post.find('.time').attr('title')).getTime();
      }
      static get isForumGame() {
          return (window.location.pathname === '/forums.php' &&
              new URLSearchParams(window.location.search).get('action') === 'viewthread' &&
              $('#content .linkbox_top').prev('h2').find('a:contains("Forum Games")').length);
      }
      get isMonitored() {
          return __classPrivateFieldGet(this, _ForumThread_store, "f").isGameMonitored(__classPrivateFieldGet(this, _ForumThread_threadId, "f"));
      }
      get state() {
          return __classPrivateFieldGet(this, _ForumThread_store, "f").getGameState(__classPrivateFieldGet(this, _ForumThread_threadId, "f"));
      }
      set state(state) {
          __classPrivateFieldGet(this, _ForumThread_store, "f").setGameState(__classPrivateFieldGet(this, _ForumThread_threadId, "f"), state);
      }
      async changeMonitoring(monitoringOn) {
          if (this.isMonitored === monitoringOn)
              return true;
          if (monitoringOn) {
              window.noty({ type: 'success', text: 'Monitoring forum game for post readiness.' });
              const threadInfo = await __classPrivateFieldGet(this, _ForumThread_api, "f").threadInfo(__classPrivateFieldGet(this, _ForumThread_threadId, "f"));
              if (threadInfo) {
                  this.state = threadInfo;
              }
          }
          else {
              if (window.confirm('You are about to remove monitoring for this forum game. Press OK to confirm.')) {
                  __classPrivateFieldGet(this, _ForumThread_store, "f").removeMonitoring(__classPrivateFieldGet(this, _ForumThread_threadId, "f"));
              }
              else {
                  return false;
              }
          }
          return true;
      }
      async init() {
          // Add link / checkbox to monitor thread
          const thread = this;
          $('#subscribe-link').after($('<a>')
              .text(this.isMonitored ? '[ Unmonitor this game ]' : '[ Monitor this game ]')
              .click(async function () {
              await thread.changeMonitoring(!thread.isMonitored);
              $(this).text(thread.isMonitored ? '[ Unmonitor this game ]' : '[ Monitor this game ]');
          }));
          let checkbox;
          $('#subbox')
              .next()
              .after($('<label>').append((checkbox = $('<input type="checkbox" id="monitoring" />').attr('checked', this.isMonitored.toString())), 'Monitor game'));
          $('#quickpostform').on('submit.monitor', async () => {
              return await this.changeMonitoring(checkbox.prop('checked'));
          });
          // Update state if monitored
          if (this.isMonitored && this.isLastPage) {
              const state = this.state;
              const { canPost: previousCanPost } = state;
              if (state) {
                  __classPrivateFieldGet(this, _ForumThread_log, "f").debug('Updating states from', state);
                  const { lastPostTime, otherPostIds } = __classPrivateFieldGet(this, _ForumThread_instances, "m", _ForumThread_getRecentPostInfo).call(this);
                  const nextPostTime = new Date(lastPostTime + state.postTimeLimit * 3600000);
                  state.nextPostTime = nextPostTime;
                  state.canPost = otherPostIds.length >= state.postCountLimit || nextPostTime < new Date();
                  __classPrivateFieldGet(this, _ForumThread_log, "f").debug('New state', state);
                  if (previousCanPost != state.canPost)
                      __classPrivateFieldGet(this, _ForumThread_store, "f").setGameState(__classPrivateFieldGet(this, _ForumThread_threadId, "f"), state);
              }
          }
          __classPrivateFieldGet(this, _ForumThread_log, "f").log('Current thread state:', () => this.state);
      }
  }
  _ForumThread_api = new WeakMap(), _ForumThread_log = new WeakMap(), _ForumThread_store = new WeakMap(), _ForumThread_threadId = new WeakMap(), _ForumThread_instances = new WeakSet(), _ForumThread_getRecentPostInfo = function _ForumThread_getRecentPostInfo() {
      if (this.isLastPage) {
          const userId = $('#nav_userinfo a')
              .attr('href')
              .match(/id=(\d+)/)[1];
          const lastPostByUser = $(`.forum_post a.username[href$='id=${userId}']:visible`).last().closest('table');
          const firstPostOnPage = $('.forum_post');
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
          return { lastPostTime: ForumThread.getPostTime(lastPostByUser), otherPostIds: otherPosts };
      }
  };

  var _Log_instances, _Log_level, _Log_prefix, _Log_start, _Log_logToConsole;
  var LogLevel;
  (function (LogLevel) {
      LogLevel[LogLevel["None"] = 0] = "None";
      LogLevel[LogLevel["Error"] = 1] = "Error";
      LogLevel[LogLevel["Warning"] = 2] = "Warning";
      LogLevel[LogLevel["Log"] = 3] = "Log";
      LogLevel[LogLevel["Debug"] = 4] = "Debug";
      LogLevel[LogLevel["Timing"] = 5] = "Timing";
  })(LogLevel || (LogLevel = {}));
  class Log {
      constructor(prefix, level = LogLevel.Log) {
          _Log_instances.add(this);
          _Log_level.set(this, void 0);
          _Log_prefix.set(this, void 0);
          _Log_start.set(this, new Date());
          __classPrivateFieldSet(this, _Log_prefix, prefix, "f");
          __classPrivateFieldSet(this, _Log_level, level, "f");
      }
      timing(...args) {
          if (__classPrivateFieldGet(this, _Log_level, "f") >= LogLevel.Timing)
              __classPrivateFieldGet(this, _Log_instances, "m", _Log_logToConsole).call(this, console.debug, () => `(${new Date().valueOf() - __classPrivateFieldGet(this, _Log_start, "f").valueOf()})`, ...args);
      }
      debug(...args) {
          if (__classPrivateFieldGet(this, _Log_level, "f") >= LogLevel.Debug)
              __classPrivateFieldGet(this, _Log_instances, "m", _Log_logToConsole).call(this, console.debug, ...args);
      }
      log(...args) {
          if (__classPrivateFieldGet(this, _Log_level, "f") >= LogLevel.Log)
              __classPrivateFieldGet(this, _Log_instances, "m", _Log_logToConsole).call(this, console.log, ...args);
      }
      warn(...args) {
          if (__classPrivateFieldGet(this, _Log_level, "f") >= LogLevel.Warning)
              __classPrivateFieldGet(this, _Log_instances, "m", _Log_logToConsole).call(this, console.warn, ...args);
      }
      error(...args) {
          if (__classPrivateFieldGet(this, _Log_level, "f") >= LogLevel.Error)
              __classPrivateFieldGet(this, _Log_instances, "m", _Log_logToConsole).call(this, console.error, ...args);
      }
  }
  _Log_level = new WeakMap(), _Log_prefix = new WeakMap(), _Log_start = new WeakMap(), _Log_instances = new WeakSet(), _Log_logToConsole = function _Log_logToConsole(logMethod, ...args) {
      const resolvedArgs = args.map((arg) => (typeof arg === 'function' ? arg() : arg));
      logMethod(__classPrivateFieldGet(this, _Log_prefix, "f"), ...resolvedArgs);
  };

  (async function () {
      const LOG = new Log('[GGn Forum Games Helper]');
      const STORE = new Store();
      await STORE.init();
      const API = new Api(STORE, LOG);
      if (new URLSearchParams(window.location.search).get('action') === 'viewthread' && ForumThread.isForumGame) {
          const THREAD = new ForumThread(API, LOG, STORE, Number(new URLSearchParams(window.location.search).get('threadid')));
          THREAD.init();
      }
      else {
          const STYLE = StyleFactory.build();
          new Forum(API, STORE, STYLE);
      }
  })();

})();
