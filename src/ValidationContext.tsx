import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { FieldAppSDK } from '@contentful/app-sdk';
import { debugLog } from './utils/debug';

interface ValidationState {
    [fieldId: string]: string | undefined; // undefined means no error
}

// Helper function to create validation keys (moved outside component to avoid re-creation)
const getValidationKey = (fieldId: string, validationType?: string) => {
    return validationType ? `${fieldId}:${validationType}` : fieldId;
};

interface ValidationContextType {
    validationState: ValidationState;
    setFieldError: (fieldId: string, error: string, validationType?: string) => void;
    clearFieldError: (fieldId: string, validationType?: string) => void;
    clearAllFieldErrors: (fieldId: string) => void;
    clearAllErrors: () => void;
    isFieldValid: (fieldId: string) => boolean;
    hasFieldError: (fieldId: string, validationType?: string) => boolean;
}

const ValidationContext = createContext<ValidationContextType>({
    validationState: {},
    setFieldError: () => {},
    clearFieldError: () => {},
    clearAllFieldErrors: () => {},
    clearAllErrors: () => {},
    isFieldValid: () => true,
    hasFieldError: () => false,
});

export function useValidation() {
    return useContext(ValidationContext);
}

// Provider component that manages validation state and syncs with Contentful
export function ValidationProvider({ 
    children, 
    sdk 
}: { 
    children: React.ReactNode;
    sdk: FieldAppSDK;
}) {
    const [validationState, setValidationState] = useState<ValidationState>({});
    const { entry } = sdk;

    // Sync validation state to Contentful's validationStatus field
    useEffect(() => {
        if (!entry.fields.validationStatus) return;

        debugLog(`[ValidationContext] SYNC EFFECT - validationState:`, JSON.stringify(validationState, null, 2));

        // Convert context state to Contentful format (only include fields with actual errors)
        const contentfulValidationState = Object.fromEntries(
            Object.entries(validationState).filter(([_, error]) => error && error.trim() !== '')
        );

        debugLog(`[ValidationContext] SYNC EFFECT - contentfulValidationState:`, JSON.stringify(contentfulValidationState, null, 2));

        // Only update if there's actually a change to avoid infinite loops
        const currentValue = entry.fields.validationStatus.getValue() || {};
        debugLog(`[ValidationContext] SYNC EFFECT - currentValue:`, JSON.stringify(currentValue, null, 2));
        
        const hasChanged = JSON.stringify(currentValue) !== JSON.stringify(contentfulValidationState);
        debugLog(`[ValidationContext] SYNC EFFECT - hasChanged:`, hasChanged);
        
        if (hasChanged) {
            debugLog(`[ValidationContext] SYNC EFFECT - UPDATING Contentful field`);
            entry.fields.validationStatus.setValue(contentfulValidationState);
        }
    }, [validationState, entry.fields.validationStatus]);

    // Initialize validation state from Contentful on mount (one-time only)
    useEffect(() => {
        if (!entry.fields.validationStatus) return;
        
        const initialState = entry.fields.validationStatus.getValue() || {};
        debugLog(`[ValidationContext] INITIALIZATION - initialState from Contentful:`, JSON.stringify(initialState, null, 2));
        setValidationState(initialState);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array - only run once on mount

    const setFieldError = useCallback((fieldId: string, error: string, validationType?: string) => {
        const key = getValidationKey(fieldId, validationType);
        debugLog(`[ValidationContext] setFieldError: fieldId="${fieldId}", validationType="${validationType}", key="${key}", error="${error}"`);
        setValidationState(prev => {
            debugLog(`[ValidationContext] setFieldError BEFORE:`, JSON.stringify(prev, null, 2));
            const newState = {
                ...prev,
                [key]: error
            };
            debugLog(`[ValidationContext] setFieldError AFTER:`, JSON.stringify(newState, null, 2));
            return newState;
        });
    }, []);

    const clearFieldError = useCallback((fieldId: string, validationType?: string) => {
        const key = getValidationKey(fieldId, validationType);
        debugLog(`[ValidationContext] clearFieldError: fieldId="${fieldId}", validationType="${validationType}", key="${key}"`);
        setValidationState(prev => {
            debugLog(`[ValidationContext] clearFieldError BEFORE:`, JSON.stringify(prev, null, 2));
            const newState = { ...prev };
            delete newState[key];
            debugLog(`[ValidationContext] clearFieldError AFTER:`, JSON.stringify(newState, null, 2));
            return newState;
        });
    }, []);

    const clearAllFieldErrors = useCallback((fieldId: string) => {
        debugLog(`[ValidationContext] clearAllFieldErrors: fieldId="${fieldId}"`);
        setValidationState(prev => {
            debugLog(`[ValidationContext] clearAllFieldErrors BEFORE:`, JSON.stringify(prev, null, 2));
            const newState = { ...prev };
            const keysToDelete: string[] = [];
            // Remove all validation errors for this field (including namespaced ones)
            Object.keys(newState).forEach(key => {
                if (key === fieldId || key.startsWith(`${fieldId}:`)) {
                    keysToDelete.push(key);
                    delete newState[key];
                }
            });
            debugLog(`[ValidationContext] clearAllFieldErrors DELETED KEYS:`, keysToDelete);
            debugLog(`[ValidationContext] clearAllFieldErrors AFTER:`, JSON.stringify(newState, null, 2));
            return newState;
        });
    }, []);

    const clearAllErrors = useCallback(() => {
        setValidationState({});
    }, []);

    const isFieldValid = useCallback((fieldId: string) => {
        // Check if any validation key for this field has an error
        return !Object.keys(validationState).some(key => 
            (key === fieldId || key.startsWith(`${fieldId}:`)) && validationState[key]
        );
    }, [validationState]);

    const hasFieldError = useCallback((fieldId: string, validationType?: string) => {
        const key = getValidationKey(fieldId, validationType);
        return !!(validationState[key]);
    }, [validationState]);

    const contextValue: ValidationContextType = {
        validationState,
        setFieldError,
        clearFieldError,
        clearAllFieldErrors,
        clearAllErrors,
        isFieldValid,
        hasFieldError,
    };

    return (
        <ValidationContext.Provider value={contextValue}>
            {children}
        </ValidationContext.Provider>
    );
}

export default ValidationContext; 