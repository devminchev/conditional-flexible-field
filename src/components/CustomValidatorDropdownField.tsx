import { useEffect, useState, useCallback } from "react";
import { FieldAPI, FieldAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { Select, ValidationMessage } from '@contentful/f36-components';
import { FieldConnector, PredefinedValuesError } from '@contentful/field-editor-shared';
import { useValidation } from "../ValidationContext";

export function parseValue(value: string, fieldType: string): string | number | undefined {
    if (value === '') {
        return undefined;
    }
    if (fieldType === 'Integer' || fieldType === 'Number') {
        const asNumber = Number(value);
        return isNaN(asNumber) ? undefined : asNumber;
    }
    return value;
}

interface ValidationWithIn {
    in?: Array<string>;
    [key: string]: unknown;
}

export function getOptions(field: FieldAPI): string[] {
    const validations = field.validations || [];
    const predefinedValues = validations
        .filter((validation): validation is ValidationWithIn => 
            validation !== null && typeof validation === 'object' && 'in' in validation)
        .map(validation => validation.in || []);

    const firstPredefinedValues = predefinedValues.length > 0 ? predefinedValues[0] : [];

    return firstPredefinedValues.map(value => String(parseValue(value, field.type)));
}

interface CustomValidatorDropdownFieldProps {
    isVisible?: boolean;
}

export default function CustomValidatorDropdownField({ 
    isVisible = true 
}: CustomValidatorDropdownFieldProps) {
    const { field, parameters: { instance } } = useSDK<FieldAppSDK>();
    const { setFieldError, clearFieldError, isFieldValid } = useValidation();
    const [draft, setDraft] = useState(field.getValue() || undefined);
    const [errorMsg, setErrorMsg] = useState<string | null | undefined>(null);

    // Function to clear validation errors for this field using context
    const clearValidationErrors = useCallback(() => {
        field.setInvalid(false);
        setErrorMsg(null);
        clearFieldError(field.id);
    }, [field, clearFieldError]);
    
    // Detect visibility changes to immediately clear validation
    useEffect(() => {
        if (!isVisible) {
            clearValidationErrors();
        }
    }, [isVisible, clearValidationErrors]);

    useEffect(() => {
        // Skip validation for hidden fields regardless of required status
        if (!isVisible) {
            clearValidationErrors();
            return;
        }
        
        if (!instance.isRequired) {
            // Not required, just ensure it's valid
            clearValidationErrors();
            return;
        }

        if (!draft) {
            // Required but no value
            field.setValue(undefined);
            field.setInvalid(true);
            const errorMessage = "Required.";
            setErrorMsg(errorMessage);
            setFieldError(field.id, errorMessage);
            return;
        }
        
        // Field has a value, ensure it's valid
        clearValidationErrors();
    }, [draft, field, instance, isVisible, setFieldError, clearValidationErrors]);

    const options = getOptions(field);
    const misconfigured = options.length === 0;

    if (misconfigured) {
        return <PredefinedValuesError />;
    }
    return (
        <FieldConnector<string | number> 
            field={field} 
            isInitiallyDisabled={true} 
            debounce={0}
        >
            {({ value, errors }) => (
                <div data-test-id="dropdown-editor">
                    <Select
                        id={field.id}
                        isInvalid={errors.length > 0 || !!errorMsg || !isFieldValid(field.id)}
                        isRequired={true}
                        value={String(draft ?? '')}
                        onChange={e => {
                            const raw = e.target.value;
                            setErrorMsg(null);
                            field.setInvalid(false);
                            clearFieldError(field.id);
                            setDraft(raw);
                            // persist the selected value back to Contentful
                            const parsedValue = parseValue(raw, field.type);
                            field.setValue(parsedValue);
                        }}
                    >
                        <Select.Option value="">Choose a value</Select.Option>
                        {options.map((option) => (
                            <Select.Option key={String(option)} value={String(option)}>
                                {String(option)}
                            </Select.Option>
                        ))}
                    </Select>
                    {errorMsg && (
                        <ValidationMessage>{errorMsg}</ValidationMessage>
                    )}
                </div>
            )}
        </FieldConnector>
    );
}
