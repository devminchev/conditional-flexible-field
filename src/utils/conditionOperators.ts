function evaluateCondition(
    fieldValue: any,
    operator: string,
    triggerValue?: any
): boolean {
    switch (operator) {
        case 'equal':
            return fieldValue === triggerValue;
        case 'notEqual':
            return fieldValue !== triggerValue;
        case 'contains':
            if (Array.isArray(fieldValue)) {
                return fieldValue.includes(triggerValue);
            }
            if (typeof fieldValue === 'string') {
                return fieldValue.includes(triggerValue);
            }
            return false;
        case 'isEmpty':
            return fieldValue === undefined || fieldValue === null || fieldValue === '';
        case 'isNotEmpty':
            return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
        default:
            return false;
    };
};

export default evaluateCondition;
