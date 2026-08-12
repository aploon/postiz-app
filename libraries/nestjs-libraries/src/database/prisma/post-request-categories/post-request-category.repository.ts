import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import {
  CreatePostRequestCategoryDto,
  UpdatePostRequestCategoryDto,
} from '@gitroom/nestjs-libraries/dtos/post-request-categories/post-request-category.dto';

@Injectable()
export class PostRequestCategoryRepository {
  constructor(
    private _category: PrismaRepository<'postRequestCategory'>,
    private _postRequest: PrismaRepository<'postRequest'>
  ) {}

  list(orgId: string) {
    return this._category.model.postRequestCategory.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
    });
  }

  getById(orgId: string, id: string) {
    return this._category.model.postRequestCategory.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  create(orgId: string, body: CreatePostRequestCategoryDto) {
    return this._category.model.postRequestCategory.create({
      data: {
        organizationId: orgId,
        name: body.name.trim(),
      },
    });
  }

  update(orgId: string, id: string, body: UpdatePostRequestCategoryDto) {
    return this._category.model.postRequestCategory.update({
      where: { id },
      data: {
        name: body.name.trim(),
      },
    });
  }

  async delete(orgId: string, id: string) {
    await this._postRequest.model.postRequest.updateMany({
      where: { categoryId: id, organizationId: orgId },
      data: { categoryId: null },
    });

    return this._category.model.postRequestCategory.delete({
      where: { id },
    });
  }
}
