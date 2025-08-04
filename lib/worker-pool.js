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

  _handleMessage(worker, e) {
    const { id } = e.data;
    const job = this.jobs.get(id);
    if (!job) return;

    // Run all registered callbacks
    for (const cb of job.callbacks) {
      try {
        cb(e);
      } catch (err) {
        console.warn(`WorkerPool callback threw error: ${err.message}`);
      }
    }

    this.jobs.delete(id);

    if (e.data.error) {
      job.reject(new Error(e.data.error));
    } else {
      job.resolve(e.data.result ?? undefined);
    }

    this.idle.push(worker);
    this._runNext();
  }

  _handleError(worker, e) {
    console.error(`Worker error: ${e.message}`);
    // Optionally implement retry or worker replacement
  }

  _runNext() {
    if (this.queue.length === 0 || this.idle.length === 0) return;
    const worker = this.idle.pop();
    const job = this.queue.shift();

    this.jobs.set(job.data.id, job);
    worker.postMessage(job.data);
  }

  /**
   * Push a task to the worker pool.
   *
   * @param {object} taskData - Task data to send to the worker.
   * @param {Array<function(MessageEvent):void>} [callbacks=[]] - Optional callbacks triggered on message.
   * @returns {Promise<any>}
   */
  push(taskData, callbacks = []) {
    return new Promise((resolve, reject) => {
      const id = ++this.idCounter;
      const data = { ...taskData, id };
      this.queue.push({ data, resolve, reject, callbacks });
      this._runNext();
    });
  }

  /**
   * Terminate all workers gracefully.
   */
  close() {
    this.idle.forEach(worker => worker.terminate());
    this.idle.length = 0;
    this.queue.length = 0;
    this.jobs.clear();
  }
}

