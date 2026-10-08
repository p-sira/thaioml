import { Mark, mergeAttributes } from '@tiptap/core';

export interface CommentOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      /**
       * Set a comment mark on current selection
       */
      setComment: (options: { commentId: string; resolved?: boolean } | string) => ReturnType;
      /**
       * Unset a comment mark either for current selection or globally for a specific commentId
       */
      unsetComment: (commentId?: string) => ReturnType;
      /**
       * Update resolved status of all marks with a given commentId
       */
      updateCommentStatus: (commentId: string, resolved: boolean) => ReturnType;
    };
  }
}

export const CommentMark = Mark.create<CommentOptions>({
  name: 'comment',

  inclusive: false,
  excludes: '',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: element =>
          element.getAttribute('data-comment-id') || element.getAttribute('data-comment'),
        renderHTML: attributes => {
          if (!attributes.commentId) {
            return {};
          }
          return {
            'data-comment-id': attributes.commentId,
          };
        },
      },
      resolved: {
        default: false,
        parseHTML: element => element.getAttribute('data-resolved') === 'true',
        renderHTML: attributes => {
          return {
            'data-resolved': attributes.resolved ? 'true' : 'false',
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-comment-id]',
      },
      {
        tag: 'mark[data-comment]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const isResolved = HTMLAttributes['data-resolved'] === 'true';
    const classes = isResolved
      ? 'comment-highlight comment-highlight-resolved'
      : 'comment-highlight';

    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: classes,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        options =>
        ({ commands }) => {
          const commentId = typeof options === 'string' ? options : options.commentId;
          const resolved = typeof options === 'object' && options.resolved ? true : false;
          return commands.setMark(this.name, { commentId, resolved });
        },

      unsetComment:
        (commentId?: string) =>
        ({ tr, dispatch, state }) => {
          if (!commentId) {
            // Unset on current selection
            if (dispatch) {
              const { from, to } = state.selection;
              tr.removeMark(from, to, this.type);
            }
            return true;
          }

          // Global unset for specific commentId
          if (dispatch) {
            tr.doc.descendants((node, pos) => {
              if (node.marks && node.marks.length > 0) {
                node.marks.forEach(mark => {
                  if (mark.type === this.type && mark.attrs.commentId === commentId) {
                    tr.removeMark(pos, pos + node.nodeSize, mark);
                  }
                });
              }
            });
          }
          return true;
        },

      updateCommentStatus:
        (commentId: string, resolved: boolean) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.doc.descendants((node, pos) => {
              if (node.marks && node.marks.length > 0) {
                node.marks.forEach(mark => {
                  if (mark.type === this.type && mark.attrs.commentId === commentId) {
                    tr.removeMark(pos, pos + node.nodeSize, mark);
                    tr.addMark(
                      pos,
                      pos + node.nodeSize,
                      mark.type.create({
                        ...mark.attrs,
                        resolved,
                      })
                    );
                  }
                });
              }
            });
          }
          return true;
        },
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize: {
          open(_state: unknown, mark: { attrs: { commentId?: string; resolved?: boolean } }) {
            const id = mark.attrs.commentId;
            const res = mark.attrs.resolved ? ' data-resolved="true"' : '';
            return `<mark data-comment-id="${id}"${res}>`;
          },
          close() {
            return '</mark>';
          },
        },
      },
    };
  },
});
