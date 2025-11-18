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

const Field = () => {
  const sdk = useSDK<FieldAppSDK>();
  const { field, entry, locales, parameters } = sdk;
  const fieldType = field.type;
  const { conditionSourceFieldId, conditionOperator, conditionTriggerValue, conditionAction, isRequired, isUniquePerVenture, isUniqueReferenceList } = parameters.instance;
  const conditionalField = conditionSourceFieldId && conditionOperator && conditionTriggerValue && !!conditionAction;
  const customValidatorField = isRequired || isUniquePerVenture || isUniqueReferenceList;
  const shouldShow = useCallback((srcVal: any) => {
    const cond = evaluateCondition(srcVal, conditionOperator, conditionTriggerValue);
    return conditionAction === 'show' ? cond : !cond;
  }, [conditionOperator, conditionTriggerValue, conditionAction]);

  const [showField, setShowField] = useState<boolean>(conditionalField ? shouldShow(entry.fields[conditionSourceFieldId].getValue()) : true);

  useEffect(() => {
    if (!conditionalField) return;

    const onChange = (val: string) => {
      // const srcVal = entry.fields[conditionSourceFieldId].getValue();
      const vis = shouldShow(val);
      setShowField(vis);

      if (!vis) {
        const statusValue = entry.fields.validationStatus.getValue();
        if (statusValue?.[field.id]) {
          const { [field.id]: _, ...validations } = statusValue;

          entry.fields.validationStatus.setValue(validations);
        };
        entry.fields[field.id]?.setValue(undefined);
        field.setInvalid(false);
      };
    };
    const unsubSrc = entry.fields[conditionSourceFieldId].onValueChanged(onChange);

    return () => {
      unsubSrc();
    };
  }, [field]);

  if (!showField) {
    return null;
  };

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
      return <CustomValidatorSingleRefField />
    };

    return <SingleEntryReferenceEditor
      sdk={sdk}
      viewType="card"
      isInitiallyDisabled={true}
      hasCardEditActions={false}
      renderCustomCard={(_props, _, renderDefaultCard) =>
        // @ts-expect-error
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
      return <CustomValidatorDropdownField />
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
    return <CustomValidatorSingleLineField />
  };

  return <SingleLineEditor field={field} locales={locales} />;
};

export default Field;
