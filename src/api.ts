import Log from './log';
import Store from './store';

export const TEN_SECOND_DELAY_MILLIS = 11000;
export const MAX_API_QUERIES_BEFORE_THROTTLE = 5;

interface ThreadInfo {
  postCountLimit: number;
  postTimeLimit: number;
  canPost: boolean;
}

export default class Api {
  #key: string;
  #log: Log;
  #store: Store;

  constructor(store: Store, log: Log) {
    this.#store = store;
    this.#log = log;

    this.#key = this.#store.apiKey;
    if (!this.#key) {
      const input = window.prompt(`Please input your GGn API key.
If you don't have one, please generate one from your Edit Profile page: https://gazellegames.net/user.php?action=edit.
The API key must have "Items" permission

Please disable this userscript until you have one as this prompt will continue to show until you enter one in.`);
      const trimmed = input.trim();

      if (/[a-f0-9]{64}/.test(trimmed)) {
        this.#store.apiKey = trimmed;
        this.#key = trimmed;
      }
    }
  }

  // Execute an API call and also handle throttling to 5 calls per 10 seconds
  async call(options: JQuery.AjaxSettings) {
    while (true) {
      const nowTimeBeforeWait = new Date().getTime();
      if (
        this.#store.apiTenSecondRequests >= MAX_API_QUERIES_BEFORE_THROTTLE &&
        nowTimeBeforeWait - this.#store.apiTenSecondTime < TEN_SECOND_DELAY_MILLIS
      ) {
        this.#log.log(
          () =>
            `Waiting ${((TEN_SECOND_DELAY_MILLIS - (nowTimeBeforeWait - this.#store.apiTenSecondTime)) / 1000).toFixed(
              1,
            )} seconds for more API calls.`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, TEN_SECOND_DELAY_MILLIS - (nowTimeBeforeWait - this.#store.apiTenSecondTime)),
        );
      } else {
        break;
      }
    }
    if (new Date().getTime() - this.#store.apiTenSecondTime > TEN_SECOND_DELAY_MILLIS) {
      this.#store.resetApiThrottle();
    }
    this.#store.incrementApiRequestsCount();

    this.#log.debug('API call', options.data);
    return $.ajax({
      ...options,
      method: 'GET',
      url: '/api.php',
      headers: {'X-API-Key': this.#key},
    }).then((data) => {
      const status = data.status;
      if (status !== 'success' || !('response' in data)) {
        this.#log.error(`API returned unsuccessful: ${status}`, data);
        return;
      }
      return data.response;
    });
  }

  async threadInfo(threadId): Promise<false | ThreadInfo> {
    return await this.call({data: {request: 'forums', type: 'thread_info', id: threadId}})
      // Also available title and subscribed
      .then(({id, forumID, locked, postCountLimit, postTimeLimit, canPost}) => {
        if (parseInt(forumID) !== 55) {
          const fail = `Thread ${id} is not a forum game post`;
          this.#log.error(fail);
          throw fail;
        }
        if (locked) return undefined;
        return {
          postCountLimit: Number(postCountLimit),
          postTimeLimit: Number(postTimeLimit),
          canPost: canPost.toString() === 'true',
        };
      })
      .catch((reason) => {
        this.#log.error(reason);
        return reason !== 'thread does not exist' ? false : undefined;
      });
  }
}
