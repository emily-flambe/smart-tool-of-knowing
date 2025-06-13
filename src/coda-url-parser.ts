export interface CodaUrlParts {
  docId: string;
  pageId: string;
  docName?: string;
  pageName?: string;
}

export function parseCodaUrl(url: string): CodaUrlParts {
  // Examples of Coda URLs:
  // Short format: https://coda.io/d/_dK1XVcbhGFG/_suVLWNBV
  // Long format: https://coda.io/d/Engineering-Documentation_dK1XVcbhGFG/Deployment-Team-Norms_suiwoYM6
  // With page name: https://coda.io/d/_dK1XVcbhGFG/_suVLWNBV/Important-URLs
  
  // Extract the two main parts after /d/
  const urlRegex = /https:\/\/coda\.io\/d\/([^/]+)\/([^/?#]+)/;
  const match = url.match(urlRegex);
  
  if (!match) {
    throw new Error('Invalid Coda URL format. Expected format: https://coda.io/d/[DocName_]dDocId/[PageName_]suPageId');
  }
  
  let [, docPart, pagePart] = match;
  let docId: string;
  let docName: string | undefined;
  let pageId: string;
  let pageName: string | undefined;
  
  // Parse document part
  if (docPart.startsWith('_d')) {
    // Short format: _dK1XVcbhGFG
    docId = docPart.substring(2);
  } else if (docPart.includes('_d')) {
    // Long format: Engineering-Documentation_dK1XVcbhGFG
    const docSplit = docPart.split('_d');
    docName = docSplit[0].replace(/-/g, ' ');
    docId = docSplit[1];
  } else {
    throw new Error('Could not extract document ID from URL - missing _d prefix');
  }
  
  // Parse page part
  if (pagePart.startsWith('_su')) {
    // Short format: _suVLWNBV
    pageId = pagePart;
  } else if (pagePart.includes('_su')) {
    // Long format: Deployment-Team-Norms_suiwoYM6
    const pageSplit = pagePart.split('_su');
    pageName = pageSplit[0].replace(/-/g, ' ');
    pageId = '_su' + pageSplit[1];
  } else {
    throw new Error('Could not extract page ID from URL - missing _su prefix');
  }
  
  if (!docId) {
    throw new Error('Could not extract document ID from URL');
  }
  
  if (!pageId) {
    throw new Error('Could not extract page ID from URL');
  }
  
  return {
    docId: docId,
    pageId: pageId, // Return the raw page part, will be resolved later via API
    docName: docName,
    pageName: pageName
  };
}

export function isValidCodaUrl(url: string): boolean {
  try {
    parseCodaUrl(url);
    return true;
  } catch {
    return false;
  }
}