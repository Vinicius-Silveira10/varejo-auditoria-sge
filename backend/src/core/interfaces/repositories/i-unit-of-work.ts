export interface IUnitOfWork {
  execute<T>(work: (repositories: any) => Promise<T>): Promise<T>;
}
