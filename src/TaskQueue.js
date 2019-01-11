const iterate = require('taskcluster-lib-iterate');
const assert = require('assert');
class TaskQueue {
  constructor(cfg, queue) {
    assert(cfg.worker.workerId, 'Worker ID is required');
    assert(cfg.worker.workerType, 'Worker type is required');
    assert(cfg.worker.workerGroup, 'Worker group is required');
    assert(cfg.worker.provisionerId, 'Provisioner ID is required');
    assert(queue, 'Instance of taskcluster queue is required');
    this.queue = queue;
    this.workerType = cfg.worker.workerType;
    this.provisionerId = cfg.worker.provisionerId;
    this.workerGroup = cfg.worker.workerGroup;
    this.workerId = cfg.worker.workerId;
  }
  async startWorker() {

    while (true) {
      await this.claimTasks();
    }
  }

  async claimTasks() {
    let capacity = 1;
    let result = await this.queue.claimWork(this.provisionerId, this.workerType, {
      tasks: capacity,
      workerGroup: this.workerGroup,
      workerId: this.workerId,
    });
    let stat = '';
    if (Object.keys(result.tasks.task.payload).length===0) {
      if (result.tasks.task.workerType === 'succeed') {
        let reportsuccess = await this.queue.reportCompleted(result.tasks.status.taskId, result.tasks.runId);
        return reportsuccess;
      } else if (result.tasks.task.workerType === 'fail') {
        let reportfailure =  await this.queue.reportFailed(result.tasks.status.taskId, result.tasks.runId);
        return reportfailure;
      }
    } else {
      var payload = {
        reason: 'malformed-payload',
      };
      let reportmp = await this.queue.reportException(result.tasks.status.taskId, result.tasks.runId, payload);
      return reportmp;
    }
    return stat;
  }
}
exports.TaskQueue = TaskQueue;