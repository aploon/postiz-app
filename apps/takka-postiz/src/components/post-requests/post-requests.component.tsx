'use client';

import React, { Fragment, useCallback, useMemo, useRef, useState } from 'react';
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
import dayjs from 'dayjs';

type PostRequestDocument = {
  id: string;
  name?: string;
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

const usePostRequests = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/post-requests')).json();
  }, [fetch]);

  return useSWR<PostRequestItem[]>('post-requests', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
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

  const selectFiles = useCallback((files: FileList | null) => {
    if (!files?.length) {
      return;
    }
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  }, []);

  const removeExistingDocument = useCallback((id: string) => {
    setExistingDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
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
        for (const file of pendingFiles) {
          uploadedIds.push(await uploadFile(file));
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
        className="flex flex-col gap-[12px] p-[16px] pt-0"
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
            onChange={(e) => selectFiles(e.target.files)}
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
                {doc.name || doc.path}
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
          {pendingFiles.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-[8px] text-[13px]"
            >
              <span className="truncate">{file.name}</span>
              <Button
                type="button"
                secondary
                onClick={() => removePendingFile(index)}
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

export const PostRequestsComponent = () => {
  const t = useT();
  const modal = useModals();
  const toaster = useToaster();
  const fetch = useFetch();
  const user = useUser();
  const { data, mutate, isLoading } = usePostRequests();

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

  return (
    <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[12px]">
      <div className="flex items-center justify-between gap-[12px]">
        <div>
          <h1 className="text-[24px] font-[600]">
            {t('post_requests', 'Post Requests')}
          </h1>
          <p className="text-customColor18 text-[14px]">
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

      <div className="my-[8px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
        {isLoading && (
          <div className="text-customColor18">{t('loading', 'Loading...')}</div>
        )}
        {!isLoading && !data?.length && (
          <div className="text-customColor18">
            {t('no_post_requests', 'No post requests yet.')}
          </div>
        )}
        {!!data?.length && (
          <div
            className={`grid w-full gap-y-[10px] ${
              showCreator
                ? 'grid-cols-[1.4fr,1fr,1fr,1fr,0.7fr,0.7fr]'
                : 'grid-cols-[1.4fr,1fr,1fr,0.7fr,0.7fr]'
            }`}
          >
            <div>{t('title', 'Title')}</div>
            <div>{t('status', 'Status')}</div>
            <div>{t('publish_date', 'Publish date')}</div>
            {showCreator && <div>{t('created_by', 'Created by')}</div>}
            <div className="text-center">{t('edit', 'Edit')}</div>
            <div className="text-center">{t('delete', 'Delete')}</div>
            {data.map((item) => {
              const canEdit = EDITABLE.includes(item.status);
              return (
                <Fragment key={item.id}>
                  <div className="truncate pe-[12px]">{item.title}</div>
                  <div>{item.status}</div>
                  <div>{dayjs(item.publishDate).format('YYYY-MM-DD HH:mm')}</div>
                  {showCreator && (
                    <div className="truncate pe-[12px]">
                      {item.createdBy?.name || item.createdBy?.email || '-'}
                    </div>
                  )}
                  <div className="flex justify-center">
                    {canEdit ? (
                      <Button onClick={openForm(item)}>
                        {t('edit', 'Edit')}
                      </Button>
                    ) : (
                      <span className="text-customColor18 text-[12px]">-</span>
                    )}
                  </div>
                  <div className="flex justify-center">
                    {canEdit ? (
                      <Button onClick={remove(item)}>
                        {t('delete', 'Delete')}
                      </Button>
                    ) : (
                      <span className="text-customColor18 text-[12px]">-</span>
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
