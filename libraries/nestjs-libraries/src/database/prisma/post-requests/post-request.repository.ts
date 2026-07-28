import { BadRequestException, Injectable } from '@nestjs/common';
import { PostRequestStatus } from '@prisma/client';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import {
  CreatePostRequestDto,
  UpdatePostRequestDto,
} from '@gitroom/nestjs-libraries/dtos/post-requests/post-request.dto';

const postRequestInclude = {
  documents: true,
  createdBy: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
} as const;

@Injectable()
export class PostRequestRepository {
  constructor(
    private _postRequest: PrismaRepository<'postRequest'>,
    private _media: PrismaRepository<'media'>
  ) {}

  list(orgId: string, createdByUserId?: string) {
    return this._postRequest.model.postRequest.findMany({
      where: {
        organizationId: orgId,
        ...(createdByUserId ? { createdByUserId } : {}),
      },
      include: postRequestInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  getById(orgId: string, id: string, createdByUserId?: string) {
    return this._postRequest.model.postRequest.findFirst({
      where: {
        id,
        organizationId: orgId,
        ...(createdByUserId ? { createdByUserId } : {}),
      },
      include: postRequestInclude,
    });
  }

  getByIdAdmin(id: string) {
    return this._postRequest.model.postRequest.findUnique({
      where: { id },
      include: postRequestInclude,
    });
  }

  async create(orgId: string, userId: string, body: CreatePostRequestDto) {
    const created = await this._postRequest.model.postRequest.create({
      data: {
        title: body.title,
        description: body.description,
        publishDate: new Date(body.publishDate),
        status: body.status === 'REQUESTED'
          ? PostRequestStatus.REQUESTED
          : PostRequestStatus.DRAFT,
        organizationId: orgId,
        createdByUserId: userId,
      },
    });

    if (body.documentIds?.length) {
      await this.syncDocuments(orgId, created.id, body.documentIds);
    }

    return this.getById(orgId, created.id);
  }

  async update(orgId: string, id: string, body: UpdatePostRequestDto) {
    await this._postRequest.model.postRequest.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        publishDate: new Date(body.publishDate),
        ...(body.status ? { status: body.status } : {}),
      },
    });

    if (body.documentIds) {
      await this.syncDocuments(orgId, id, body.documentIds);
    }

    return this.getById(orgId, id);
  }

  async delete(orgId: string, id: string) {
    await this._media.model.media.updateMany({
      where: { postRequestId: id, organizationId: orgId },
      data: { postRequestId: null },
    });

    return this._postRequest.model.postRequest.delete({
      where: { id },
    });
  }

  updateStatus(id: string, status: PostRequestStatus) {
    return this._postRequest.model.postRequest.update({
      where: { id },
      data: { status },
      include: postRequestInclude,
    });
  }

  async syncDocuments(
    orgId: string,
    postRequestId: string,
    documentIds: string[]
  ) {
    const uniqueIds = [...new Set(documentIds)];

    if (uniqueIds.length) {
      const media = await this._media.model.media.findMany({
        where: {
          id: { in: uniqueIds },
          organizationId: orgId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (media.length !== uniqueIds.length) {
        throw new BadRequestException(
          'One or more documents do not belong to this organization'
        );
      }
    }

    await this._media.model.media.updateMany({
      where: {
        postRequestId,
        organizationId: orgId,
        ...(uniqueIds.length ? { id: { notIn: uniqueIds } } : {}),
      },
      data: { postRequestId: null },
    });

    if (uniqueIds.length) {
      await this._media.model.media.updateMany({
        where: {
          id: { in: uniqueIds },
          organizationId: orgId,
        },
        data: { postRequestId },
      });
    }
  }
}
