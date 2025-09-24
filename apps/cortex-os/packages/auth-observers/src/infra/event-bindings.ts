import { bus } from '@cortex-os/a2a';
import { onUserCreated } from '../app/on-user-created.js';

export const bindAuthObserverEvents = () => {
    bus.bind([{ type: 'user.created', handle: onUserCreated }]);
};
