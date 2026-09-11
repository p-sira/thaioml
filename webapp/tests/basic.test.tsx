import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// Create a mock component to represent testing React components
const MockComponent = () => <div>Hello ThaiOML</div>;

describe('Basic Webapp Test', () => {
  it('renders a heading or text successfully', () => {
    render(<MockComponent />);
    
    const textElement = screen.getByText(/Hello ThaiOML/i);
    expect(textElement).toBeInTheDocument();
  });
});
