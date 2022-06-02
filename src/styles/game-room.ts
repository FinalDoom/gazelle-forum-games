import './game-room.scss';
import {BaseStyle, StyleFactory} from './style';

StyleFactory.registerStyle(
  () => $('link[rel="stylesheet"][title]').attr('title') === 'game_room',
  () => new GameRoomStyle(),
);

class GameRoomStyle extends BaseStyle {
  constructor() {
    super('forum-games-checker-game_room__row');
  }

  modifyIcon(icon: JQuery<HTMLElement>, canPost: boolean): void {
    icon.attr('title', `You are ${canPost ? 'eligible' : 'ineligible'} to participate in this forum game.`);
  }
}
