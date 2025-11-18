import { useEffect, useState, useCallback } from "react";
import { FieldAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { ValidationMessage } from '@contentful/f36-components';
import { SingleEntryReferenceEditor } from "@contentful/field-editor-reference";
import { useValidation } from "../ValidationContext";

interface CustomValidatorSingleRefFieldProps {
    isVisible?: boolean;
}

export default function CustomValidatorSingleRefField({ 
    isVisible = true 
}: CustomValidatorSingleRefFieldProps) {
    const sdk = useSDK<FieldAppSDK>();
    const { field, parameters: { instance } } = sdk;
    const { setFieldError, clearFieldError, isFieldValid } = useValidation();
    const [errorMsg, setErrorMsg] = useState<string | null | undefined>(null);

    // Function to clear validation errors for this field using context
    const clearValidationErrors = useCallback(() => {
        setErrorMsg(null);
        field.setInvalid(false);
        clearFieldError(field.id);
    }, [field, clearFieldError]);

    // Handle validation when field value changes
    const handleValueChange = useCallback((value?: unknown) => {
        if (!isVisible) {
            clearValidationErrors();
            return;
        }
        
        if (!instance.isRequired) {
            clearValidationErrors();
            return;
        }
        
        if (!value) {
            const errorMessage = "Required.";
            setErrorMsg(errorMessage);
            field.setInvalid(true);
            setFieldError(field.id, errorMessage);
            return;
        }
        
        // Field has a value and is visible, clear errors
        clearValidationErrors();
    }, [isVisible, instance.isRequired, field, setFieldError, clearValidationErrors]);

    // Detect visibility changes to immediately clear validation
    useEffect(() => {
        if (!isVisible) {
            clearValidationErrors();
            // Also set value to undefined to avoid validation 
            field.setValue(undefined);
        }
    }, [isVisible, clearValidationErrors, field]);

    // Subscribe to field value changes
    useEffect(() => {
        // Initialize validation state with current value
        handleValueChange(field.getValue());
        
        // Subscribe to changes
        const unsubSelf = field.onValueChanged(handleValueChange);

        return () => {
            unsubSelf?.();
        };
    }, [field, handleValueChange]);

    const sharedParams = {
        ...sdk.parameters,
        instance: {
            ...sdk.parameters.instance,
            showCreateEntityAction: false
        }
    };

    return <>
        <SingleEntryReferenceEditor
            sdk={sdk}
            viewType="card"
            isInitiallyDisabled={true}
            hasCardEditActions={false}
            renderCustomCard={(_props, _, renderDefaultCard) =>
                // @ts-expect-error The renderDefaultCard function is expecting additional props that aren't
                // actually required at runtime according to the library implementation
                renderDefaultCard({ size: 'small' })}
            parameters={sharedParams}
        />
        {(errorMsg || !isFieldValid(field.id)) && (
            <ValidationMessage>{errorMsg || "This field is required."}</ValidationMessage>
        )}
    </>
}
