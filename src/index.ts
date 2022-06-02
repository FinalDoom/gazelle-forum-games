import './styles/all-styles';
import Api from './api';
import Forum from './forum';
import ForumThread from './forum-thread';
import Log from './log';
import Store from './store';
import {StyleFactory} from './styles/style';

('use strict');

declare global {
  interface Window {
    noty: (options: {type: 'error' | 'warn' | 'success'; text: string}) => void;
  }
}

(async function () {
  const LOG = new Log('[GGn Forum Games Helper]');
  const STORE = new Store();
  await STORE.init();
  const API = new Api(STORE, LOG);
  if (new URLSearchParams(window.location.search).has('viewthread') && ForumThread.isForumGame) {
    const THREAD = new ForumThread(
      API,
      LOG,
      STORE,
      Number(new URLSearchParams(window.location.search).get('threadid')),
    );
    THREAD.init();
  } else {
    const STYLE = StyleFactory.build();
    new Forum(API, STORE, STYLE);
  }
})();
