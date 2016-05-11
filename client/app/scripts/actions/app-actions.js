import debug from 'debug';

import ActionTypes from '../constants/action-types';
import { saveGraph } from '../utils/file-utils';
import { modulo } from '../utils/math-utils';
import { updateRoute } from '../utils/router-utils';
import { bufferDeltaUpdate, resumeUpdate,
  resetUpdateBuffer } from '../utils/update-buffer-utils';
import { doControlRequest, getNodesDelta, getNodeDetails,
  getTopologies, deletePipe } from '../utils/web-api-utils';
import { getActiveTopologyOptions,
  getCurrentTopologyUrl } from '../utils/topology-utils';

const log = debug('scope:app-actions');

export function showHelp() {
  return {type: ActionTypes.SHOW_HELP};
}

export function hideHelp() {
  return {type: ActionTypes.HIDE_HELP};
}

export function toggleHelp() {
  return (dispatch, getState) => {
    if (getState().get('showingHelp')) {
      dispatch(hideHelp());
    } else {
      dispatch(showHelp());
    }
  };
}

export function selectMetric(metricId) {
  return {
    type: ActionTypes.SELECT_METRIC,
    metricId
  };
}

export function pinMetric(metricId) {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.PIN_METRIC,
      metricId,
    });
    updateRoute(getState);
  };
}

export function unpinMetric() {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.UNPIN_METRIC,
    });
    updateRoute(getState);
  };
}

export function pinNextMetric(delta) {
  return (dispatch, getState) => {
    const state = getState();
    const metrics = state.get('availableCanvasMetrics').map(m => m.get('id'));
    const currentIndex = metrics.indexOf(state.get('selectedMetric'));
    const nextIndex = modulo(currentIndex + delta, metrics.count());
    const nextMetric = metrics.get(nextIndex);

    dispatch(pinMetric(nextMetric));
  };
}

export function changeTopologyOption(option, value, topologyId) {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.CHANGE_TOPOLOGY_OPTION,
      topologyId,
      option,
      value
    });
    updateRoute(getState);
    // update all request workers with new options
    resetUpdateBuffer();
    const state = getState();
    getTopologies(getActiveTopologyOptions(state), dispatch);
    getNodesDelta(
      getCurrentTopologyUrl(state),
      getActiveTopologyOptions(state),
      dispatch
    );
    getNodeDetails(
      state.get('topologyUrlsById'),
      state.get('nodeDetails'),
      dispatch
    );
  };
}

export function clickBackground() {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.CLICK_BACKGROUND
    });
    updateRoute(getState);
  };
}

export function clickCloseDetails(nodeId) {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.CLICK_CLOSE_DETAILS,
      nodeId
    });
    updateRoute(getState);
  };
}

export function clickCloseTerminal(pipeId, closePipe) {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.CLICK_CLOSE_TERMINAL,
      pipeId
    });
    if (closePipe) {
      deletePipe(pipeId, dispatch);
    }
    updateRoute(getState);
  };
}

export function clickDownloadGraph() {
  saveGraph();
}

export function clickForceRelayout() {
  return (dispatch) => {
    dispatch({
      type: ActionTypes.CLICK_FORCE_RELAYOUT,
      forceRelayout: true
    });
    // fire only once, reset after dispatch
    setTimeout(() => {
      dispatch({
        type: ActionTypes.CLICK_FORCE_RELAYOUT,
        forceRelayout: false
      });
    }, 100);
  };
}

export function clickNode(nodeId, label, origin) {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.CLICK_NODE,
      origin,
      label,
      nodeId
    });
    updateRoute(getState);
    const state = getState();
    getNodeDetails(
      state.get('topologyUrlsById'),
      state.get('nodeDetails'),
      dispatch
    );
  };
}

export function clickPauseUpdate() {
  return {
    type: ActionTypes.CLICK_PAUSE_UPDATE
  };
}

export function clickRelative(nodeId, topologyId, label, origin) {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.CLICK_RELATIVE,
      label,
      origin,
      nodeId,
      topologyId
    });
    updateRoute(getState);
    const state = getState();
    getNodeDetails(
      state.get('topologyUrlsById'),
      state.get('nodeDetails'),
      dispatch
    );
  };
}

export function clickResumeUpdate() {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.CLICK_RESUME_UPDATE
    });
    resumeUpdate(getState);
  };
}

export function clickShowTopologyForNode(topologyId, nodeId) {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.CLICK_SHOW_TOPOLOGY_FOR_NODE,
      topologyId,
      nodeId
    });
    updateRoute(getState);
    // update all request workers with new options
    resetUpdateBuffer();
    const state = getState();
    getNodesDelta(
      getCurrentTopologyUrl(state),
      getActiveTopologyOptions(state),
      dispatch
    );
  };
}

export function clickTopology(topologyId) {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.CLICK_TOPOLOGY,
      topologyId
    });
    updateRoute(getState);
    // update all request workers with new options
    resetUpdateBuffer();
    const state = getState();
    getNodesDelta(
      getCurrentTopologyUrl(state),
      getActiveTopologyOptions(state),
      dispatch
    );
  };
}

export function openWebsocket() {
  return {
    type: ActionTypes.OPEN_WEBSOCKET
  };
}

export function clearControlError(nodeId) {
  return {
    type: ActionTypes.CLEAR_CONTROL_ERROR,
    nodeId
  };
}

