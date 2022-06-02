export enum LogLevel {
  None,
  Error,
  Warning,
  Log,
  Debug,
  Timing,
}
type ConsoleLogFunc = ((...params: any[]) => void) | ((message: any, ...params: any[]) => void);
type ConsoleLogArguments = any | (() => any);

export default class Log {
  #level: LogLevel;
  #prefix: string;
  #start = new Date();

  constructor(prefix: string, level = LogLevel.Log) {
    this.#prefix = prefix;
    this.#level = level;
  }

  #logToConsole(logMethod: ConsoleLogFunc, ...args: ConsoleLogArguments[]) {
    const resolvedArgs = args.map((arg) => (typeof arg === 'function' ? arg() : arg));
    logMethod(this.#prefix, ...resolvedArgs);
  }

  timing(...args: ConsoleLogArguments[]) {
    if (this.#level >= LogLevel.Timing)
      this.#logToConsole(console.debug, () => `(${new Date().valueOf() - this.#start.valueOf()})`, ...args);
  }

  debug(...args: ConsoleLogArguments[]) {
    if (this.#level >= LogLevel.Debug) this.#logToConsole(console.debug, ...args);
  }

  log(...args: ConsoleLogArguments[]) {
    if (this.#level >= LogLevel.Log) this.#logToConsole(console.log, ...args);
  }

  warn(...args: ConsoleLogArguments[]) {
    if (this.#level >= LogLevel.Warning) this.#logToConsole(console.warn, ...args);
  }

  error(...args: ConsoleLogArguments[]) {
    if (this.#level >= LogLevel.Error) this.#logToConsole(console.error, ...args);
  }
}
