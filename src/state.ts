export interface GameState {
  postCountLimit: number; // Number of posts required before user can post agai
  canPost: boolean; // true if this user can post in this game
  nextPostTime?: Date; // Date that next post will be allowedn
  postTimeLimit: number; // Number of hours required before user can post again
}
