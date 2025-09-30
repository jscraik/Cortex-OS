import { createBus } from '@cortex-os/a2a-core';
import { inproc } from '@cortex-os/a2a-transport';

const { bus } = createBus(inproc());

import { onUserCreated } from '../app/on-user-created.js';

export const bindAuthObserverEvents = () => {
	bus.bind([{ type: 'user.created', handle: onUserCreated }]);
};
