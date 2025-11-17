import { render } from '@testing-library/react';
import App from './App';

test('renders App root', () => {
  const { container } = render(<App />);
  expect(container.querySelector('.App')).toBeTruthy();
});
