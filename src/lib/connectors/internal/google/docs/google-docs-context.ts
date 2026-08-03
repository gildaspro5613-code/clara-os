export interface GoogleDocsContext {

  documentId?: string;

  title: string;

  content?: string;

  folderId?: string;

  metadata?: Record<string, unknown>;

}