export function closeWebsocket() {
  return {
    type: ActionTypes.CLOSE_WEBSOCKET
  };
}

export function doControl(nodeId, control, args) {
  return (dispatch) => {
    dispatch({
      type: ActionTypes.DO_CONTROL,
      nodeId
    });
    doControlRequest(nodeId, control, args, dispatch);
  };
}

export function enterEdge(edgeId) {
  return {
    type: ActionTypes.ENTER_EDGE,
    edgeId
  };
}

export function enterNode(nodeId) {
  return {
    type: ActionTypes.ENTER_NODE,
    nodeId
  };
}

export function setOptionKeyDown(down) {
  return {
    type: ActionTypes.SET_OPTION_KEY_DOWN,
    down
  };
}

export function hitEsc() {
  return (dispatch, getState) => {
    const state = getState();
    const controlPipe = state.get('controlPipes').last();
    if (state.get('showingHelp')) {
      dispatch(hideHelp());
    } else if (controlPipe && controlPipe.get('status') === 'PIPE_DELETED') {
      dispatch({
        type: ActionTypes.CLICK_CLOSE_TERMINAL,
        pipeId: controlPipe.get('id')
      });
      updateRoute(getState);
      // Don't deselect node on ESC if there is a controlPipe (keep terminal open)
    } else if (state.get('nodeDetails').last() && !controlPipe) {
      dispatch({ type: ActionTypes.DESELECT_NODE });
      updateRoute(getState);
    }
  };
}

export function leaveEdge(edgeId) {
  return {
    type: ActionTypes.LEAVE_EDGE,
    edgeId
  };
}

export function leaveNode(nodeId) {
  return {
    type: ActionTypes.LEAVE_NODE,
    nodeId
  };
}

export function receiveControlError(nodeId, err) {
  return {
    type: ActionTypes.DO_CONTROL_ERROR,
    nodeId,
    error: err
  };
}

export function receiveControlSuccess(nodeId) {
  return {
    type: ActionTypes.DO_CONTROL_SUCCESS,
    nodeId
  };
}

export function receiveNodeDetails(details) {
  return {
    type: ActionTypes.RECEIVE_NODE_DETAILS,
    details
  };
}

export function receiveNodesDelta(delta) {
  return (dispatch, getState) => {
    if (delta.add || delta.update || delta.remove) {
      const state = getState();
      if (state.get('updatePausedAt') !== null) {
        bufferDeltaUpdate(delta);
      } else {
        dispatch({
          type: ActionTypes.RECEIVE_NODES_DELTA,
          delta
        });
      }
    }
  };
}


export function receiveTopologies(topologies) {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.RECEIVE_TOPOLOGIES,
      topologies
    });
    const state = getState();
    getNodesDelta(
      getCurrentTopologyUrl(state),
      getActiveTopologyOptions(state),
      dispatch
    );
    getNodeDetails(
      state.get('topologyUrlsById'),
      state.get('nodeDetails'),
      dispatch
    );
  };
}

export function receiveApiDetails(apiDetails) {
  return {
    type: ActionTypes.RECEIVE_API_DETAILS,
    hostname: apiDetails.hostname,
    version: apiDetails.version,
    plugins: apiDetails.plugins
  };
}

export function receiveControlNodeRemoved(nodeId) {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.RECEIVE_CONTROL_NODE_REMOVED,
      nodeId
    });
    updateRoute(getState);
  };
}

export function receiveControlPipeFromParams(pipeId, rawTty) {
  // TODO add nodeId
  return {
    type: ActionTypes.RECEIVE_CONTROL_PIPE,
    pipeId,
    rawTty
  };
}

export function receiveControlPipe(pipeId, nodeId, rawTty, rawPipeTemplate) {
  return (dispatch, getState) => {
    const state = getState();
    if (state.get('nodeDetails').last()
      && nodeId !== state.get('nodeDetails').last().id) {
      log('Node was deselected before we could set up control!');
      deletePipe(pipeId, dispatch);
      return;
    }

    const controlPipe = state.get('controlPipes').last();
    if (controlPipe && controlPipe.get('id') !== pipeId) {
      deletePipe(controlPipe.get('id'), dispatch);
    }

    dispatch({
      type: ActionTypes.RECEIVE_CONTROL_PIPE,
      nodeId,
      pipeId,
      rawTty,
      rawPipeTemplate
    });

    updateRoute(getState);
  };
}

export function receiveControlPipeStatus(pipeId, status) {
  return {
    type: ActionTypes.RECEIVE_CONTROL_PIPE_STATUS,
    pipeId,
    status
  };
}

export function receiveError(errorUrl) {
  return {
    errorUrl,
    type: ActionTypes.RECEIVE_ERROR
  };
}

export function receiveNotFound(nodeId) {
  return {
    nodeId,
    type: ActionTypes.RECEIVE_NOT_FOUND
  };
}

export function route(urlState) {
  return (dispatch, getState) => {
    dispatch({
      state: urlState,
      type: ActionTypes.ROUTE_TOPOLOGY
    });
    // update all request workers with new options
    const state = getState();
    getTopologies(getActiveTopologyOptions(state), dispatch);
    getNodesDelta(
      getCurrentTopologyUrl(state),
      getActiveTopologyOptions(state),
      dispatch
    );
    getNodeDetails(
      state.get('topologyUrlsById'),
      state.get('nodeDetails'),
      dispatch
    );
  };
}
