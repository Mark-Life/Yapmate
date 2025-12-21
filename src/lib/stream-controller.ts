/**
 * Stream controller registry for managing AbortControllers
 * In-memory registry for single-instance deployments
 * For multi-instance: move to Redis with streamId -> serverId mapping
 */
const activeStreams = new Map<string, AbortController>();

/**
 * Registers a new stream controller
 * @param streamId - Unique stream identifier
 * @returns The AbortController for this stream
 */
export const registerStream = (streamId: string): AbortController => {
  const controller = new AbortController();
  activeStreams.set(streamId, controller);
  return controller;
};

/**
 * Aborts a stream if it exists
 * @param streamId - Stream identifier to abort
 * @returns true if stream was found and aborted
 */
export const abortStream = (streamId: string): boolean => {
  const controller = activeStreams.get(streamId);
  if (!controller) {
    return false;
  }
  controller.abort();
  activeStreams.delete(streamId);
  return true;
};

/**
 * Removes a stream from registry (on natural completion)
 * @param streamId - Stream identifier to unregister
 */
export const unregisterStream = (streamId: string): void => {
  activeStreams.delete(streamId);
};
