import { Facet } from '@codemirror/state';

export interface InternalLink {
    internalLinkName: string;
    filePath?: string;
    redirectToPath: string;
}

export const internalLinkMapFacet = Facet.define<InternalLink[], InternalLink[]>({
    combine: values => values.length ? values.flat() : [],
}); 