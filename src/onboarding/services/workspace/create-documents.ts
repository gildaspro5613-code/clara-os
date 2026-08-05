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

/**
 * Creates workspace documents.
 */
export class CreateDocuments {

  /**
   * Creates the default documents.
   */
  public async execute(
    companyName: string,
  ): Promise<string[]> {

    const docs = GoogleWorkspace.docs();

    const documentIds: string[] = [];

    const documents = [

      `${companyName} - Présentation`,

      `${companyName} - Contrat`,

      `${companyName} - Devis`,

      `${companyName} - Compte-rendu`,

    ];

    for (const title of documents) {

      const id =
        await docs.createDocument(title);

      documentIds.push(id);

    }

    return documentIds;

  }

}