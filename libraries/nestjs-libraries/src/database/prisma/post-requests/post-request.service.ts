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
    const createdByUserId = this.isRestrictedUser(org) ? user.id : undefined;
    return this._postRequestRepository.list(org.id, page, createdByUserId);
  }

  async get(org: Organization, user: User, id: string) {
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

  async updateStatus(user: User, id: string, status: PostRequestStatus) {
    if (!user?.isTakkaAdmin) {
      throw new ForbiddenException('Unauthorized');
    }

    const postRequest = await this._postRequestRepository.getByIdAdmin(id);
    if (!postRequest) {
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

  private assertEditable(status: PostRequestStatus) {
    if (!EDITABLE_STATUSES.includes(status)) {
      throw new BadRequestException(
        'Post request can only be modified when status is DRAFT or REQUESTED'
      );
    }
  }
}
