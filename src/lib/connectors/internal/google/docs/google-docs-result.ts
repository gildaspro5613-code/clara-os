export interface GoogleDocsResult {

  success: boolean;

  documentId: string;

  title: string;

  url?: string;

  message?: string;

  completedAt: Date;

}