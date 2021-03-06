import _ from 'lodash';
import debug from 'debug';
import Immutable from 'immutable';

import { receiveNodesDelta } from '../actions/app-actions';

const log = debug('scope:update-buffer-utils');
const makeList = Immutable.List;
const feedInterval = 1000;
const bufferLength = 100;

let deltaBuffer = makeList();
let updateTimer = null;

function isPaused(getState) {
  return getState().get('updatePausedAt') !== null;
}

export function resetUpdateBuffer() {
  clearTimeout(updateTimer);
  deltaBuffer = deltaBuffer.clear();
}

function maybeUpdate(getState) {
  if (isPaused(getState)) {
    clearTimeout(updateTimer);
    resetUpdateBuffer();
  } else {
    if (deltaBuffer.size > 0) {
      const delta = deltaBuffer.first();
      deltaBuffer = deltaBuffer.shift();
      receiveNodesDelta(delta);
    }
    if (deltaBuffer.size > 0) {
      updateTimer = setTimeout(maybeUpdate, feedInterval);
    }
  }
}

// consolidate first buffer entry with second
function consolidateBuffer() {
  const first = deltaBuffer.first();
  deltaBuffer = deltaBuffer.shift();
  const second = deltaBuffer.first();
  let toAdd = _.union(first.add, second.add);
  let toUpdate = _.union(first.update, second.update);
  let toRemove = _.union(first.remove, second.remove);
  log('Consolidating delta buffer', 'add', _.size(toAdd), 'update',
    _.size(toUpdate), 'remove', _.size(toRemove));

  // check if an added node in first was updated in second -> add second update
  toAdd = _.map(toAdd, node => {
    const updateNode = _.find(second.update, {id: node.id});
    if (updateNode) {
      toUpdate = _.reject(toUpdate, {id: node.id});
      return updateNode;
    }
    return node;
  });

  // check if an updated node in first was updated in second -> updated second update
  // no action needed, successive updates are fine

  // check if an added node in first was removed in second -> dont add, dont remove
  _.each(first.add, node => {
    const removedNode = _.find(second.remove, {id: node.id});
    if (removedNode) {
      toAdd = _.reject(toAdd, {id: node.id});
      toRemove = _.reject(toRemove, {id: node.id});
    }
  });

  // check if an updated node in first was removed in second -> remove
  _.each(first.update, node => {
    const removedNode = _.find(second.remove, {id: node.id});
    if (removedNode) {
      toUpdate = _.reject(toUpdate, {id: node.id});
    }
  });

  // check if an removed node in first was added in second ->  update
  // remove -> add is fine for the store

  // update buffer
  log('Consolidated delta buffer', 'add', _.size(toAdd), 'update',
    _.size(toUpdate), 'remove', _.size(toRemove));
  deltaBuffer.set(0, {
    add: toAdd.length > 0 ? toAdd : null,
    update: toUpdate.length > 0 ? toUpdate : null,
    remove: toRemove.length > 0 ? toRemove : null
  });
}

export function bufferDeltaUpdate(delta) {
  if (delta.add === null && delta.update === null && delta.remove === null) {
    log('Discarding empty nodes delta');
    return;
  }

  if (deltaBuffer.size >= bufferLength) {
    consolidateBuffer();
  }

  deltaBuffer = deltaBuffer.push(delta);
  log('Buffering node delta, new size', deltaBuffer.size);
}

export function getUpdateBufferSize() {
  return deltaBuffer.size;
}

export function resumeUpdate(getState) {
  maybeUpdate(getState);
}
