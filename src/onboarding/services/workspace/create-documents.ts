/**
 * ============================================
 * CLARA OS
 * Workspace Installer
 * --------------------------------------------
 * File : create-documents.ts
 * Responsibility :
 * Creates Google documents
 * for a workspace.
 * ============================================
 */

import { GoogleWorkspace } from "@/lib/integrations/google/workspace";
import type { WorkspaceDocument } from "../../models/workspace-document";

/**
 * Creates workspace documents.
 */
export class CreateDocuments {

  /**
   * Creates the default documents.
   */
  public async execute(
    companyName: string,
  ): Promise<WorkspaceDocument[]> {

    const docs = GoogleWorkspace.docs();

    const createdDocuments: WorkspaceDocument[] = [];

    const documents = [

      `${companyName} - Présentation`,

      `${companyName} - Contrat`,

      `${companyName} - Devis`,

      `${companyName} - Compte-rendu`,

    ];

    for (const title of documents) {

      const document =
        await docs.createDocument(title);

      createdDocuments.push({

        name: title,

        documentId:
          document.documentId,

        documentUrl:
          document.documentUrl,

      });

    }

    return createdDocuments;

  }

}