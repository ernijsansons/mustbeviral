// Common type definitions used across the application
// These replace common 'unknown' types with proper typed interfaces

// Generic data types
export type UnknownObject = Record<string, unknown>;
export type UnknownArray = unknown[];
export type AnyFunction = (...args: unknown[]) => unknown;
export type AsyncFunction = (...args: unknown[]) => Promise<unknown>;

// Error handling types
export interface ErrorWithMessage {
  message: string;
  code?: string;
  stack?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Event handler types
export type ChangeHandler = (value: string | number | boolean) => void;
export type SubmitHandler<T = UnknownObject> = (data: T) => void | Promise<void>;
export type ClickHandler = (event: React.MouseEvent) => void;

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorWithMessage;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// User and authentication types
export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

// Database record types
export interface BaseRecord {
  id: string | number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Form data types
export interface FormData {
  [key: string]: string | number | boolean | File | undefined;
}

// Configuration types
export interface Config {
  [key: string]: string | number | boolean | Config;
}

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Replace common 'unknown' patterns
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export interface JSONArray extends Array<JSONValue> {}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

// Hook return types
export interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Replace Function type
export type GenericFunction = (...args: unknown[]) => unknown;
export type VoidFunction = () => void;
export type AsyncVoidFunction = () => Promise<void>;