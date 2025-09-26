// Mock for wouter routing library
import React from 'react';

export const useLocation = jest.fn(() => ['/', jest.fn()]);
export const useRoute = jest.fn(() => [false, {}]);
export const useParams = jest.fn(() => ({}));

export const Link = ({ _href, children, ...props }: unknown) => (
  <a href={href} {...props}>{children}</a>
);

export const Route = ({ children }: unknown) => <>{children}</>;
export const Switch = ({ children }: unknown) => <>{children}</>;
export const Router = ({ children }: unknown) => <>{children}</>;
export const Redirect = () => null;

// For tests that expect react-router-dom
export const useNavigate = jest.fn(() => jest.fn());
export const Navigate = () => null;