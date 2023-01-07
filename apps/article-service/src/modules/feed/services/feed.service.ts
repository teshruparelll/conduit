import { Injectable, Logger } from '@nestjs/common';
import { FeedRepository } from '../repositories/feed.repository';
import { FavoriteService } from './favorite.service';
import { TagService } from './tag.service';
import { UserService } from './user.service';

const logger = new Logger();
@Injectable()
export class FeedService {

  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly tagService: TagService,
    private readonly userService: UserService,
    private readonly favoriteService: FavoriteService
  ) { }

  async createArticle(article) {
    // TODO: Add ID field for article, because title is not case sensitive
    // Also can use the ID in slug to fetch the article by id
    // TODO: Change article title to ID in favorites as well

    logger.log('ARTICLE-SERVICE: Create article triggered');

    const article_exist = await (await this.feedRepository.getByTitle(article.title)).first();

    if (article_exist) {
      logger.log('ARTICLE-SERVICE: Article title already exists');

      return;
    }

    await this.feedRepository.create(article);

    if (article?.tags) {
      this.tagService.insertTags(article.tags)
    }

    logger.log('ARTICLE-SERVICE: Article created');
    return article;
  }

  async updateArticle(article) {
    logger.log('ARTICLE-SERVICE: Update article triggered');

    const article_exists = await (await this.feedRepository.getByTitle(article.title)).first();

    if (article_exists) {
      await this.feedRepository.updateArticle(article);

      this.tagService.compareAndActOnTags(article.tags, article_exists?.tags);

      return article;
    }

    return;
  }

  // TODO: Create getByID method
  // TODO: Attach the following boolean as well, check the current user follows the current owner only the currentUser != author

  async getAll(currentUser) {
    logger.log('ARTICLE-SERVICE: Get all article triggered');

    const articles = await this.feedRepository.getAll();
    const users = await this.userService.getAllUsers();
    const favorites = await this.favoriteService.getAll();

    const updated_articles = articles.map((article) => {
      const user = users.find(_user => _user.email === article.author);
      const articleFavorites = favorites.filter(favorite => favorite.article === article.title);
      const favorited = favorites.find(favorite => favorite.article === article.title && favorite.favoritedBy === currentUser);

      return {
        ...article,
        favoriteCount: articleFavorites?.length || 0,
        favorited: favorited ? true : false,
        author: {
          username: user.username,
          email: user.email,
          bio: user.bio,
          image: user.image
        }
      };
    });

    return updated_articles;
  }

  async getByAuthor(author, currentUser) {
    logger.log('ARTICLE-SERVICE: Get articles by author triggered');

    const user = await this.userService.getUserByEmail(author);
    const articles = await this.feedRepository.getByAuthor(author);
    const favorites = await this.favoriteService.getAll();

    const updated_articles = articles.map(article => {
      const articleFavorites = favorites.filter(favorite => favorite.article === article.title);
      const favorited = favorites.find(favorite => favorite.article === article.title && favorite.favoritedBy === currentUser);

      return {
        ...article,
        favoriteCount: articleFavorites?.length || 0,
        favorited: favorited ? true : false,
        author: {
          username: user.username,
          email: user.email,
          bio: user.bio,
          image: user.image
        }
      }
    });

    return updated_articles;
  }

  favoriteArticle(payload) {
    return this.favoriteService.create(payload);
  }

  unfavoriteArticle(payload) {
    return this.favoriteService.remove(payload);
  }

  async deleteArticle(title) {
    await this.feedRepository.delete({ title });

    return true;
  }
}
