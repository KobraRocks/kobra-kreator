import { logWithEmoji, getEmoji } from "./emoji.js";

/**
 * Represents a task queued for a worker.
 * @typedef {{ id?: number, [key: string]: unknown }} WorkerTask
 */

export class WorkerPool {
  /**
   * @param {string} workerPath - Path to the worker script.
   * @param {number} size - Number of workers in the pool.
   */
  constructor(workerPath, size = 2) {
    this.workerPath = workerPath;
    this.idle = [];
    this.queue = [];
    this.jobs = new Map();
    this.idCounter = 0;

    for (let i = 0; i < size; i++) {
      const worker = new Worker(workerPath, { type: "module" });
      worker.onmessage = this._handleMessage.bind(this, worker);
      worker.onerror = this._handleError.bind(this, worker);
      this.idle.push(worker);
    }
  }

  /**
   * Handle messages emitted by a worker.
   * @private
   * @param {Worker} worker - Worker instance that sent the message.
   * @param {MessageEvent} e - Message event from the worker.
   */
  _handleMessage(worker, e) {
    const { id } = e.data;
    const job = this.jobs.get(id);
    if (!job) return;
    // Clear the tracking id since this worker completed the job.
    delete worker.currentJobId;

    // Run all registered callbacks
    for (const cb of job.callbacks) {
      logWithEmoji("system", `${getEmoji("pending")} SYSTEM JOB ${id} -- processing callback ${cb.name}`);
      try {
        cb(e);
      } catch (err) {
        logWithEmoji(
          "warning",
          `WorkerPool callback threw error: ${err.message}`,
        );
      }
    }

    this.jobs.delete(id);

    if (e.data.error) {
      job.reject(new Error(e.data.error));
    } else {
      job.resolve(e.data.result ?? undefined);
    }

    logWithEmoji("build", `WORKER JOB ${id} -- done`);

    this.idle.push(worker);
    this._runNext();
  }

  /**
   * Handle errors raised by a worker.
   * @private
   * @param {Worker} worker - Worker instance that produced the error.
   * @param {ErrorEvent} e - Error event emitted by the worker.
   */
  _handleError(worker, e) {
    logWithEmoji("build", `${getEmoji("error")} Worker error: ${e.message}`);

    // Reject the job if one was in progress so callers don't hang.
    const jobId = worker.currentJobId;
    if (jobId) {
      const job = this.jobs.get(jobId);
      if (job) {
        job.reject(new Error(e.message));
        this.jobs.delete(jobId);
      }
    }

    // Replace the faulty worker with a fresh instance.
    worker.terminate();
    const replacement = new Worker(this.workerPath, { type: "module" });
    replacement.onmessage = this._handleMessage.bind(this, replacement);
    replacement.onerror = this._handleError.bind(this, replacement);
    this.idle.push(replacement);

    this._runNext();
  }

  /**
   * Dispatch the next task in the queue if possible.
   * @private
   */
  _runNext() {
    if (this.queue.length === 0 || this.idle.length === 0) return;
    const worker = this.idle.pop();
    const job = this.queue.shift();

    // Track the current job id on the worker so error handlers can
    // reject the correct promise if something goes wrong.
    worker.currentJobId = job.data.id;
    this.jobs.set(job.data.id, job);
    logWithEmoji("build",`${getEmoji("pending")} WORKER JOB ${job.data.id} -- processing ${job.data.path}`);
    worker.postMessage(job.data);
  }

  /**
   * Push a task to the worker pool.
   *
   * @param {WorkerTask} taskData - Task data to send to the worker.
   * @param {Array<(e: MessageEvent) => void>} [callbacks=[]] - Optional callbacks triggered on message.
   * @returns {Promise<any>}
   */
  push(taskData, callbacks = []) {
    return new Promise((resolve, reject) => {
      const id = ++this.idCounter;
      const data = { ...taskData, id };
      // push a job  
      this.queue.push({ data, resolve, reject, callbacks });
      this._runNext();
    });
  }

  /**
   * Terminate all workers gracefully.
   */
  close() {
    this.idle.forEach((worker) => worker.terminate());
    this.idle.length = 0;
    this.queue.length = 0;
    this.jobs.clear();
  }
}
