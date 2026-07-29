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
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';

const EDITABLE_STATUSES: PostRequestStatus[] = [
  PostRequestStatus.DRAFT,
  PostRequestStatus.REQUESTED,
];

const CLIENT_NOTIFY_STATUSES: PostRequestStatus[] = [
  PostRequestStatus.APPROVED,
  PostRequestStatus.REJECTED,
  PostRequestStatus.SCHEDULED,
  PostRequestStatus.PUBLISHED,
];

type NotifyPostRequest = {
  id: string;
  title: string;
  status: PostRequestStatus;
  organizationId: string;
  organization?: { id: string; name: string } | null;
};

@Injectable()
export class PostRequestService {
  constructor(
    private _postRequestRepository: PostRequestRepository,
    private _notificationService: NotificationService,
    private _usersService: UsersService
  ) {}

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

  async create(orgId: string, userId: string, body: CreatePostRequestDto) {
    const created = await this._postRequestRepository.create(
      orgId,
      userId,
      body
    );

    if (created?.status === PostRequestStatus.REQUESTED) {
      const forNotify =
        (await this._postRequestRepository.getByIdAdmin(created.id)) || created;
      await this.notifyStatusChange(forNotify);
    }

    return created;
  }

  async update(
    org: Organization,
    user: User,
    id: string,
    body: UpdatePostRequestDto
  ) {
    const postRequest = await this.getOwnedEditable(org, user, id);
    this.assertEditable(postRequest.status);
    const previousStatus = postRequest.status;

    const updated = await this._postRequestRepository.update(org.id, id, body);

    if (
      previousStatus !== PostRequestStatus.REQUESTED &&
      updated?.status === PostRequestStatus.REQUESTED
    ) {
      const forNotify =
        (await this._postRequestRepository.getByIdAdmin(updated.id)) || updated;
      await this.notifyStatusChange(forNotify);
    }

    return updated;
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

    const updated = await this._postRequestRepository.updateStatus(
      id,
      PostRequestStatus.REQUESTED
    );
    await this.notifyStatusChange(updated);
    return updated;
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

    if (postRequest.status === status) {
      return postRequest;
    }

    const updated = await this._postRequestRepository.updateStatus(id, status);
    await this.notifyStatusChange(updated);
    return updated;
  }

  private async notifyStatusChange(postRequest: NotifyPostRequest) {
    if (!this._notificationService.hasEmailProvider()) {
      return;
    }

    const reviewUrl = `${process.env.FRONTEND_URL}/post-requests`;
    const title = postRequest.title;
    const orgName = postRequest.organization?.name || 'an organization';

    if (postRequest.status === PostRequestStatus.REQUESTED) {
      const admins = await this._usersService.findTakkaAdmins();
      const subject = 'Post request submitted';
      const html = `New post request submitted: "${title}" from ${orgName}. <a href="${reviewUrl}">Review</a>`;

      for (const admin of admins) {
        if (!admin.email) {
          continue;
        }
        await this._notificationService.sendEmail(
          admin.email,
          subject,
          html
        );
      }
      return;
    }

    if (!CLIENT_NOTIFY_STATUSES.includes(postRequest.status)) {
      return;
    }

    const label = this.statusLabel(postRequest.status);
    const subject = `Post request ${label.toLowerCase()}`;
    const html = `Your post request "${title}" was ${label}. <a href="${reviewUrl}">View post requests</a>`;

    await this._notificationService.sendEmailsToOrg(
      postRequest.organizationId,
      subject,
      html,
      'info'
    );
  }

  private statusLabel(status: PostRequestStatus) {
    switch (status) {
      case PostRequestStatus.APPROVED:
        return 'Approved';
      case PostRequestStatus.REJECTED:
        return 'Rejected';
      case PostRequestStatus.SCHEDULED:
        return 'Scheduled';
      case PostRequestStatus.PUBLISHED:
        return 'Published';
      default:
        return status;
    }
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
