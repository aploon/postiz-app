'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import clsx from 'clsx';
import { useDebounce } from 'use-debounce';

type OtherRequestDocument = {
  id: string;
  name?: string;
  originalName?: string;
  path: string;
};

type OtherRequestItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdBy?: { id: string; name?: string | null; email: string };
  organization?: { id: string; name: string };
  documents?: OtherRequestDocument[];
};

type OtherRequestFormValues = {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  documentIds: string[];
};

const EDITABLE = ['NEW'];
const ALL_STATUSES = ['NEW', 'IN_PROGRESS', 'DONE', 'CLOSED'] as const;
const ALL_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

const ADMIN_ACTIONS: { status: string; labelKey: string; label: string; danger?: boolean }[] =
  [
    { status: 'IN_PROGRESS', labelKey: 'in_progress', label: 'In progress' },
    { status: 'DONE', labelKey: 'done', label: 'Done' },
    { status: 'CLOSED', labelKey: 'closed', label: 'Closed', danger: true },
  ];

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-boxFocused text-textItemFocused',
  IN_PROGRESS: 'bg-[#612bd3]/15 text-[#612bd3]',
  DONE: 'bg-emerald-500/15 text-emerald-400',
  CLOSED: 'bg-newColColor text-newTableText',
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-newColColor text-newTableText',
  MEDIUM: 'bg-sky-500/15 text-sky-400',
  HIGH: 'bg-red-500/15 text-red-400',
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  CLOSED: 'closed',
};

const PRIORITY_LABEL_KEYS: Record<string, string> = {
  LOW: 'priority_low',
  MEDIUM: 'priority_medium',
  HIGH: 'priority_high',
};

