import './styles/all-styles';
import {GazelleApi} from './api';
import Forum from './forum';
import ForumThread from './forum-thread';
import {ConsoleLog} from './log';
import {ForumGameStore} from './store';
import {StyleFactory} from './styles/style';

('use strict');

declare global {
  interface Window {
    noty: (options: {type: 'error' | 'warn' | 'success'; text: string}) => void;
  }
}

(async function () {
  const LOG = new ConsoleLog('[GGn Forum Games Helper]');
  const STORE = new ForumGameStore();
  await STORE.init();
  const API = new GazelleApi(STORE, LOG);
  new Menu(LOG);

  if (new URLSearchParams(window.location.search).get('action') === 'viewthread' && ForumThread.isForumGame) {
    new ForumThread(API, LOG, STORE, Number(new URLSearchParams(window.location.search).get('threadid'))).init();
  } else {
    const STYLE = StyleFactory.build();
    new Forum(API, STORE, STYLE);
  }
})();
