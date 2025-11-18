function evaluateAction(action: string) {
    switch (action) {
        case 'hide':
            return undefined;
        case 'show':
            return {};
        default:
            return undefined;
    };
};

export default evaluateAction