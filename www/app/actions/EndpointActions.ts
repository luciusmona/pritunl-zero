/// <reference path="../References.d.ts"/>
import * as SuperAgent from 'superagent';
import Dispatcher from '../dispatcher/Dispatcher';
import EventDispatcher from '../dispatcher/EventDispatcher';
import * as Alert from '../Alert';
import * as Csrf from '../Csrf';
import Loader from '../Loader';
import EndpointsStore from '../stores/EndpointsStore';
import * as EndpointTypes from '../types/EndpointTypes';
import * as MiscUtils from '../utils/MiscUtils';

let syncId: string;
let chartSyncReqs: {[key: string]: SuperAgent.Request} = {};

export function sync(): Promise<void> {
	let curSyncId = MiscUtils.uuid();
	syncId = curSyncId;

	let loader = new Loader().loading();

	return new Promise<void>((resolve, reject): void => {
		SuperAgent
			.get('/endpoint')
			.query({
				...EndpointsStore.filter,
				page: EndpointsStore.page,
				page_count: EndpointsStore.pageCount,
			})
			.set('Accept', 'application/json')
			.set('Csrf-Token', Csrf.token)
			.end((err: any, res: SuperAgent.Response): void => {
				loader.done();

				if (res && res.status === 401) {
					window.location.href = '/login';
					resolve();
					return;
				}

				if (curSyncId !== syncId) {
					resolve();
					return;
				}

				if (err) {
					Alert.errorRes(res, 'Failed to load endpoints');
					reject(err);
					return;
				}

				Dispatcher.dispatch({
					type: EndpointTypes.SYNC,
					data: {
						endpoints: res.body.endpoints,
						count: res.body.count,
					},
				});

				resolve();
			});
	});
}

export function traverse(page: number): Promise<void> {
	Dispatcher.dispatch({
		type: EndpointTypes.TRAVERSE,
		data: {
			page: page,
		},
	});

	return sync();
}

export function filter(filt: EndpointTypes.Filter): Promise<void> {
	Dispatcher.dispatch({
		type: EndpointTypes.FILTER,
		data: {
			filter: filt,
		},
	});

	return sync();
}

export function commit(endpoint: EndpointTypes.Endpoint): Promise<void> {
	let loader = new Loader().loading();

	return new Promise<void>((resolve, reject): void => {
		SuperAgent
			.put('/endpoint/' + endpoint.id)
			.send(endpoint)
			.set('Accept', 'application/json')
			.set('Csrf-Token', Csrf.token)
			.end((err: any, res: SuperAgent.Response): void => {
				loader.done();

				if (res && res.status === 401) {
					window.location.href = '/login';
					resolve();
					return;
				}

				if (err) {
					Alert.errorRes(res, 'Failed to save endpoint');
					reject(err);
					return;
				}

				resolve();
			});
	});
}

export function create(endpoint: EndpointTypes.Endpoint): Promise<void> {
	let loader = new Loader().loading();

	return new Promise<void>((resolve, reject): void => {
		SuperAgent
			.post('/endpoint')
			.send(endpoint)
			.set('Accept', 'application/json')
			.set('Csrf-Token', Csrf.token)
			.end((err: any, res: SuperAgent.Response): void => {
				loader.done();

				if (res && res.status === 401) {
					window.location.href = '/login';
					resolve();
					return;
				}

				if (err) {
					Alert.errorRes(res, 'Failed to create endpoint');
					reject(err);
					return;
				}

				resolve();
			});
	});
}

export function remove(endpointId: string): Promise<void> {
	let loader = new Loader().loading();

	return new Promise<void>((resolve, reject): void => {
		SuperAgent
			.delete('/endpoint/' + endpointId)
			.set('Accept', 'application/json')
			.set('Csrf-Token', Csrf.token)
			.end((err: any, res: SuperAgent.Response): void => {
				loader.done();

				if (err) {
					Alert.errorRes(res, 'Failed to delete endpoints');
					reject(err);
					return;
				}

				resolve();
			});
	});
}

export function removeMulti(endpointIds: string[]): Promise<void> {
	let loader = new Loader().loading();

	return new Promise<void>((resolve, reject): void => {
		SuperAgent
			.delete('/endpoint')
			.send(endpointIds)
			.set('Accept', 'application/json')
			.set('Csrf-Token', Csrf.token)
			.end((err: any, res: SuperAgent.Response): void => {
				loader.done();

				if (res && res.status === 401) {
					window.location.href = '/login';
					resolve();
					return;
				}

				if (err) {
					Alert.errorRes(res, 'Failed to delete endpoints');
					reject(err);
					return;
				}

				resolve();
			});
	});
}

export function chart(endpointId: string, resource: string,
		period: number, interval: number): Promise<any> {
	let curChartSyncId = MiscUtils.uuid();

	let loader = new Loader().loading();

	resource = resource.replace(/[0-9]/g, '');

	return new Promise<any>((resolve, reject): void => {
		let req = SuperAgent.get('/endpoint/' + endpointId + '/data')
			.query({
				resource: resource,
				period: period.toString(),
				interval: interval.toString(),
			})
			.set('Accept', 'application/json')
			.set('Csrf-Token', Csrf.token)
			.on('abort', () => {
				loader.done();
				resolve(null);
			});
		chartSyncReqs[curChartSyncId] = req;

		req.end((err: any, res: SuperAgent.Response): void => {
			delete chartSyncReqs[curChartSyncId];
			loader.done();

			if (res && res.status === 401) {
				window.location.href = '/login';
				resolve(null);
				return;
			}

			if (err) {
				Alert.errorRes(res, 'Failed to load endpoint chart');
				reject(err);
				return;
			}

			resolve(res.body);
		});
	});
}

export function chartCancel(): void {
	for (let [key, val] of Object.entries(chartSyncReqs)) {
		val.abort();
	}
}

EventDispatcher.register((action: EndpointTypes.EndpointDispatch) => {
	switch (action.type) {
		case EndpointTypes.CHANGE:
			sync();
			break;
	}
});
