/// <reference path="../References.d.ts"/>
export const SYNC = 'user.sync';
export const UPDATE = 'user.update';
export const TRAVERSE = 'user.traverse';
export const REMOVE = 'user.remove';
export const CHANGE = 'user.change';

export interface User {
	id: string;
	type?: string;
	username?: string;
	password?: string;
	roles?: string[];
	administrator: string;
	permissions?: string[];
}

export type Users = User[];

export interface UserDispatch {
	type: string;
	data?: {
		id?: string;
		user?: User;
		users?: User[];
		page?: number;
		pageCount?: number;
		count?: number;
	};
}
