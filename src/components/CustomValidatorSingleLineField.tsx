import { useEffect, useState, useRef, useCallback } from "react";
import { FieldAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { TextInput, ValidationMessage } from '@contentful/f36-components';
import { FieldConnector } from '@contentful/field-editor-shared';
import { queryContentTypes, separateDomainContentTypes, isInSeparateDomain } from "../utils/queryContentTypes";
import { useValidation } from "../ValidationContext";
import { debugLog } from "../utils/debug";

interface CustomValidatorSingleLineFieldProps {
    isVisible?: boolean;
}

export default function CustomValidatorSingleLineField({ 
    isVisible = true 
}: CustomValidatorSingleLineFieldProps) {
    const { entry, cma, field, locales: { default: defaultLocale }, parameters: { instance } } = useSDK<FieldAppSDK>();
    const { setFieldError, clearFieldError, clearAllFieldErrors } = useValidation();
    const [venture, setVenture] = useState(entry.fields['venture']?.getValue());
    const [draft, setDraft] = useState(field.getValue() || '');
    const [checking, setChecking] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null | undefined>(null);
    // 2) Debounce timer ref
    const timer = useRef<number>();
    
    // Separate validation type for duplicate checking
    const DUPLICATE_VALIDATION_TYPE = 'duplicate';
    const SEPARATE_DOMAIN_VALIDATION_TYPE = 'separateDuplicate';
    
    // Function to clear general validation errors for this field (but not duplicate validation)
    const clearGeneralValidationErrors = useCallback(() => {
        debugLog(`[SingleLineField] clearGeneralValidationErrors: fieldId="${field.id}"`);
        field.setInvalid(false);
        // Clear general validation errors but preserve duplicate validation
        clearFieldError(field.id); // This clears the general validation, not the duplicate one
    }, [field, clearFieldError]);

    // Function to clear ALL validation errors for this field (including duplicate)
    const clearAllValidationErrors = useCallback(() => {
        debugLog(`[SingleLineField] clearAllValidationErrors: fieldId="${field.id}"`);
        field.setInvalid(false);
        setErrorMsg(null);
        clearAllFieldErrors(field.id);
        // Also clear both specific validation types
        clearFieldError(field.id, DUPLICATE_VALIDATION_TYPE);
        clearFieldError(field.id, SEPARATE_DOMAIN_VALIDATION_TYPE);
    }, [field, clearAllFieldErrors, clearFieldError]);

    useEffect(() => {
        const currentContentType = entry.getSys().contentType.sys.id;
        
        debugLog(`[SingleLineField] UNIFIED DUPLICATE CHECK EFFECT: fieldId="${field.id}", contentType="${currentContentType}", draft="${draft}", venture="${venture?.sys?.id || 'none'}"`);
        
        if (!instance.isUniquePerVenture) {
            debugLog(`[SingleLineField] DUPLICATE CHECK SKIPPED: isUniquePerVenture=false`);
            return;
        }

        clearTimeout(timer.current);

        if (!draft || !venture) {
            debugLog(`[SingleLineField] CLEARING ALL DUPLICATE VALIDATION: fieldId="${field.id}" (no draft or venture)`);
            field.setValue(undefined);
            field.setInvalid(false);
            setErrorMsg(null);
            clearFieldError(field.id, DUPLICATE_VALIDATION_TYPE);
            clearFieldError(field.id, SEPARATE_DOMAIN_VALIDATION_TYPE);
            return;
        }

        timer.current = window.setTimeout(async () => {
            if (!venture) return;

            // Determine which domain to validate against based on content type
            const isCurrentlyInSeparateDomain = isInSeparateDomain(currentContentType);
            const contentTypesToCheck = isCurrentlyInSeparateDomain ? separateDomainContentTypes.join(',') : queryContentTypes;
            const validationType = isCurrentlyInSeparateDomain ? SEPARATE_DOMAIN_VALIDATION_TYPE : DUPLICATE_VALIDATION_TYPE;
            const domainName = isCurrentlyInSeparateDomain ? 'SEPARATE DOMAIN' : 'ORIGINAL DOMAIN';

            debugLog(`[SingleLineField] ${domainName} CHECK: contentType="${currentContentType}", searching in [${contentTypesToCheck}]`);

            console.log('222222', domainName);
            setChecking(true);
            try {
                const { items: foundEntries } = await cma.entry.getMany({
                    query: {
                        'sys.contentType.sys.id[in]': contentTypesToCheck,
                        'sys.id[ne]': entry.getSys().id,
                        'sys.archivedAt[exists]': false,
                        'query': draft
                    }
                });
                
                debugLog(`[SingleLineField] ${domainName} API RESULT: found ${foundEntries.length} entries`);
                
                const duplicatesForVenture = foundEntries
                    .filter(item =>
                        item.fields.venture?.[defaultLocale]?.sys?.id === venture?.sys?.id
                        && item.fields[field.id]?.[defaultLocale] === draft
                    );

                debugLog(`[SingleLineField] ${domainName} FILTER RESULT: ${duplicatesForVenture.length} duplicates for venture "${venture?.sys?.id}"`);

                if (duplicatesForVenture.length > 0) {
                    debugLog(`[SingleLineField] ${domainName} DUPLICATE DETECTED: fieldId="${field.id}", draft="${draft}"`);
                    await field.setValue(draft);
                    field.setInvalid(true);
                    const errorMessage = isCurrentlyInSeparateDomain 
                        ? "This slug is already taken within the same content type domain for selected venture!"
                        : "This slug is already taken for selected venture. Slug must be unique per venture!";
                    setErrorMsg(errorMessage);
                    setFieldError(field.id, errorMessage, validationType);
                    
                    // Clear the other validation type to avoid conflicts
                    const otherValidationType = isCurrentlyInSeparateDomain ? DUPLICATE_VALIDATION_TYPE : SEPARATE_DOMAIN_VALIDATION_TYPE;
                    clearFieldError(field.id, otherValidationType);
                } else {
                    debugLog(`[SingleLineField] NO ${domainName} DUPLICATE: fieldId="${field.id}", draft="${draft}"`);
                    await field.setValue(draft);
                    field.setInvalid(false);
                    setErrorMsg(null);
                    clearFieldError(field.id, validationType);
                    
                    // Clear the other validation type to avoid stale errors
                    const otherValidationType = isCurrentlyInSeparateDomain ? DUPLICATE_VALIDATION_TYPE : SEPARATE_DOMAIN_VALIDATION_TYPE;
                    clearFieldError(field.id, otherValidationType);
                }
            } catch (error) {
                debugLog(`[SingleLineField] ${domainName} CHECK ERROR: ${error}`);
            } finally {
                setChecking(false);
            }
        }, 500);

        return () => {
            clearTimeout(timer.current);
        };
    }, [draft, field, venture, instance, timer, entry, defaultLocale, cma, setFieldError, clearFieldError]);

    useEffect(() => {
        if (!instance.isUniquePerVenture) return;

        const onVentureChange = async (value?: unknown) => {
            setVenture(value);

            if (!value) {
                setDraft('');
                clearFieldError(field.id);
            }
        };
        
        // Safely check if the field exists before subscribing
        const ventureField = entry.fields['venture'];
        if (!ventureField) return;
        
        const unsubVenture = ventureField.onValueChanged(onVentureChange);

        return () => {
            unsubVenture?.();
        };
    }, [venture, instance, field, entry.fields, clearFieldError]);

    // Detect visibility changes to immediately clear validation
    useEffect(() => {
        if (!isVisible) {
            clearAllValidationErrors();
        }
    }, [isVisible, clearAllValidationErrors]);
    
    useEffect(() => {
        debugLog(`[SingleLineField] REQUIRED VALIDATION EFFECT: fieldId="${field.id}", draft="${draft}", isVisible=${isVisible}, isRequired=${instance.isRequired}`);
        // Skip validation for hidden fields regardless of required status
        if (!isVisible) {
            debugLog(`[SingleLineField] FIELD HIDDEN - clearing all validation: fieldId="${field.id}"`);
            clearAllValidationErrors();
            return;
        }

        if (!instance.isRequired || field.id === 'viewAllActionText') {
            // Not required or special field, just ensure it's valid
            debugLog(`[SingleLineField] FIELD NOT REQUIRED - clearing general validation: fieldId="${field.id}"`);
            clearGeneralValidationErrors();
            return;
        }

        if (!draft) {
            // Required but no value
            debugLog(`[SingleLineField] REQUIRED FIELD EMPTY - setting required error: fieldId="${field.id}"`);
            field.setValue(undefined);
            field.setInvalid(true);
            const errorMessage = "Required.";
            setErrorMsg(errorMessage);
            setFieldError(field.id, errorMessage);
            return;
        }
        
        // Field has a value, ensure it's valid
        debugLog(`[SingleLineField] REQUIRED FIELD HAS VALUE - clearing general validation: fieldId="${field.id}"`);
        clearGeneralValidationErrors();
    }, [draft, field, instance, isVisible, setFieldError, clearGeneralValidationErrors, clearAllValidationErrors]);

    useEffect(() => {
        if (field.id !== 'viewAllActionText') return;

        const apply = (type?: string) => {
            const text = type === 'auto' ? 'View All' : type === 'view' ? 'Go to' : '';
            setDraft(text);
            field.setValue(text);
            field.setInvalid(false);
            setErrorMsg(null);
            clearFieldError(field.id);
        };

        // Safely check if the field exists before using it
        const viewAllTypeField = entry.fields['viewAllType'];
        if (!viewAllTypeField) return;
        
        // init on mount
        apply(viewAllTypeField.getValue());

        // subscribe to changes
        const unsub = viewAllTypeField.onValueChanged(apply);
        return () => unsub?.();
    }, [entry.fields, field.id, field, setDraft, setErrorMsg, clearFieldError]);

    return (
        <FieldConnector<string> 
            field={field} 
            isInitiallyDisabled={true} 
            debounce={0}
        >
            {({ errors }) => (
                <div data-test-id="single-line-editor">
                    <TextInput
                        id={field.id}
                        value={draft}
                        isRequired={field.required}
                        isDisabled={!venture}
                        isInvalid={errors.length > 0 || !!errorMsg}
                        onChange={e => {
                            debugLog(`[SingleLineField] onChange: fieldId="${field.id}", newValue="${e.target.value}"`);
                            setErrorMsg(null);
                            field.setInvalid(false);
                            clearFieldError(field.id); // Clear general validation, preserve duplicate validation
                            setDraft(e.target.value);
                        }}
                    />

                    {errorMsg && (
                        <ValidationMessage>{errorMsg}</ValidationMessage>
                    )}
                    {checking && (
                        <ValidationMessage>Running check ...</ValidationMessage>
                    )}
                </div>
            )}
        </FieldConnector>
    );
}
