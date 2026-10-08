import { Mark, mergeAttributes } from '@tiptap/core';

export type HighlightColor =
  | 'amber'
  | 'emerald'
  | 'sky'
  | 'purple'
  | 'rose'
  | 'accent';

export interface HighlightOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlight: {
      /**
       * Set a highlight mark on current selection
       */
      setHighlight: (attributes?: { color?: string }) => ReturnType;
      /**
       * Toggle a highlight mark on current selection
       */
      toggleHighlight: (attributes?: { color?: string }) => ReturnType;
      /**
       * Remove highlight mark from current selection
       */
      unsetHighlight: () => ReturnType;
    };
  }
}

export const HighlightMark = Mark.create<HighlightOptions>({
  name: 'highlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: 'amber',
        parseHTML: element =>
          element.getAttribute('data-highlight') ||
          element.getAttribute('data-color') ||
          'amber',
        renderHTML: attributes => {
          return {
            'data-highlight': attributes.color || 'amber',
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-highlight]',
      },
      {
        tag: 'mark:not([data-comment-id]):not([data-comment])',
        getAttrs: element => {
          if (typeof element === 'string') return false;
          // Avoid collision with editorial CommentMark
          if (
            element.hasAttribute('data-comment-id') ||
            element.hasAttribute('data-comment')
          ) {
            return false;
          }
          return { color: element.getAttribute('data-color') || 'amber' };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const color = HTMLAttributes['data-highlight'] || 'amber';
    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `theme-highlight theme-highlight-${color}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setHighlight:
        attributes =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleHighlight:
        attributes =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
