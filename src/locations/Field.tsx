import { useCallback, useEffect, useState } from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import { FieldAppSDK } from "@contentful/app-sdk";
import { MultipleEntryReferenceEditor, SingleEntryReferenceEditor } from "@contentful/field-editor-reference";
import { SingleLineEditor } from "@contentful/field-editor-single-line";
import { DropdownEditor } from '@contentful/field-editor-dropdown';
import evaluateCondition from "../utils/conditionOperators";
import CustomValidatorSingleLineField from "../components/CustomValidatorSingleLineField";
import CustomValidatorDropdownField from "../components/CustomValidatorDropdownField";
import CustomValidatorSingleRefField from "../components/CustomValidatorSingleRefField";
import { useValidation } from "../ValidationContext";

const Field = () => {
  const sdk = useSDK<FieldAppSDK>();
  const { field, entry, locales, parameters } = sdk;
  const { clearFieldError } = useValidation();
  const fieldType = field.type;
  const { conditionSourceFieldId, conditionOperator, conditionTriggerValue, conditionAction, isRequired, isUniquePerVenture, isUniqueReferenceList } = parameters.instance;
  const conditionalField = conditionSourceFieldId && conditionOperator && conditionTriggerValue && !!conditionAction;
  const customValidatorField = isRequired || isUniquePerVenture || isUniqueReferenceList;
  const shouldShow = useCallback((srcVal: unknown) => {
    const cond = evaluateCondition(srcVal, conditionOperator, conditionTriggerValue);
    return conditionAction === 'show' ? cond : !cond;
  }, [conditionOperator, conditionTriggerValue, conditionAction]);

  const [showField, setShowField] = useState<boolean>(conditionalField && entry.fields[conditionSourceFieldId] ? 
    shouldShow(entry.fields[conditionSourceFieldId].getValue()) : true);

  // Simplified clear validation function using context
  const clearValidationErrors = useCallback(() => {
    clearFieldError(field.id);
    field.setInvalid(false);
  }, [clearFieldError, field]);

  useEffect(() => {
    // Always clear validation errors on mount to ensure a clean slate
    if (!showField) {
      clearValidationErrors();
      // Also clear the field value if it's hidden
      entry.fields[field.id]?.setValue(undefined);
    }
  }, [clearValidationErrors, entry, field, showField]);

  useEffect(() => {
    if (!conditionalField) return;

    const onChange = (val: string) => {
      const vis = shouldShow(val);
      const wasVisible = showField;
      setShowField(vis);

      // When visibility changes to hidden
      if (!vis) {
        // Clear validation errors using context
        clearValidationErrors();
        
        // Clear the field value
        entry.fields[field.id]?.setValue(undefined);
      } 
      // When visibility changes from hidden to visible, also clear validation
      // This prevents stale validation errors from reappearing
      else if (!wasVisible && vis) {
        clearValidationErrors();
      }
    };
    
    // Call onChange with the current value to properly initialize/update the field state
    const currentValue = entry.fields[conditionSourceFieldId].getValue();
    onChange(currentValue);
    
    const unsubSrc = entry.fields[conditionSourceFieldId].onValueChanged(onChange);

    return () => {
      unsubSrc();
    };
  }, [field, entry, conditionSourceFieldId, shouldShow, conditionalField, showField, clearValidationErrors]);

  if (!showField) {
    return null;
  }

  const isArrayLink = fieldType === 'Array' && field.items?.type === 'Link';

  const sharedParams = {
    ...sdk.parameters,
    instance: {
      ...sdk.parameters.instance,
      showCreateEntityAction: false
    }
  };

  if (fieldType === 'Link') {
    if (customValidatorField) {
      return <CustomValidatorSingleRefField isVisible={showField} />
    }

    return <SingleEntryReferenceEditor
      sdk={sdk}
      viewType="card"
      isInitiallyDisabled={true}
      hasCardEditActions={false}
      renderCustomCard={(_props, _, renderDefaultCard) =>
        // @ts-expect-error The renderDefaultCard function is expecting additional props that aren't
        // actually required at runtime according to the library implementation
        renderDefaultCard({ size: 'small' })}
      parameters={sharedParams}
    />;
  };

  if (isArrayLink) {
    return (
      <MultipleEntryReferenceEditor
        sdk={sdk}
        viewType="link"
        isInitiallyDisabled={true}
        hasCardEditActions={false}
        parameters={sharedParams}
      />
    );
  };

  const isDropdownList = fieldType === 'Symbol' && field.validations.some(v => v?.in);

  if (isDropdownList) {
    if (customValidatorField) {
      return <CustomValidatorDropdownField isVisible={showField} />
    };

    return (
      <DropdownEditor
        field={field}
        locales={locales}
        isInitiallyDisabled={true}
      />
    );
  };

  if (customValidatorField) {
    return <CustomValidatorSingleLineField isVisible={showField} />
  };

  if (field.id === 'viewAllActionText') {
    return <CustomValidatorSingleLineField isVisible={showField} />;
  }

  return <SingleLineEditor field={field} locales={locales} />;
};

export default Field;
