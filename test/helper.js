const assert = require('assert');
const _ = require('lodash');
const taskcluster = require('taskcluster-client');
const load = require('../src/main');
const slugid = require('slugid');
const worker = require('../src/TaskQueue');
const {stickyLoader, Secrets} = require('taskcluster-lib-testing');

const helper = module.exports;

exports.load = stickyLoader(load);

suiteSetup(async function() {
  exports.load.inject('profile', 'test');
  exports.load.inject('process', 'test');
});

/**
 * Set up a fake tc-queue object that supports only the `task` method,
 * and inject that into the loader.  This is injected regardless of
 * whether we are mocking.
 *
 * The component is available at `helper.queue`.
 */
helper.rootUrl = 'http://localhost:8080';
exports.withFakeQueue = () => {
  suiteSetup(function() {
    helper.queue = stubbedQueue();
    helper.load.inject('queue', helper.queue);
  });
};

exports.withmakeClaimableWork = (payload) => {
  helper.makeClaimableWork = makeClaimableWork(payload);  
  helper.load.inject('makeClaimableWork', helper.makeClaimableWork);
};

const makeClaimableWork = (payload) => {
  const exampleresult = {
    tasks: [
      {
        status: {
          taskId: 0,
        },
        runId: 0,
        workerGroup: 'garbage-hybrid1999',
        workerId: 'succeed',
        task: {
          provisionerId: 'garbage-hybrid1999',
          workerType: 'succeed',
          payload: {payload},
        },
      },
    ],
  };
  return exampleresult;
};

/**
 * make a queue object with the `task` method stubbed out, and with
 * an `addTask` method to add fake tasks.
 */
const stubbedQueue = () => {
  const tasks = {};
  // responses from claimWork
  exports.claimableWork = [];
  // {taskId: resolution}
  exports.taskResolutions = {};
  exports.assertTaskResolved = (taskId, resolution) => {
    console.log('here');
    return assert.deepEqual(exports.taskResolutions[taskId], resolution);
  };
  const queue = new taskcluster.Queue({
    rootUrl: helper.rootUrl,
    credentials:      {
      clientId: 'index-server',
      accessToken: 'none',
    },
    fake: {
      task: async (taskId) => {
        const task = tasks[taskId];
        assert(task, `fake queue has no task ${taskId}`);
        return task;
      },
      claimWork: async (provisionerId, workerType, payload) => {
        return exports.claimableWork.pop();
      },
      reportCompleted: async (taskId, runId) => {
        exports.taskResolutions[taskId] = {completed: true};
        return {};
      },
      reportFailed: async (taskId, runId) => {
        exports.taskResolutions[taskId] = {failed: true};
        return {};
      },
      reportException: async (taskId, runId, payload) => {
        exports.taskResolutions[taskId] = {exception: payload};
        return {};
      },
    },
  });

  return queue;
};