const StatusBadge = ({ status }: { status: string }) => {
  const t = useT();
  const key = STATUS_LABEL_KEYS[status] || status.toLowerCase();
  return (
    <span
      className={clsx(
        'inline-flex items-center h-[28px] px-[12px] rounded-[6px] text-[12px] font-[600] tracking-wide uppercase whitespace-nowrap',
        STATUS_STYLES[status] || 'bg-newColColor text-newTableText'
      )}
    >
      {t(key, status)}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const t = useT();
  const key = PRIORITY_LABEL_KEYS[priority] || priority.toLowerCase();
  return (
    <span
      className={clsx(
        'inline-flex items-center h-[28px] px-[12px] rounded-[6px] text-[12px] font-[600] tracking-wide uppercase whitespace-nowrap',
        PRIORITY_STYLES[priority] || 'bg-newColColor text-newTableText'
      )}
    >
      {t(key, priority)}
    </span>
  );
};

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

const useOtherRequests = (
  page: number,
  filters: {
    search: string;
    organizationId: string;
    status: string;
    priority: string;
    isTakkaAdmin: boolean;
  }
) => {
  const fetch = useFetch();
  const { search, organizationId, status, priority, isTakkaAdmin } = filters;

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page + 1) });
    if (isTakkaAdmin) {
      if (search.trim()) {
        params.set('search', search.trim());
      }
      if (organizationId) {
        params.set('organizationId', organizationId);
      }
      if (status) {
        params.set('status', status);
      }
      if (priority) {
        params.set('priority', priority);
      }
    }
    return (await fetch(`/other-requests?${params.toString()}`)).json();
  }, [fetch, page, search, organizationId, status, priority, isTakkaAdmin]);

  return useSWR<{ results: OtherRequestItem[]; pages: number; total: number }>(
    `other-requests-${page}-${isTakkaAdmin}-${search}-${organizationId}-${status}-${priority}`,
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

const useOtherRequestOrganizations = (enabled: boolean) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/other-requests/organizations')).json();
  }, [fetch]);

  return useSWR<{ id: string; name: string }[]>(
    enabled ? 'other-requests-organizations' : null,
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

const OtherRequestForm = ({
  data,
  reload,
}: {
  data?: OtherRequestItem;
  reload: () => void;
}) => {
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [existingDocuments, setExistingDocuments] = useState<
    OtherRequestDocument[]
  >(data?.documents || []);
  const [pendingFiles, setPendingFiles] = useState<
    { id: string; name: string; file: File }[]
  >([]);
  const [saving, setSaving] = useState(false);

  const form = useForm<OtherRequestFormValues>({
    defaultValues: {
      title: data?.title || '',
      description: data?.description || '',
      priority: (['LOW', 'MEDIUM', 'HIGH'].includes(data?.priority || '')
        ? data?.priority
        : 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
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
    async (values: OtherRequestFormValues) => {
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
          data?.id ? `/other-requests/${data.id}` : '/other-requests',
          {
            method: data?.id ? 'PUT' : 'POST',
            body: JSON.stringify({
              title: values.title,
              description: values.description,
              priority: values.priority,
              documentIds,
            }),
          }
        );

        if (!response.ok) {
          toaster.show(
            t('other_request_save_failed', 'Failed to save other request'),
            'warning'
          );
          return;
        }

        toaster.show(
          t('other_request_saved', 'Other request saved'),
          'success'
        );
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
        <Select name="priority" label={t('priority', 'Priority')}>
          <option value="LOW">{t('priority_low', 'Low')}</option>
          <option value="MEDIUM">{t('priority_medium', 'Medium')}</option>
          <option value="HIGH">{t('priority_high', 'High')}</option>
        </Select>

        <div className="flex flex-col gap-[8px]">
          <div className="text-[14px]">{t('documents', 'Documents')}</div>
          <label className="inline-flex items-center px-[12px] py-[8px] bg-newBgColorInner border border-newTableBorder rounded-[8px] text-[13px] cursor-pointer hover:bg-newTableHeader transition-colors w-full gap-[8px]">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={selectFiles}
            />
            {t('choose_files', 'Choose files')}
          </label>
          {!existingDocuments.length && !pendingFiles.length && (
            <div className="text-[12px] text-newTableText">
              {t('no_documents', 'No documents')}
            </div>
          )}
          {existingDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-[8px] text-[13px]"
            >
              <span className="truncate">
                {doc.originalName || doc.name || doc.path}
              </span>
              <button
                type="button"
                className="text-red-400"
                onClick={() => removeExistingDocument(doc.id)}
              >
                {t('remove', 'Remove')}
              </button>
            </div>
          ))}
          {pendingFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-[8px] text-[13px]"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                className="text-red-400"
                onClick={() => removePendingFile(file.id)}
              >
                {t('remove', 'Remove')}
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-[8px] mt-[8px]">
          <Button type="button" secondary onClick={() => modal.closeAll()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={saving}>
            {t('save', 'Save')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

export const OtherRequestsComponent = () => {
  const user = useUser();
  const isTakkaAdmin = user?.isTakkaAdmin === true;
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const t = useT();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const [organizationId, setOrganizationId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, organizationId, statusFilter, priorityFilter]);

  const { data, mutate, isLoading } = useOtherRequests(page, {
    search: debouncedSearch,
    organizationId,
    status: statusFilter,
    priority: priorityFilter,
    isTakkaAdmin,
  });
  const { data: organizationsData } = useOtherRequestOrganizations(isTakkaAdmin);
  const organizations = Array.isArray(organizationsData) ? organizationsData : [];
  const results = data?.results || [];

  const openForm = useCallback(
    (item?: OtherRequestItem) => () => {
      modal.openModal({
        title: item
          ? t('edit_other_request', 'Edit other request')
          : t('new_other_request', 'New other request'),
        withCloseButton: true,
        children: (
          <OtherRequestForm data={item} reload={() => mutate()} />
        ),
      });
    },
    [modal, mutate, t]
  );

  const openView = useCallback(
    (item: OtherRequestItem) => () => {
      modal.openModal({
        title: t('view_other_request', 'View other request'),
        withCloseButton: true,
        children: (
          <div className="flex flex-col gap-[12px] p-[16px] pt-0 max-w-[600px]">
            <div>
              <div className="text-[12px] text-newTableText">
                {t('title', 'Title')}
              </div>
              <div className="text-[16px] font-[500]">{item.title}</div>
            </div>
            <div>
              <div className="text-[12px] text-newTableText">
                {t('description', 'Description')}
              </div>
              <div className="text-[14px] whitespace-pre-wrap">
                {item.description}
              </div>
            </div>
            <div className="flex gap-[16px] flex-wrap">
              <div>
                <div className="text-[12px] text-newTableText mb-[4px]">
                  {t('status', 'Status')}
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div>
                <div className="text-[12px] text-newTableText mb-[4px]">
                  {t('priority', 'Priority')}
                </div>
                <PriorityBadge priority={item.priority} />
              </div>
            </div>
            {!!item.documents?.length && (
              <div>
                <div className="text-[12px] text-newTableText mb-[4px]">
                  {t('documents', 'Documents')}
                </div>
                <div className="flex flex-col gap-[4px]">
                  {item.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.path}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[14px] underline truncate"
                    >
                      {doc.originalName || doc.name || doc.path}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ),
      });
    },
    [modal, t]
  );

  const remove = useCallback(
    (item: OtherRequestItem) => async () => {
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete_this_other_request',
            'Are you sure you want to delete this other request?'
          )
        ))
      ) {
        return;
      }

      const response = await fetch(`/other-requests/${item.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        toaster.show(
          t('other_request_delete_failed', 'Failed to delete other request'),
          'warning'
        );
        return;
      }
      toaster.show(
        t('other_request_deleted', 'Other request deleted'),
        'success'
      );
      mutate();
    },
    [fetch, mutate, t, toaster]
  );

  const changeStatus = useCallback(
    (item: OtherRequestItem, status: string) => async () => {
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_you_want_to_change_status',
            'Change status to {{status}}?',
            {
              status: t(
                STATUS_LABEL_KEYS[status] || status.toLowerCase(),
                status
              ),
            }
          ),
          t('yes_confirm', 'Yes, confirm!')
        ))
      ) {
        return;
      }

      const response = await fetch(`/other-requests/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        toaster.show(
          t('other_request_status_failed', 'Failed to update status'),
          'warning'
        );
        return;
      }
      toaster.show(
        t('other_request_status_updated', 'Status updated'),
        'success'
      );
      mutate();
    },
    [fetch, mutate, t, toaster]
  );

  const showCreator = useMemo(
    () =>
      isTakkaAdmin ||
      user?.role === 'ADMIN' ||
      user?.role === 'SUPERADMIN',
    [isTakkaAdmin, user?.role]
  );

  const rowGridClass = useMemo(() => {
    if (isTakkaAdmin) {
      return 'min-w-[980px] grid-cols-[minmax(0,1.4fr)_120px_110px_110px_minmax(0,1fr)_300px]';
    }
    if (showCreator) {
      return 'min-w-[900px] grid-cols-[minmax(0,1.5fr)_110px_110px_minmax(0,1fr)_300px]';
    }
    return 'min-w-[780px] grid-cols-[minmax(0,1.5fr)_110px_110px_300px]';
  }, [isTakkaAdmin, showCreator]);

  return (
    <div className="bg-newBgColorInner flex-1 min-w-0 flex-col flex p-[12px] lg:p-[20px] gap-[16px]">
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <div className="min-w-0">
          <h1 className="text-[24px] font-[600]">
            {t('other_requests', 'Other Requests')}
          </h1>
          <p className="text-newTableText text-[14px] mt-[4px]">
            {isTakkaAdmin
              ? t(
                  'other_requests_admin_description',
                  'Review and update other requests across organizations.'
                )
              : t(
                  'other_requests_description',
                  'Create and manage other requests for your organization.'
                )}
          </p>
        </div>
        {!isTakkaAdmin && (
          <Button onClick={openForm()}>
            {t('new_other_request', 'New other request')}
          </Button>
        )}
      </div>

      {isTakkaAdmin && (
        <div className="flex flex-wrap gap-[12px] items-end bg-newBgColorInner border border-newTableBorder rounded-[8px] p-[12px]">
          <div className="flex flex-col gap-[6px] flex-1 min-w-[200px]">
            <div className="text-[12px] text-newTableText">
              {t('search', 'Search')}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                'search_other_requests',
                'Search by title or description'
              )}
              className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor outline-none"
            />
          </div>
          <div className="flex flex-col gap-[6px] min-w-[180px]">
            <div className="text-[12px] text-newTableText">
              {t('organization', 'Organization')}
            </div>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor outline-none"
            >
              <option value="">
                {t('all_organizations', 'All organizations')}
              </option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[6px] min-w-[160px]">
            <div className="text-[12px] text-newTableText">
              {t('status', 'Status')}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor outline-none"
            >
              <option value="">{t('all_statuses', 'All statuses')}</option>
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(STATUS_LABEL_KEYS[status], status)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[6px] min-w-[160px]">
            <div className="text-[12px] text-newTableText">
              {t('priority', 'Priority')}
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor outline-none"
            >
              <option value="">
                {t('all_priorities', 'All priorities')}
              </option>
              {ALL_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {t(PRIORITY_LABEL_KEYS[priority], priority)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="border border-newTableBorder rounded-[8px] overflow-hidden overflow-x-auto">
        {isLoading && (
          <div className="px-[16px] py-[20px] text-newTableText text-[14px]">
            {t('loading', 'Loading...')}
          </div>
        )}
        {!isLoading && !results.length && (
          <div className="px-[16px] py-[32px] text-center text-newTableText text-[14px]">
            {t('no_other_requests', 'No other requests yet.')}
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
              {isTakkaAdmin && (
                <div className="min-w-0">
                  {t('organization', 'Organization')}
                </div>
              )}
              <div>{t('status', 'Status')}</div>
              <div>{t('priority', 'Priority')}</div>
              {showCreator && (
                <div className="min-w-0">{t('created_by', 'Created by')}</div>
              )}
              <div className="text-end">{t('actions', 'Actions')}</div>
            </div>
            {results.map((item) => {
              const canEdit = !isTakkaAdmin && EDITABLE.includes(item.status);
              const showAdminActions =
                isTakkaAdmin &&
                ['NEW', 'IN_PROGRESS'].includes(item.status);
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
                  {isTakkaAdmin && (
                    <div className="text-[14px] truncate text-newTableText min-w-0">
                      {item.organization?.name || '-'}
                    </div>
                  )}
                  <div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div>
                    <PriorityBadge priority={item.priority} />
                  </div>
                  {showCreator && (
                    <div className="text-[14px] truncate text-newTableText min-w-0">
                      {item.createdBy?.name || item.createdBy?.email || '-'}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-[8px] flex-wrap">
                    <ActionButton onClick={openView(item)}>
                      {t('view', 'View')}
                    </ActionButton>
                    {showAdminActions &&
                      ADMIN_ACTIONS.filter(
                        (action) => action.status !== item.status
                      ).map((action) => (
                        <ActionButton
                          key={action.status}
                          danger={action.danger}
                          onClick={changeStatus(item, action.status)}
                        >
                          {t(action.labelKey, action.label)}
                        </ActionButton>
                      ))}
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
