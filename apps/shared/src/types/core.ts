/**
 * Core Primitive Types
 * 
 * This file contains fundamental primitive types used across the application.
 * It defines only the most basic shared types that don't belong to a specific domain.
 */

// Basic utility types
export interface Dictionary<T = any> {
  [key: string]: T;
}

export interface ErrorResponse {
  error: string;
  code: string;
  status: number;
  details?: any;
}

export interface SuccessResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

// Common ID types
export type UUID = string;
export type Timestamp = string; // ISO format

// Common status types
export type Status = 'active' | 'inactive' | 'pending' | 'error';

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Common tree-like structure
export interface TreeNode<T = any> {
  id: string;
  parentId?: string;
  children?: TreeNode<T>[];
  data: T;
}