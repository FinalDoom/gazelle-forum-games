export default interface GameState {
  /** Number of posts required before user can post again. */
  postCountLimit: number;
  /** true if this user can post in this game. */
  canPost: boolean;
  /** Date that next post will be allowed. */
  nextPostTime?: Date;
  /** Number of hours required before user can post again. */
  postTimeLimit: number;
}
