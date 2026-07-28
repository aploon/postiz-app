import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostRequestStatus, User } from '@prisma/client';
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

  list(orgId: string) {
    return this._postRequestRepository.list(orgId);
  }

  async get(orgId: string, id: string) {
    const postRequest = await this._postRequestRepository.getById(orgId, id);
    if (!postRequest) {
      throw new NotFoundException('Post request not found');
    }
    return postRequest;
  }

  create(orgId: string, userId: string, body: CreatePostRequestDto) {
    return this._postRequestRepository.create(orgId, userId, body);
  }

  async update(orgId: string, id: string, body: UpdatePostRequestDto) {
    const postRequest = await this._postRequestRepository.getById(orgId, id);
    if (!postRequest) {
      throw new NotFoundException('Post request not found');
    }

    this.assertEditable(postRequest.status);

    return this._postRequestRepository.update(orgId, id, body);
  }

  async delete(orgId: string, id: string) {
    const postRequest = await this._postRequestRepository.getById(orgId, id);
    if (!postRequest) {
      throw new NotFoundException('Post request not found');
    }

    this.assertEditable(postRequest.status);

    return this._postRequestRepository.delete(orgId, id);
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

  private assertEditable(status: PostRequestStatus) {
    if (!EDITABLE_STATUSES.includes(status)) {
      throw new BadRequestException(
        'Post request can only be modified when status is DRAFT or REQUESTED'
      );
    }
  }
}
