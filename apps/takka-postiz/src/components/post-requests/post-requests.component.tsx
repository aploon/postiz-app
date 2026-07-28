'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Textarea } from '@gitroom/react/form/textarea';
import { Select } from '@gitroom/react/form/select';
import { FormProvider, useForm } from 'react-hook-form';
import { useModals } from '@gitroom/takka-postiz/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { deleteDialog } from '@gitroom/react/helpers/takka-postiz/delete.dialog';
import { useUser } from '@gitroom/takka-postiz/components/layout/user.context';
import { Pagination } from '@gitroom/takka-postiz/components/media/media.component';
import dayjs from 'dayjs';
import clsx from 'clsx';

type PostRequestDocument = {
  id: string;
  name?: string;
  originalName?: string;
  path: string;
};

type PostRequestItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  publishDate: string;
  createdBy?: { id: string; name?: string | null; email: string };
  documents?: PostRequestDocument[];
};

type PostRequestFormValues = {
  title: string;
  description: string;
  publishDate: string;
  status: 'DRAFT' | 'REQUESTED';
  documentIds: string[];
};

const EDITABLE = ['DRAFT', 'REQUESTED'];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-newColColor text-newTableText',
  REQUESTED: 'bg-boxFocused text-textItemFocused',
  APPROVED: 'bg-[#612bd3]/15 text-[#612bd3]',
  REJECTED: 'bg-red-500/15 text-red-400',
  SCHEDULED: 'bg-[#612bd3]/10 text-textColor',
  PUBLISHED: 'bg-emerald-500/15 text-emerald-400',
};

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={clsx(
      'inline-flex items-center h-[28px] px-[12px] rounded-[6px] text-[12px] font-[600] tracking-wide uppercase whitespace-nowrap',
      STATUS_STYLES[status] || 'bg-newColColor text-newTableText'
    )}
  >
    {status}
  </span>
);

const ActionButton = ({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'h-[36px] px-[14px] rounded-[8px] text-[13px] font-[500] border cursor-pointer transition-all whitespace-nowrap',
      danger
        ? 'border-newTableBorder text-red-400 hover:bg-red-500/10'
        : 'border-newTableBorder bg-newBgColorInner text-textColor hover:bg-boxHover'
    )}
  >
    {children}
  </button>
);

const usePostRequests = (page: number) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch(`/post-requests?page=${page + 1}`)).json();
  }, [fetch, page]);

  return useSWR<{ results: PostRequestItem[]; pages: number; total: number }>(
    `post-requests-${page}`,
    load,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: true,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
    }
  );
};

