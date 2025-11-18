import { useEffect, useMemo } from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import { FieldAppSDK, locations } from "@contentful/app-sdk";
import Field from "./locations/Field";
import { ValidationProvider } from "./ValidationContext";

const ComponentLocationSettings = {
    [locations.LOCATION_ENTRY_FIELD]: Field
};

const App = () => {
    const sdk = useSDK<FieldAppSDK>();

    useEffect(() => {
        sdk.window.startAutoResizer();

        return () => sdk.window.stopAutoResizer();
    }, [sdk.window]);

    const Component = useMemo(() => {
        for (const [location, component] of Object.entries(
            ComponentLocationSettings
        )) {
            if (sdk.location.is(location)) {
                return component;
            }
        }
    }, [sdk.location]);

    return Component ? (
        <ValidationProvider sdk={sdk}>
            <Component />
        </ValidationProvider>
    ) : null;
};

export default App;
