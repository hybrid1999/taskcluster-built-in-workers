const iterate = require('taskcluster-lib-iterate');
const assert = require('assert');
class TaskQueue {
  constructor(cfg, queue, type) {
    assert(cfg.worker.workerId, 'Worker ID is required');
    assert(cfg.worker.workerType, 'Worker type is required');
    assert(cfg.worker.workerGroup, 'Worker group is required');
    assert(cfg.worker.provisionerId, 'Provisioner ID is required');
    assert(queue, 'Instance of taskcluster queue is required');
    this.queue = queue;
    this.workerType = type;
    this.provisionerId = cfg.worker.provisionerId;
    this.workerGroup = cfg.worker.workerGroup;
    this.workerId = type;
  }

  async runWorker() {
    while (true) {
      await this.claimTask();
    }
  }

  async claimTask() {
    let result = await this.queue.claimWork(this.provisionerId, this.workerType, {
      tasks: 1,
      workerGroup: this.workerGroup,
      workerId: this.workerId,
    });
    if (result.tasks.length === 0) {
      return ;
    }
    const task = result.tasks[0];
    if (Object.keys(task.task.payload).length===0) {
      if (task.task.workerType === 'succeed') {
        return await this.queue.reportCompleted(task.status.taskId, task.runId);
      } else if (result.tasks[0].task.workerType === 'fail') {
        return await this.queue.reportFailed(task.status.taskId, task.runId);
      }
    } else {
      var payload = {
        reason: 'malformed-payload',
      };
      return await this.queue.reportException(task.status.taskId, task.runId, payload);
    }
  }
}
exports.TaskQueue = TaskQueue;