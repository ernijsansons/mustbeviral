/**
 * Core Repository Interface - Domain-Driven Design Pattern
 * Enforces Interface Segregation Principle (ISP) and Dependency Inversion Principle (DIP)
 */

export interface IBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRepository<TEntity extends IBaseEntity> {
  findById(id: string): Promise<TEntity | null>;
  findAll(options?: QueryOptions): Promise<TEntity[]>;
  create(entity: Omit<TEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TEntity>;
  update(id: string, entity: Partial<TEntity>): Promise<TEntity>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}

export interface ISearchableRepository<TEntity extends IBaseEntity> extends IRepository<TEntity> {
  search(criteria: SearchCriteria<TEntity>): Promise<SearchResult<TEntity>>;
  findByField<K extends keyof TEntity>(field: K, value: TEntity[K]): Promise<TEntity[]>;
}

export interface ITransactionalRepository<TEntity extends IBaseEntity> extends IRepository<TEntity> {
  beginTransaction(): Promise<ITransaction>;
  executeInTransaction<T>(operation: (tx: ITransaction) => Promise<T>): Promise<T>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface SearchCriteria<T> {
  query?: string;
  filters?: Partial<T>;
  pagination?: {
    page: number;
    limit: number;
  };
  sorting?: {
    field: keyof T;
    direction: 'asc' | 'desc';
  }[];
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ITransaction {
  id: string;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}