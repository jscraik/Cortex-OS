import { SimRunner } from "@cortex-os/simlab";

export const wireSimlab = () => {
	return { runner: new SimRunner({}) };
};
