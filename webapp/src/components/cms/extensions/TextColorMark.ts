import { Mark, mergeAttributes } from '@tiptap/core';

export type TextColor =
  | 'default'
  | 'muted'
  | 'accent'
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'purple';

export interface TextColorOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textColor: {
      /**
       * Set text color on current selection
       */
      setTextColor: (color: string) => ReturnType;
      /**
       * Unset text color on current selection
       */
      unsetTextColor: () => ReturnType;
    };
  }
}

export const TextColorMark = Mark.create<TextColorOptions>({
  name: 'textColor',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: 'default',
        parseHTML: element =>
          element.getAttribute('data-text-color') ||
          element.getAttribute('data-color') ||
          'default',
        renderHTML: attributes => {
          if (!attributes.color || attributes.color === 'default') {
            return {};
          }
          return {
            'data-text-color': attributes.color,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-text-color]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const color = HTMLAttributes['data-text-color'] || 'default';
    if (color === 'default') {
      return [
        'span',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
        0,
      ];
    }
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `theme-text theme-text-${color}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setTextColor:
        color =>
        ({ commands }) => {
          if (color === 'default') {
            return commands.unsetMark(this.name);
          }
          return commands.setMark(this.name, { color });
        },
      unsetTextColor:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
