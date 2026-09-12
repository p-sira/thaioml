import { Extension, Editor, Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { getSnomedSuggestion } from '@/app/actions/medical';

import { 
  forwardRef, 
  useImperativeHandle, 
  useState 
} from 'react';

interface CommandItem {
  title: string;
  action: (editor: Editor, range: Range) => void;
}

interface CommandProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

const CommandList = forwardRef((props: CommandProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="bg-white border rounded shadow-lg overflow-hidden w-64 text-sm text-gray-800 z-50 p-1">
      {props.items.length ? (
        props.items.map((item: CommandItem, index: number) => (
          <button
            className={`w-full text-left px-2 py-1.5 rounded ${
              index === selectedIndex ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'
            }`}
            key={index}
            onClick={() => selectItem(index)}
          >
            {item.title}
          </button>
        ))
      ) : (
        <div className="px-2 py-1.5 text-gray-500">No results</div>
      )}
    </div>
  );
});
CommandList.displayName = 'CommandList';

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: Editor, range: Range, props: CommandItem }) => {
          props.action(editor, range);
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export const getSuggestionOptions = () => ({
  items: ({ query }: { query: string }): CommandItem[] => {
    return [
      {
        title: 'Term Search',
        action: async (editor: Editor, range: Range) => {
          const term = prompt('Enter medical term to search:');
          if (term) {
            editor.chain().focus().deleteRange(range).run();
            const placeholder = " ⏳ Searching...";
            editor.chain().insertContentAt(range.from, placeholder).run();
            
            try {
              const data = await getSnomedSuggestion(term);
              const concept = data.concept || data.term || data.id || term;
              const snomedId = data.id || 'unknown';
              
              editor.chain()
                .deleteRange({ from: range.from, to: range.from + placeholder.length })
                .insertContentAt(range.from, `<a href="snomed:${snomedId}">${concept}</a> `)
                .run();
            } catch {
              editor.chain().deleteRange({ from: range.from, to: range.from + placeholder.length }).run();
              alert('Term search failed. Make sure the RAG backend is running.');
            }
          } else {
            editor.chain().focus().deleteRange(range).run();
          }
        },
      },
      {
        title: 'Heading 1',
        action: (editor: Editor, range: Range) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
        },
      },
      {
        title: 'Heading 2',
        action: (editor: Editor, range: Range) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
        },
      }
    ].filter(item => item.title.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5);
  },

  render: () => {
    let component: ReactRenderer;
    let popup: TippyInstance[];

    return {
      onStart: (props: { editor: Editor; clientRect: DOMRect | null }) => {
        component = new ReactRenderer(CommandList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect: () => props.clientRect!,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: { clientRect: DOMRect | null }) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: () => props.clientRect!,
        });
      },

      onKeyDown(props: { event: KeyboardEvent }) {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (component.ref as any)?.onKeyDown(props);
      },

      onExit() {
        if (popup && popup.length > 0) {
          popup[0].destroy();
        }
        if (component) {
          component.destroy();
        }
      },
    };
  },
});
