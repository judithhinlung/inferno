import {
	isNullOrUndef,
	isArray,
	isNull,
	isInvalid,
	isFunction,
	throwError,
	isObject
} from '../shared';
import { removeChild } from './utils';
import { componentToDOMNodeMap } from './rendering';
import {
	CHILDREN,
	PROP_REF,
	PROP_SPREAD
} from '../core/ValueTypes';
import {
	ELEMENT,
	COMPONENT,
	PLACEHOLDER,
	OPT_ELEMENT,
	FRAGMENT,
	TEXT
} from '../core/NodeTypes';
import {
	poolOptVElement,
	poolVComponent,
	recyclingEnabled
} from './recycling';

export function unmount(input, parentDom, lifecycle, canRecycle, shallowUnmount) {
	if (!isInvalid(input)) {
		switch (input.nodeType) {
			case OPT_ELEMENT:
				return unmountOptVElement(input, parentDom, lifecycle, canRecycle, shallowUnmount);
			case COMPONENT:
				return unmountVComponent(input, parentDom, lifecycle, canRecycle, shallowUnmount);
			case ELEMENT:
				return unmountVElement(input, parentDom, lifecycle, shallowUnmount);
			case FRAGMENT:
				return unmountVFragment(input, parentDom, true, lifecycle, shallowUnmount);
			case TEXT:
				return unmountVText(input, parentDom);
			case PLACEHOLDER:
				unmountVPlaceholder(input, parentDom);
			default:
				// TODO
		}
	}
}

function unmountVPlaceholder(vPlaceholder, parentDom) {
	if (parentDom) {
		removeChild(parentDom, vPlaceholder.dom);
	}
}

function unmountVText(vText, parentDom) {
	if (parentDom) {
		removeChild(parentDom, vText.dom);
	}
}

function unmountOptVElement(optVElement, parentDom, lifecycle, canRecycle, shallowUnmount) {
	const bp = optVElement.bp;
	const bp0 = bp.v0;

	if (!shallowUnmount) {
		if (!isNull(bp0)) {
			unmountOptVElementValue(optVElement, bp0, optVElement.v0, lifecycle, shallowUnmount);
			const bp1 = bp.v1;

			if (!isNull(bp1)) {
				unmountOptVElementValue(optVElement, bp1, optVElement.v1, lifecycle, shallowUnmount);
				const bp2 = bp.v2;

				if (!isNull(bp2)) {
					unmountOptVElementValue(optVElement, bp2, optVElement.v2, lifecycle, shallowUnmount);
				}
			}
		}
	}
	if (!isNull(parentDom)) {
		parentDom.removeChild(optVElement.dom);
	}
	if (recyclingEnabled && (parentDom || canRecycle)) {
		poolOptVElement(optVElement);
	}
}

function unmountOptVElementValue(optVElement, valueType, value, lifecycle, shallowUnmount) {
	switch (valueType) {
		case CHILDREN:
			unmountChildren(value, lifecycle, shallowUnmount);
			break;
		case PROP_REF:
			unmountRef(value);
			break;
		case PROP_SPREAD:
			unmountProps(value, lifecycle);
			break;
		default:
			// TODO
	}
}

export function unmountVFragment(vFragment, parentDom, removePointer, lifecycle, shallowUnmount) {
	const children = vFragment.children;
	const childrenLength = children.length;
	const pointer = vFragment.pointer;

	if (!shallowUnmount && childrenLength > 0) {
		for (let i = 0; i < childrenLength; i++) {
			const child = children[i];

			if (child === FRAGMENT) {
				unmountVFragment(child, parentDom, true, lifecycle, false);
			} else {
				unmount(child, parentDom, lifecycle, false, shallowUnmount);
			}
		}
	}
	if (parentDom && removePointer) {
		removeChild(parentDom, pointer);
	}
}

export function unmountVComponent(vComponent, parentDom, lifecycle, canRecycle, shallowUnmount) {
	const instance = vComponent.instance;

	if (!shallowUnmount) {
		let instanceHooks = null;

		vComponent.unmounted = true;
		if (!isNullOrUndef(instance)) {
			const ref = vComponent.ref;

			if (ref) {
				ref(null);
			}
			instanceHooks = instance.hooks;
			if (instance.render !== undefined) {
				instance.componentWillUnmount();
				instance._unmounted = true;
				componentToDOMNodeMap.delete(instance);
				unmount(instance._lastInput, null, lifecycle, false, shallowUnmount);
			} else {
				unmount(instance, null, lifecycle, false, shallowUnmount);
			}
		}
		const hooks = vComponent.hooks || instanceHooks;

		if (!isNullOrUndef(hooks)) {
			if (!isNullOrUndef(hooks.onComponentWillUnmount)) {
				hooks.onComponentWillUnmount();
			}
		}
	}
	if (parentDom) {
		let lastInput = instance._lastInput;

		if (isNullOrUndef(lastInput)) {
			lastInput = instance;
		}
		if (lastInput === FRAGMENT) {
			unmountVFragment(lastInput, parentDom, true, lifecycle, true);
		} else {
			removeChild(parentDom, vComponent.dom);
		}
	}
	if (recyclingEnabled && (parentDom || canRecycle)) {
		poolVComponent(vComponent);
	}
}

export function unmountVElement(vElement, parentDom, lifecycle, shallowUnmount) {
	const dom = vElement.dom;
	const ref = vElement.ref;

	if (!shallowUnmount) {
		if (ref) {
			unmountRef(ref);
		}
		const children = vElement.children;

		if (!isNullOrUndef(children)) {
			unmountChildren(children, lifecycle, shallowUnmount);
		}
	}
	if (parentDom) {
		removeChild(parentDom, dom);
	}
}

function unmountChildren(children, lifecycle, shallowUnmount) {
	if (isArray(children)) {
		for (let i = 0; i < children.length; i++) {
			const child = children[i];

			if (isObject(child)) {
				unmount(child, null, lifecycle, false, shallowUnmount);
			}
		}
	} else if (isObject(children)) {
		unmount(children, null, lifecycle, false, shallowUnmount);
	}
}

function unmountRef(ref) {
	if (isFunction(ref)) {
		ref(null);
	} else {
		if (isInvalid(ref)) {
			return;
		}
		if (process.env.NODE_ENV !== 'production') {
			throwError('string "refs" are not supported in Inferno 0.8+. Use callback "refs" instead.');
		}
		throwError();
	}
}

function unmountProps(props, lifecycle) {
	for (let prop in props) {
		if (!props.hasOwnProperty(prop)) {
			continue;
		}

		const value = props[prop];

		if (prop === 'ref') {
			unmountRef(value);
		}
	}
}
