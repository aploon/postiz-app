'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/takka-postiz/components/new-launch/providers/high.order.provider';
export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: null,
  CustomPreviewComponent: undefined,
  dto: undefined,
  maximumCharacters: 4096,
});
