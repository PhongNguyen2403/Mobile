export interface PaginationParams {
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class PaginationUtil {
  static getPagination(params: PaginationParams) {
    const page = Math.max(1, parseInt(String(params.page || '1'), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(params.limit || '10'), 10)));
    const skip = (page - 1) * limit;
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';

    return { page, limit, skip, take: limit, sortBy, sortOrder };
  }

  static formatResult<T>(items: T[], total: number, page: number, limit: number): PaginationResult<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
