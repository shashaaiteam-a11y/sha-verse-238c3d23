/**
 * BaseService - Abstract base class for all API services
 * Provides common functionality for database operations
 */

import { supabase } from '@/integrations/supabase/client';

export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
  success: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  page: number;
}

export abstract class BaseService {
  protected supabase = supabase;

  /**
   * Get current authenticated user ID
   */
  protected async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user?.id || null;
  }

  /**
   * Require authentication - throws if not authenticated
   */
  protected async requireAuth(): Promise<string> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('Authentication required');
    }
    return userId;
  }

  /**
   * Handle Supabase response and convert to ServiceResult
   */
  protected handleResponse<T>(
    data: T | null,
    error: any
  ): ServiceResult<T> {
    if (error) {
      return {
        data: null,
        error: new Error(error.message || 'Operation failed'),
        success: false,
      };
    }
    return {
      data,
      error: null,
      success: true,
    };
  }

  /**
   * Get pagination range
   */
  protected getPaginationRange(params: PaginationParams): { start: number; end: number } {
    const page = params.page || 0;
    const limit = params.limit || 20;
    const start = page * limit;
    const end = start + limit - 1;
    return { start, end };
  }

  /**
   * Apply pagination to a query
   */
  protected applyPagination<T>(query: T, params: PaginationParams): T {
    const { start, end } = this.getPaginationRange(params);
    return (query as any).range(start, end);
  }
}
