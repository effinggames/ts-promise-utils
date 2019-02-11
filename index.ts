// A promise-returning function.
export interface PromiseFunction<T> {
  (): Promise<T>;
}

/**
 * Default error handler that logs the error, then returns undefined.
 * @param promise The promise to catch errors for.
 * @returns Returns the wrapped promise.
 */
export function defaultErrorHandler<T>(promise: Promise<T>): Promise<T | undefined> {
  return promise.catch((err) => {
    console.error(err);

    return undefined;
  });
}

/**
 * Resolves all the promises and filters out any empty values.
 * @param promises List of promises to resolve.
 * @returns Returns a promise with the list of non-empty values.
 */
export async function resolveAllAndFilterEmpty<T>(promises: Promise<T | undefined>[]): Promise<T[]> {
  return (await Promise.all(promises)).filter(notEmpty);
}

/**
 * Takes an array of promise functions, and returns a single promise function wrapped with Promise.all().
 * @param promiseFuncs The promise-returning functions to flatten.
 * @returns Returns a promise function with all the results combined via Promise.all().
 */
export function combinePromiseFunctions<T>(promiseFuncs: PromiseFunction<T>[]): PromiseFunction<T[]> {
  return () => {
    const promises = promiseFuncs.map((promiseFunc) => promiseFunc());

    return Promise.all(promises);
  };
}

/**
 * Executes a list of promise functions sequentially.
 * Chains all the promises together, then returns the complete result array at the end.
 * @param promiseFuncs The promise functions to execute sequentially.
 * @returns Returns a promise of the results.
 */
export function executeSequential<T>(promiseFuncs: PromiseFunction<T>[]): Promise<T[]> {
  const results: T[] = [];

  const promiseChain = promiseFuncs.reduce(async (promise, promiseFunc) => {
    await promise;
    const result = await promiseFunc();

    results.push(result);
  }, Promise.resolve());

  return promiseChain.then(() => results);
}

/**
 * Executes a list of promise functions sequentially, in batches.
 * Useful for throttling requests to even out server load.
 * @param promiseFuncs The promise functions to execute.
 * @param concurrencyRate How many promises to execute in each batch.
 * @returns Returns a promise of the results.
 */
export async function executeInBatches<T>(
  promiseFuncs: PromiseFunction<T>[],
  concurrencyRate: number = 5
): Promise<T[]> {
  const promiseFuncBatches = chunkArray(promiseFuncs, concurrencyRate).map(combinePromiseFunctions);

  const results = await executeSequential(promiseFuncBatches);

  return flatten(results);
}

/**
 * Utility functions.
 */

/**
 * Breaks an array into specified chunk sizes.
 * @param array The array to break apart.
 * @param chunkSize What size the chunks should be.
 * @returns Returns an array of arrays.
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const results: T[][] = [];
  const arrayClone = array.slice();
  const numOfChunks = Math.ceil(arrayClone.length / chunkSize);

  for (let i = 0; i < numOfChunks; i++) {
    results.push(arrayClone.splice(0, chunkSize));
  }

  return results;
}

/**
 * Checks if a value is defined, in a type-safe way.
 * Useful for filtering through arrays.
 * @param value The value to check.
 * @returns Returns true/false if the value is defined.
 */
function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Polyfill for flatten.
 * @param nestedArrays The array of arrays to flatten
 * @returns Returns the flattened array.
 */
function flatten<T>(nestedArrays: T[][]): T[] {
  return ([] as T[]).concat(...nestedArrays);
}
