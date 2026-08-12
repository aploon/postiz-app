import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostRequestCategoryRepository } from '@gitroom/nestjs-libraries/database/prisma/post-request-categories/post-request-category.repository';
import {
  CreatePostRequestCategoryDto,
  UpdatePostRequestCategoryDto,
} from '@gitroom/nestjs-libraries/dtos/post-request-categories/post-request-category.dto';

@Injectable()
export class PostRequestCategoryService {
  constructor(
    private _postRequestCategoryRepository: PostRequestCategoryRepository
  ) {}

  list(orgId: string) {
    return this._postRequestCategoryRepository.list(orgId);
  }

  create(orgId: string, body: CreatePostRequestCategoryDto) {
    const name = body.name?.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }

    return this._postRequestCategoryRepository.create(orgId, { name }).catch(
      (error) => {
        if (error?.code === 'P2002') {
          throw new BadRequestException(
            'A category with this name already exists'
          );
        }
        throw error;
      }
    );
  }

  async update(orgId: string, id: string, body: UpdatePostRequestCategoryDto) {
    const name = body.name?.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }

    const existing = await this._postRequestCategoryRepository.getById(
      orgId,
      id
    );
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    try {
      return await this._postRequestCategoryRepository.update(orgId, id, {
        name,
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(
          'A category with this name already exists'
        );
      }
      throw error;
    }
  }

  async delete(orgId: string, id: string) {
    const existing = await this._postRequestCategoryRepository.getById(
      orgId,
      id
    );
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    return this._postRequestCategoryRepository.delete(orgId, id);
  }
}
