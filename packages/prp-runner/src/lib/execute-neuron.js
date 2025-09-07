export async function executeNeuron(neuron, state, context) {
    try {
        return await neuron.execute(state, context);
    }
    catch (error) {
        console.error("Error executing neuron:", error);
        throw error;
    }
}
//# sourceMappingURL=execute-neuron.js.map