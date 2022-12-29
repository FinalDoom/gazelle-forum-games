type MessageType = 'trigger' | 'monitor' | 'unmonitor';
export type Message = {
  type: MessageType;
  threadId: number;
};
const getChannel = () => new BroadcastChannel('gazelle-forum-games');

const triggerUpdate = (threadId: number) => {
  getChannel().postMessage({type: 'trigger', threadId: threadId});
};

const monitor = (threadId: number) => {
  getChannel().postMessage({type: 'monitor', threadId: threadId});
};

const unmonitor = (threadId: number) => {
  getChannel().postMessage({type: 'unmonitor', threadId: threadId});
};

const messageListener = (callback: (message: Message) => void) => {
  getChannel().addEventListener('message', (event) => callback(event.data));
};

export {triggerUpdate, monitor, unmonitor, messageListener};
