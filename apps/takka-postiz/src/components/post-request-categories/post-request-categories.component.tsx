'use client';

import React, { useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useModals } from '@gitroom/takka-postiz/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { deleteDialog } from '@gitroom/react/helpers/takka-postiz/delete.dialog';

type CategoryItem = {
  id: string;
  name: string;
};

const usePostRequestCategories = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/post-request-categories')).json();
  }, [fetch]);

  return useSWR<CategoryItem[]>('post-request-categories', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
};

const CategoryForm = ({
  data,
  reload,
}: {
  data?: CategoryItem;
  reload: () => void;
}) => {
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const t = useT();
  const [name, setName] = useState(data?.name || '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toaster.show(
        t('category_name_required', 'Category name is required'),
        'warning'
      );
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        data?.id
          ? `/post-request-categories/${data.id}`
          : '/post-request-categories',
        {
          method: data?.id ? 'PUT' : 'POST',
          body: JSON.stringify({ name: trimmed }),
        }
      );

      if (!response.ok) {
        toaster.show(
          t('category_save_failed', 'Failed to save category'),
          'warning'
        );
        return;
      }

      toaster.show(
        t('category_saved', 'Category saved'),
        'success'
      );
      modal.closeAll();
      reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-[16px] p-[16px] pt-0 w-[420px] max-w-full">
      <div className="flex flex-col gap-[6px]">
        <label className="text-[12px] text-newTableText">
          {t('name', 'Name')}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor outline-none w-full"
          placeholder={t('category_name_placeholder', 'e.g. Blog, News, Product')}
        />
      </div>
      <div className="flex justify-end gap-[8px]">
        <Button type="button" secondary onClick={() => modal.closeAll()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button type="button" onClick={submit} loading={saving}>
          {t('save', 'Save')}
        </Button>
      </div>
    </div>
  );
};

export const PostRequestCategoriesComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const { data, mutate, isLoading } = usePostRequestCategories();
  const categories = Array.isArray(data) ? data : [];

  const openForm = useCallback(
    (item?: CategoryItem) => () => {
      modal.openModal({
        title: item
          ? t('edit_category', 'Edit category')
          : t('new_category', 'New category'),
        withCloseButton: true,
        children: <CategoryForm data={item} reload={mutate} />,
      });
    },
    [modal, mutate, t]
  );

  const remove = useCallback(
    (item: CategoryItem) => async () => {
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete_category',
            'Delete category "{{name}}"? Post requests using it will keep no category.',
            { name: item.name }
          ),
          t('yes_delete_it', 'Yes, delete it!')
        ))
      ) {
        return;
      }

      const response = await fetch(`/post-request-categories/${item.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        toaster.show(
          t('category_delete_failed', 'Failed to delete category'),
          'warning'
        );
        return;
      }
      toaster.show(t('category_deleted', 'Category deleted'), 'success');
      mutate();
    },
    [fetch, mutate, t, toaster]
  );

  return (
    <div className="bg-newBgColorInner flex-1 min-w-0 flex-col flex p-[12px] lg:p-[20px] gap-[16px]">
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <div className="min-w-0">
          <h1 className="text-[24px] font-[600]">
            {t('post_request_categories', 'Post Request Categories')}
          </h1>
          <p className="text-newTableText text-[14px] mt-[4px]">
            {t(
              'post_request_categories_description',
              'Create categories for your organization and assign them when creating post requests.'
            )}
          </p>
        </div>
        <Button onClick={openForm()}>
          {t('new_category', 'New category')}
        </Button>
      </div>

      <div className="border border-newTableBorder rounded-[8px] overflow-hidden">
        {isLoading && (
          <div className="px-[16px] py-[20px] text-newTableText text-[14px]">
            {t('loading', 'Loading...')}
          </div>
        )}
        {!isLoading && !categories.length && (
          <div className="px-[16px] py-[32px] text-center text-newTableText text-[14px]">
            {t('no_categories', 'No categories yet.')}
          </div>
        )}
        {!!categories.length && (
          <>
            <div className="grid grid-cols-[1fr_220px] gap-[12px] px-[16px] py-[14px] bg-newTableHeader border-b border-newTableBorder text-[13px] uppercase tracking-wide text-newTableText">
              <div>{t('name', 'Name')}</div>
              <div className="text-end">{t('actions', 'Actions')}</div>
            </div>
            {categories.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_220px] gap-[12px] px-[16px] py-[16px] items-center border-b border-newTableBorder last:border-b-0 hover:bg-boxHover transition-colors"
              >
                <div className="text-[16px] font-[500] truncate">{item.name}</div>
                <div className="flex items-center justify-end gap-[8px]">
                  <button
                    type="button"
                    onClick={openForm(item)}
                    className="h-[36px] px-[14px] rounded-[8px] text-[13px] font-[500] border border-newTableBorder bg-newBgColorInner text-textColor hover:bg-boxHover cursor-pointer"
                  >
                    {t('edit', 'Edit')}
                  </button>
                  <button
                    type="button"
                    onClick={remove(item)}
                    className="h-[36px] px-[14px] rounded-[8px] text-[13px] font-[500] border border-newTableBorder text-red-400 hover:bg-red-500/10 cursor-pointer"
                  >
                    {t('delete', 'Delete')}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
