import Log from './log';
import Store from './store';

export const TEN_SECOND_DELAY_MILLIS = 11000;
export const MAX_API_QUERIES_BEFORE_THROTTLE = 5;

/**
 * Top-level structure of a success response from the API.
 */
interface SuccessfulApiResponse<T> {
  status: 'success';
  response: T;
}
/**
 * Top-level structure of a failure response from the API.
 */
interface FailureApiResponse {
  status: 'failure';
  error: string;
}
type ApiResponse<T> = SuccessfulApiResponse<T> | FailureApiResponse;

/**
 * JSON returned by thread info API endpoint
 */
interface ApiThreadInfo {
  /** Thread ID as a string */
  id: string;
  /** Forum ID as a string */
  forumID: string;
  /** true if the thread is locked */
  locked: boolean;
  /** Number of posts by other users requried until user can post again */
  postCountLimit: string;
  /** Amount of time that must pass until user can post again (if postCountLimit not satisfied) */
  postTimeLimit: string;
  /** true if the thread can be posted in */
  canPost: boolean;
  /** true if the thread is subscribed to */
  subscribed: boolean;
}

interface ThreadInfo {
  postCountLimit: number;
  postTimeLimit: number;
  canPost: boolean;
}

export default interface Api {
  /**
   * Execute a call against an API endpoint with throttling.
   *
   * @param data url parameters to pass in the api call.
   */
  call<T>(data: Record<string, string>): Promise<T>;
  threadInfo(threadId: number): Promise<false | ThreadInfo>;
  /**
   * Gets {@link ThreadInfo} on the passed threadId from the API.
   *
   * @param threadId id of the thread to get info on
   */
}

export class GazelleApi implements Api {
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
  async call<T>(data: Record<string, string>): Promise<T> {
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

    this.#log.debug('API call', data);
    return fetch('/api.php?' + new URLSearchParams(data).toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-API-Key': this.#key,
      },
    })
      .then((response) => response.json())
      .then((data: ApiResponse<T>) => {
        const status = data.status;
        if (status !== 'success' || !('response' in data)) {
          this.#log.error(`API returned unsuccessful: ${status}`, data);
          return;
        }
        return data.response;
      });
  }

  async threadInfo(threadId: number): Promise<false | ThreadInfo> {
    return await this.call<ApiThreadInfo>({request: 'forums', type: 'thread_info', id: String(threadId)})
      // Also available title and subscribed
      .then(({id, forumID, locked, postCountLimit, postTimeLimit, canPost}) => {
        if (Number(forumID) !== 55) {
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
