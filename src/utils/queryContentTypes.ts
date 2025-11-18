export const queryContentTypes = 'igJackpotsSection,igGridASection,igGridBSection,igGridCSection,igGridDSection,igGridESection,igGridFSection,igGridGSection,igCarouselA,igCarouselB,igSimilarityBasedPersonalisedSection,igCollabBasedPersonalisedSection,igSearchResults';

// Separate domain content types that have their own uniqueness validation
export const separateDomainContentTypes = ['igView'];

// Type-safe helper to check if a content type is in the separate domain
export const isInSeparateDomain = (contentType: string): boolean => {
    return separateDomainContentTypes.includes(contentType);
};
