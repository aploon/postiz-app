import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Organization, PostRequestStatus, User } from '@prisma/client';
import { PostRequestRepository } from '@gitroom/nestjs-libraries/database/prisma/post-requests/post-request.repository';
import {
  CreatePostRequestDto,
  UpdatePostRequestDto,
} from '@gitroom/nestjs-libraries/dtos/post-requests/post-request.dto';

const EDITABLE_STATUSES: PostRequestStatus[] = [
  PostRequestStatus.DRAFT,
  PostRequestStatus.REQUESTED,
];

@Injectable()
export class PostRequestService {
  constructor(private _postRequestRepository: PostRequestRepository) {}

  list(org: Organization, user: User, page = 1) {
    if (this.isRestrictedUser(org)) {
      return this._postRequestRepository.list(org.id, page, {
        createdByUserId: user.id,
      });
    }

    return this._postRequestRepository.list(org.id, page, {
      viewerUserId: user.id,
    });
  }

  listAdmin(
    user: User,
    filters: {
      page?: number;
      search?: string;
      organizationId?: string;
      status?: string;
    }
  ) {
    if (!user?.isTakkaAdmin) {
      throw new ForbiddenException('Unauthorized');
    }

    const status = this.parseStatus(filters.status);
    if (status === PostRequestStatus.DRAFT) {
      throw new BadRequestException('Draft post requests are not visible to admins');
    }

    return this._postRequestRepository.listAdmin({
      page: filters.page || 1,
      search: filters.search,
      organizationId: filters.organizationId,
      status,
    });
  }

  listOrganizations(user: User) {
    if (!user?.isTakkaAdmin) {
      throw new ForbiddenException('Unauthorized');
    }

    return this._postRequestRepository.listOrganizationsWithRequests();
  }

  async get(org: Organization, user: User, id: string) {
    if (user?.isTakkaAdmin) {
      const postRequest = await this._postRequestRepository.getByIdAdmin(id);
      if (!postRequest || postRequest.status === PostRequestStatus.DRAFT) {
        throw new NotFoundException('Post request not found');
      }
      return postRequest;
    }

    const createdByUserId = this.isRestrictedUser(org) ? user.id : undefined;
    const postRequest = await this._postRequestRepository.getById(
      org.id,
      id,
      createdByUserId
    );
    if (!postRequest) {
      throw new NotFoundException('Post request not found');
    }

    // Org admins can only open another user's draft if they are the author.
    if (
      postRequest.status === PostRequestStatus.DRAFT &&
      postRequest.createdByUserId !== user.id
    ) {
      throw new NotFoundException('Post request not found');
    }

    return postRequest;
  }

  create(orgId: string, userId: string, body: CreatePostRequestDto) {
    return this._postRequestRepository.create(orgId, userId, body);
  }

  async update(
    org: Organization,
    user: User,
    id: string,
    body: UpdatePostRequestDto
  ) {
    const postRequest = await this.getOwnedEditable(org, user, id);
    this.assertEditable(postRequest.status);

    return this._postRequestRepository.update(org.id, id, body);
  }

  async delete(org: Organization, user: User, id: string) {
    const postRequest = await this.getOwnedEditable(org, user, id);
    this.assertEditable(postRequest.status);

    return this._postRequestRepository.delete(org.id, id);
  }

  async markAsRequested(org: Organization, user: User, id: string) {
    const postRequest = await this.getOwnedEditable(org, user, id);
    if (postRequest.status !== PostRequestStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft post requests can be submitted'
      );
    }

    return this._postRequestRepository.updateStatus(
      id,
      PostRequestStatus.REQUESTED
    );
  }

  async updateStatus(user: User, id: string, status: PostRequestStatus) {
    if (!user?.isTakkaAdmin) {
      throw new ForbiddenException('Unauthorized');
    }

    if (status === PostRequestStatus.DRAFT) {
      throw new BadRequestException('Cannot set status to DRAFT');
    }

    const postRequest = await this._postRequestRepository.getByIdAdmin(id);
    if (!postRequest || postRequest.status === PostRequestStatus.DRAFT) {
      throw new NotFoundException('Post request not found');
    }

    return this._postRequestRepository.updateStatus(id, status);
  }

  private async getOwnedEditable(org: Organization, user: User, id: string) {
    const createdByUserId = this.isRestrictedUser(org) ? user.id : undefined;
    const postRequest = await this._postRequestRepository.getById(
      org.id,
      id,
      createdByUserId
    );
    if (!postRequest) {
      throw new NotFoundException('Post request not found');
    }
    return postRequest;
  }

  private isRestrictedUser(org: Organization) {
    // @ts-ignore
    return org?.users?.[0]?.role === 'USER';
  }

  private parseStatus(status?: string): PostRequestStatus | undefined {
    if (!status) {
      return undefined;
    }

    if (
      !Object.values(PostRequestStatus).includes(status as PostRequestStatus)
    ) {
      throw new BadRequestException('Invalid status');
    }

    return status as PostRequestStatus;
  }

  private assertEditable(status: PostRequestStatus) {
    if (!EDITABLE_STATUSES.includes(status)) {
      throw new BadRequestException(
        'Post request can only be modified when status is DRAFT or REQUESTED'
      );
    }
  }
}