const PostRequestForm = ({
  data,
  reload,
}: {
  data?: PostRequestItem;
  reload: () => void;
}) => {
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [existingDocuments, setExistingDocuments] = useState<
    PostRequestDocument[]
  >(data?.documents || []);
  const [pendingFiles, setPendingFiles] = useState<
    { id: string; name: string; file: File }[]
  >([]);
  const [saving, setSaving] = useState(false);

  const form = useForm<PostRequestFormValues>({
    defaultValues: {
      title: data?.title || '',
      description: data?.description || '',
      publishDate: data?.publishDate
        ? dayjs(data.publishDate).format('YYYY-MM-DDTHH:mm')
        : dayjs().add(1, 'day').format('YYYY-MM-DDTHH:mm'),
      status: (data?.status === 'REQUESTED' ? 'REQUESTED' : 'DRAFT') as
        | 'DRAFT'
        | 'REQUESTED',
      documentIds: (data?.documents || []).map((d) => d.id),
    },
  });

  const selectFiles = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) {
        return;
      }

      setPendingFiles((prev) => [
        ...prev,
        ...files.map((file) => ({
          id: `${file.name}-${file.lastModified}-${file.size}-${prev.length}-${Math.random()}`,
          name: file.name,
          file,
        })),
      ]);

      event.target.value = '';
    },
    []
  );

  const removeExistingDocument = useCallback((id: string) => {
    setExistingDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const removePendingFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file, file.name);
      const result = await (
        await fetch('/media/upload-simple', {
          method: 'POST',
          body: formData,
        })
      ).json();
      if (!result?.id) {
        throw new Error('Upload failed');
      }
      return result.id as string;
    },
    [fetch]
  );

  const submit = useCallback(
    async (values: PostRequestFormValues) => {
      setSaving(true);
      try {
        const uploadedIds: string[] = [];
        for (const pending of pendingFiles) {
          uploadedIds.push(await uploadFile(pending.file));
        }

        const documentIds = [
          ...existingDocuments.map((d) => d.id),
          ...uploadedIds,
        ];

        const response = await fetch(
          data?.id ? `/post-requests/${data.id}` : '/post-requests',
          {
            method: data?.id ? 'PUT' : 'POST',
            body: JSON.stringify({
              title: values.title,
              description: values.description,
              publishDate: dayjs(values.publishDate).toISOString(),
              status: values.status,
              documentIds,
            }),
          }
        );

        if (!response.ok) {
          toaster.show(
            t('post_request_save_failed', 'Failed to save post request'),
            'warning'
          );
          return;
        }

        toaster.show(t('post_request_saved', 'Post request saved'), 'success');
        reload();
        modal.closeAll();
      } catch {
        toaster.show(t('upload_failed', 'Upload failed'), 'warning');
      } finally {
        setSaving(false);
      }
    },
    [
      data?.id,
      existingDocuments,
      fetch,
      modal,
      pendingFiles,
      reload,
      t,
      toaster,
      uploadFile,
    ]
  );

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="flex flex-col gap-[12px] p-[16px] pt-0 max-w-[600px]"
      >
        <Input name="title" label={t('title', 'Title')} />
        <Textarea
          name="description"
          label={t('description', 'Description')}
        />
        <Input
          name="publishDate"
          label={t('publish_date', 'Publish date')}
          type="datetime-local"
        />
        <Select name="status" label={t('status', 'Status')}>
          <option value="DRAFT">{t('draft', 'Draft')}</option>
          <option value="REQUESTED">{t('requested', 'Requested')}</option>
        </Select>

        <div className="flex flex-col gap-[8px]">
          <div className="text-[14px]">{t('documents', 'Documents')}</div>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="text-[13px]"
            onChange={selectFiles}
          />
          {existingDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-[8px] text-[13px]"
            >
              <a
                href={doc.path}
                target="_blank"
                rel="noreferrer"
                className="underline truncate"
              >
                {doc.originalName || doc.name || doc.path}
              </a>
              <Button
                type="button"
                secondary
                onClick={() => removeExistingDocument(doc.id)}
              >
                {t('remove', 'Remove')}
              </Button>
            </div>
          ))}
          {pendingFiles.map((pending) => (
            <div
              key={pending.id}
              className="flex items-center justify-between gap-[8px] text-[13px]"
            >
              <div className="truncate">{pending.name}</div>
              <Button
                type="button"
                secondary
                onClick={() => removePendingFile(pending.id)}
              >
                {t('remove', 'Remove')}
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-[8px] mt-[8px]">
          <Button type="button" secondary onClick={() => modal.closeAll()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            {t('save', 'Save')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

const PostRequestView = ({ data }: { data: PostRequestItem }) => {
  const t = useT();
  const modal = useModals();

  return (
    <div className="flex flex-col gap-[16px] p-[16px] pt-0 w-[560px] max-w-full">
      <div className="flex items-start justify-between gap-[12px]">
        <div className="flex flex-col gap-[6px] min-w-0">
          <div className="text-[18px] font-[600] truncate">{data.title}</div>
          <div className="text-[13px] text-newTableText">
            {dayjs(data.publishDate).format('MMM D, YYYY · HH:mm')}
            {data.createdBy
              ? ` · ${data.createdBy.name || data.createdBy.email}`
              : ''}
          </div>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <div className="border border-newTableBorder rounded-[8px] bg-newTableHeader p-[16px]">
        <div className="text-[12px] uppercase tracking-wide text-newTableText mb-[8px]">
          {t('description', 'Description')}
        </div>
        <div className="text-[14px] whitespace-pre-wrap leading-[1.5]">
          {data.description}
        </div>
      </div>

      <div className="border border-newTableBorder rounded-[8px] overflow-hidden">
        <div className="px-[16px] py-[10px] bg-newTableHeader border-b border-newTableBorder text-[12px] uppercase tracking-wide text-newTableText">
          {t('documents', 'Documents')}
          {!!data.documents?.length && (
            <span className="ms-[6px] opacity-70">({data.documents.length})</span>
          )}
        </div>
        <div className="p-[12px] flex flex-col gap-[8px]">
          {!data.documents?.length && (
            <div className="text-[13px] text-newTableText px-[4px]">
              {t('no_documents', 'No documents')}
            </div>
          )}
          {data.documents?.map((doc) => (
            <a
              key={doc.id}
              href={doc.path}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-[10px] px-[12px] py-[10px] rounded-[8px] border border-newTableBorder bg-newBgColorInner hover:bg-boxHover transition-all text-[13px]"
            >
              <span className="uppercase text-[10px] font-[600] text-newTableText tracking-wide shrink-0">
                {(doc.originalName || doc.name || doc.path).split('.').pop()}
              </span>
              <span className="truncate underline">
                {doc.originalName || doc.name || doc.path}
              </span>
            </a>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" secondary onClick={() => modal.closeAll()}>
          {t('close', 'Close')}
        </Button>
      </div>
    </div>
  );
};

export const PostRequestsComponent = () => {
  const t = useT();
  const modal = useModals();
  const toaster = useToaster();
  const fetch = useFetch();
  const user = useUser();
  const [page, setPage] = useState(0);
  const { data, mutate, isLoading } = usePostRequests(page);
  const results = data?.results || [];

  const openForm = useCallback(
    (item?: PostRequestItem) => () => {
      modal.openModal({
        title: item
          ? t('edit_post_request', 'Edit post request')
          : t('new_post_request', 'New post request'),
        withCloseButton: true,
        children: <PostRequestForm data={item} reload={mutate} />,
      });
    },
    [modal, mutate, t]
  );

  const openView = useCallback(
    (item: PostRequestItem) => () => {
      modal.openModal({
        title: t('view_post_request', 'View post request'),
        withCloseButton: true,
        children: <PostRequestView data={item} />,
      });
    },
    [modal, t]
  );

  const remove = useCallback(
    (item: PostRequestItem) => async () => {
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete_this_post_request',
            'Are you sure you want to delete this post request?'
          )
        ))
      ) {
        return;
      }

      const response = await fetch(`/post-requests/${item.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        toaster.show(
          t('post_request_delete_failed', 'Failed to delete post request'),
          'warning'
        );
        return;
      }
      toaster.show(t('post_request_deleted', 'Post request deleted'), 'success');
      mutate();
    },
    [fetch, mutate, t, toaster]
  );

  const showCreator = useMemo(
    () => user?.role === 'ADMIN' || user?.role === 'SUPERADMIN',
    [user?.role]
  );

  const rowGridClass = showCreator
    ? 'grid-cols-[minmax(0,1.5fr)_110px_130px_minmax(0,1fr)_240px]'
    : 'grid-cols-[minmax(0,1.5fr)_110px_130px_240px]';

  return (
    <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[16px]">
      <div className="flex items-center justify-between gap-[12px]">
        <div>
          <h1 className="text-[24px] font-[600]">
            {t('post_requests', 'Post Requests')}
          </h1>
          <p className="text-newTableText text-[14px] mt-[4px]">
            {t(
              'post_requests_description',
              'Create and manage content requests for your organization.'
            )}
          </p>
        </div>
        <Button onClick={openForm()}>
          {t('new_post_request', 'New post request')}
        </Button>
      </div>

      <div className="border border-newTableBorder rounded-[8px] overflow-hidden">
        {isLoading && (
          <div className="px-[16px] py-[20px] text-newTableText text-[14px]">
            {t('loading', 'Loading...')}
          </div>
        )}
        {!isLoading && !results.length && (
          <div className="px-[16px] py-[32px] text-center text-newTableText text-[14px]">
            {t('no_post_requests', 'No post requests yet.')}
          </div>
        )}
        {!!results.length && (
          <>
            <div
              className={clsx(
                'grid gap-[12px] px-[16px] py-[14px] bg-newTableHeader border-b border-newTableBorder text-[13px] uppercase tracking-wide text-newTableText items-center',
                rowGridClass
              )}
            >
              <div>{t('title', 'Title')}</div>
              <div>{t('status', 'Status')}</div>
              <div>{t('publish_date', 'Publish date')}</div>
              {showCreator && <div>{t('created_by', 'Created by')}</div>}
              <div className="text-end">{t('actions', 'Actions')}</div>
            </div>
            {results.map((item) => {
              const canEdit = EDITABLE.includes(item.status);
              return (
                <div
                  key={item.id}
                  className={clsx(
                    'grid gap-[12px] px-[16px] py-[16px] items-center border-b border-newTableBorder last:border-b-0 hover:bg-boxHover transition-colors',
                    rowGridClass
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-[16px] font-[500] truncate">
                      {item.title}
                    </div>
                  </div>
                  <div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="text-[14px] text-newTableText">
                    {dayjs(item.publishDate).format('MMM D, YYYY')}
                    <div className="text-[12px]">
                      {dayjs(item.publishDate).format('HH:mm')}
                    </div>
                  </div>
                  {showCreator && (
                    <div className="text-[14px] truncate text-newTableText min-w-0">
                      {item.createdBy?.name || item.createdBy?.email || '-'}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-[8px]">
                    <ActionButton onClick={openView(item)}>
                      {t('view', 'View')}
                    </ActionButton>
                    {canEdit && (
                      <ActionButton onClick={openForm(item)}>
                        {t('edit', 'Edit')}
                      </ActionButton>
                    )}
                    {canEdit && (
                      <ActionButton danger onClick={remove(item)}>
                        {t('delete', 'Delete')}
                      </ActionButton>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {(data?.pages || 0) > 1 && (
        <Pagination
          current={page}
          totalPages={data?.pages || 1}
          setPage={setPage}
        />
      )}
    </div>
  );
};
