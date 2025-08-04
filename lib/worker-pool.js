export class WorkerPool {
  /**
   * @param {string} workerPath - Path to the worker script (must be module type).
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
    const { id, error, result } = e.data;
    const job = this.jobs.get(id);
    if (!job) return;

    this.jobs.delete(id);
    if (error) {
      job.reject(new Error(error));
    } else {
      job.resolve(result);
    }

    this.idle.push(worker);
    this._runNext();
  }

  _handleError(worker, e) {
    console.error(`Worker error: ${e.message}`);
    // Optionally: remove worker, spawn a new one, or crash
  }

  _runNext() {
    if (this.queue.length === 0 || this.idle.length === 0) return;
    const worker = this.idle.pop();
    const job = this.queue.shift();

    this.jobs.set(job.data.id, job);
    worker.postMessage(job.data);
  }

  /**
   * Push a task to the queue.
   * @param {object} taskData - Task-specific data (serializable).
   * @returns {Promise<any>}
   */
  pushTask(taskData) {
    return new Promise((resolve, reject) => {
      const id = ++this.idCounter;
      const data = { ...taskData, id };
      this.queue.push({ data, resolve, reject });
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

