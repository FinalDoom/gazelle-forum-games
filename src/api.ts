import {RateLimiter} from 'limiter';
import Log from './log';
import GameState from './models/game-state';

const API_THROTTLE_WINDOW_MILLLIS = 10000;
const MAX_QUERIES_PER_WINDOW = 5;
const BACKOFF_TIME_MILLIS = 2000;

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
interface ThreadInfo {
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

export default interface Api {
  /**
   * Execute a call against an API endpoint with throttling.
   *
   * @param data url parameters to pass in the api call.
   */
  call(data: Record<string, string>): Promise<Response>;
  /**
   * Gets {@link ThreadInfo} on the passed threadId from the API.
   *
   * @param threadId id of the thread to get info on
   */
  threadInfo(threadId: number): Promise<GameState>;
}

export class GazelleApi implements Api {
  #key: string;
  #limiter: RateLimiter;
  #log: Log;

  constructor(log: Log, apiKey: string) {
    this.#key = apiKey;
    this.#log = log;

    this.#limiter = new RateLimiter({
      tokensPerInterval: MAX_QUERIES_PER_WINDOW,
      interval: API_THROTTLE_WINDOW_MILLLIS,
    });
    this.#log.debug(
      'Built API with throttle %d queries per %d milliseconds.',
      MAX_QUERIES_PER_WINDOW,
      API_THROTTLE_WINDOW_MILLLIS,
    );
  }

  async #sleep(millisToSleep: number) {
    await new Promise((resolve) => setTimeout(resolve, millisToSleep));
  }

  async #fetchAndRetryIfNecessary(callFn: () => ReturnType<typeof this.call>): ReturnType<typeof this.call> {
    const response = await callFn();
    if (response.status === 429) {
      await this.#sleep(BACKOFF_TIME_MILLIS);
      return this.#fetchAndRetryIfNecessary(callFn);
    }
    return response;
  }

  async #acquireToken(fn: () => ReturnType<typeof this.call>): ReturnType<typeof this.call> {
    if (this.#limiter.tryRemoveTokens(1)) {
      return fn();
    } else {
      await this.#sleep(API_THROTTLE_WINDOW_MILLLIS);
      return this.#acquireToken(fn);
    }
  }

  async call(data: Record<string, string>): Promise<Response> {
    this.#log.debug('Call attempt', data);
    return this.#fetchAndRetryIfNecessary(() =>
      this.#acquireToken(() => {
        this.#log.debug('Call executing fetch', data);
        return fetch('/api.php?' + new URLSearchParams(data).toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-API-Key': this.#key,
          },
        });
      }),
    );
  }

  threadInfo(threadId: number): Promise<GameState> {
    this.#log.debug('Getting thread info for threadId: ', threadId);
    return (
      this.call({request: 'forums', type: 'thread_info', id: String(threadId)})
        .then((response) => response.json())
        .then((data: ApiResponse<ThreadInfo>) => {
          const status = data.status;
          if (status !== 'success' || !('response' in data)) {
            this.#log.error(`API returned unsuccessful: ${status}`, data);
            throw data.error;
          }
          this.#log.debug('Thread Info response for threadId %d:', threadId, data.response);
          return data.response;
        })
        // Also available title and subscribed
        .then(({id, forumID, locked, postCountLimit, postTimeLimit, canPost}) => {
          if (Number(forumID) !== 55) {
            const fail = `Thread ${id} is not a forum game post`;
            this.#log.error(fail);
            throw fail;
          }
          if (locked) {
            const fail = `Thread ${id} is a locked post`;
            this.#log.error(fail);
            throw fail;
          }
          return {
            postCountLimit: Number(postCountLimit),
            postTimeLimit: Number(postTimeLimit),
            canPost: canPost.toString() === 'true',
          } as GameState;
        })
    );
  }
}
