import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Editor } from '@tiptap/react';
import LinkHoverPopup from '@/components/cms/LinkHoverPopup';
import LinkDialog from '@/components/cms/LinkDialog';

describe('Custom Link Popup and Dialog Components', () => {
  it('renders LinkDialog modal with custom theme styling and saves input URL', () => {
    const handleSave = jest.fn();
    const handleRemove = jest.fn();
    const handleClose = jest.fn();

    render(
      <LinkDialog
        isOpen={true}
        initialUrl="https://example.com"
        selectedText="Example Guidelines"
        onSave={handleSave}
        onRemove={handleRemove}
        onClose={handleClose}
      />
    );

    // Dialog heading and inputs
    expect(screen.getByText('Edit Link')).toBeInTheDocument();
    expect(screen.getByText(/Example Guidelines/i)).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: /destination url/i });
    expect(input).toHaveValue('https://example.com');

    // Remove button should be present when initialUrl is provided
    expect(screen.getByRole('button', { name: /remove link/i })).toBeInTheDocument();

    // Edit value and save
    fireEvent.change(input, { target: { value: 'https://new-url.com' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(handleSave).toHaveBeenCalledWith('https://new-url.com');
  });

  it('triggers onRemove from LinkDialog when remove button is clicked', () => {
    const handleSave = jest.fn();
    const handleRemove = jest.fn();
    const handleClose = jest.fn();

    render(
      <LinkDialog
        isOpen={true}
        initialUrl="snomed:38341003"
        onSave={handleSave}
        onRemove={handleRemove}
        onClose={handleClose}
      />
    );

    const removeBtn = screen.getByRole('button', { name: /remove link/i });
    fireEvent.click(removeBtn);

    expect(handleRemove).toHaveBeenCalledTimes(1);
  });

  it('detects link hover inside container and allows editing or removing', () => {
    const container = document.createElement('div');
    const anchor = document.createElement('a');
    anchor.href = 'https://thaioml.org/test';
    anchor.textContent = 'ThaiOML Link';
    container.appendChild(anchor);
    document.body.appendChild(container);

    const mockRun = jest.fn();
    const mockEditor = {
      view: {
        posAtDOM: jest.fn().mockReturnValue(10),
      },
      state: {
        selection: { from: 10, to: 15 },
        doc: {
          content: { size: 100 },
          resolve: jest.fn().mockReturnValue({
            marks: () => [{ type: { name: 'link' } }],
          }),
        },
      },
      chain: jest.fn(() => ({
        setTextSelection: jest.fn().mockReturnThis(),
        extendMarkRange: jest.fn().mockReturnThis(),
        unsetLink: jest.fn().mockReturnThis(),
        focus: jest.fn().mockReturnThis(),
        run: mockRun,
      })),
    } as unknown as Editor;

    const containerRef = { current: container };
    const handleEdit = jest.fn();

    render(
      <LinkHoverPopup
        editor={mockEditor}
        containerRef={containerRef}
        onEditLink={handleEdit}
        editable={true}
      />
    );

    // Mock anchor rect
    jest.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 120,
      left: 50,
      right: 150,
      width: 100,
      height: 20,
      x: 50,
      y: 100,
      toJSON: () => {},
    });
    jest.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 800,
      left: 0,
      right: 1000,
      width: 1000,
      height: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Simulate mouse move over the link anchor
    fireEvent.mouseMove(anchor);

    // Verify popup shows link and action buttons
    expect(screen.getByText('https://thaioml.org/test')).toBeInTheDocument();
    const editBtn = screen.getByTitle('Edit link URL');
    const removeBtn = screen.getByTitle('Remove link');
    expect(editBtn).toBeInTheDocument();
    expect(removeBtn).toBeInTheDocument();

    // Click Edit
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith('https://thaioml.org/test', 11);

    // Re-trigger hover and click Remove
    fireEvent.mouseMove(anchor);
    const removeBtn2 = screen.getByTitle('Remove link');
    fireEvent.click(removeBtn2);
    expect(mockRun).toHaveBeenCalled();

    document.body.removeChild(container);
  });
});
