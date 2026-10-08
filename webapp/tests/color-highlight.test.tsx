import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  HighlightPickerDropdown,
  TextColorPickerDropdown,
  HIGHLIGHT_OPTIONS,
  TEXT_COLOR_OPTIONS,
} from '@/components/cms/ColorPickerDropdown';

describe('Highlight and Text Color Pickers', () => {
  it('renders HighlightPickerDropdown and triggers onSelect when picking a color', () => {
    const handleSelect = jest.fn();
    const handleClear = jest.fn();

    render(
      <HighlightPickerDropdown
        currentColor="amber"
        onSelect={handleSelect}
        onClear={handleClear}
      />
    );

    const toggleBtn = screen.getByTitle(/highlight color/i);
    fireEvent.click(toggleBtn);

    // Dropdown heading
    expect(screen.getByText('Adaptive Highlight')).toBeInTheDocument();

    // Verify all highlight options are present
    HIGHLIGHT_OPTIONS.forEach(opt => {
      expect(screen.getByTitle(opt.label)).toBeInTheDocument();
    });

    // Select emerald
    const greenOption = screen.getByTitle('Green / Emerald');
    fireEvent.click(greenOption);

    expect(handleSelect).toHaveBeenCalledWith('emerald');

    // Reopen and clear
    fireEvent.click(toggleBtn);
    const clearBtn = screen.getByRole('button', { name: /remove highlight/i });
    fireEvent.click(clearBtn);

    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('renders TextColorPickerDropdown and triggers onSelect when picking a text color', () => {
    const handleSelect = jest.fn();
    const handleClear = jest.fn();

    render(
      <TextColorPickerDropdown
        currentColor="blue"
        onSelect={handleSelect}
        onClear={handleClear}
      />
    );

    const toggleBtn = screen.getByTitle(/text color/i);
    fireEvent.click(toggleBtn);

    // Dropdown heading
    expect(screen.getByText('Adaptive Text Color')).toBeInTheDocument();

    // Verify text color options
    TEXT_COLOR_OPTIONS.forEach(opt => {
      expect(screen.getByTitle(opt.label)).toBeInTheDocument();
    });

    // Select red
    const redOption = screen.getByTitle('Red');
    fireEvent.click(redOption);

    expect(handleSelect).toHaveBeenCalledWith('red');

    // Reopen and clear
    fireEvent.click(toggleBtn);
    const resetBtn = screen.getByRole('button', { name: /reset text color/i });
    fireEvent.click(resetBtn);

    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
