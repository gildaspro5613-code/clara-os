/**
 * ============================================
 * CLARA OS
 * Capability Registry
 * --------------------------------------------
 * Responsibility :
 * Registers every capability available
 * inside Clara OS.
 * ============================================
 */

import {
  GenerateDocumentCapability,
  GenerateDocumentCapabilityDefinition,
} from "./generate-document/capability";

import {
  WorkspaceInstallCapability,
  WorkspaceInstallCapabilityDefinition,
} from "./workspace-install/capability";

import {
  OrganizeDriveCapability,
  OrganizeDriveCapabilityDefinition,
} from "./organize-drive/capability";

import {
  UpdateSheetRowCapability,
  UpdateSheetRowCapabilityDefinition,
} from "./update-sheet-row/capability";

import {
  AppendSheetRowCapability,
  AppendSheetRowCapabilityDefinition,
} from "./append-sheet-row/capability";

import {
  ReadSheetCapability,
  ReadSheetCapabilityDefinition,
} from "./read-sheet/capability";

import {
  FindSheetRowCapability,
  FindSheetRowCapabilityDefinition,
} from "./find-sheet-row/capability";

import {
  DeleteSheetRowCapability,
  DeleteSheetRowCapabilityDefinition,
} from "./delete-sheet-row/capability";

 import {
  ReadDocumentCapability,
} from "./read-document/capability";

import {
  FindDocumentCapability,
} from "./find-document/capability";

import {
  ReadCalendarCapability,
} from "./read-calendar/capability";

import {
  ReadGmailCapability,
  ReadGmailCapabilityDefinition,
} from "./read-gmail/capability";

import {
  DeleteCalendarEventCapability,
  DeleteCalendarEventCapabilityDefinition,
} from "./delete-calendar-event/capability";

import {
  SendGmailCapability,
  SendGmailCapabilityDefinition,
} from "./send-gmail/capability";


import {
  ReadCalendarCapabilityDefinition,
} from "./read-calendar/capability";

import {
  CreateCalendarEventCapability,
  CreateCalendarEventCapabilityDefinition,
} from "./create-calendar-event/capability";

import {
  UpdateCalendarEventCapability,
  UpdateCalendarEventCapabilityDefinition,
} from "./update-calendar-event/capability";

/**
 * Capability definition.
 */
export type CapabilityDefinition =
  | GenerateDocumentCapability
  | WorkspaceInstallCapability
  | OrganizeDriveCapability
  | UpdateSheetRowCapability
  | AppendSheetRowCapability
  | ReadSheetCapability
  | FindSheetRowCapability
  | DeleteSheetRowCapability
  | ReadDocumentCapability
  | FindDocumentCapability
  | ReadCalendarCapability
  | ReadGmailCapability
  | CreateCalendarEventCapability
  | UpdateCalendarEventCapability
  | DeleteCalendarEventCapability
  | SendGmailCapability;

/**
 * Capability Registry.
 */
export class CapabilityRegistry {

  /**
   * Registered capabilities.
   */
  private readonly capabilities: CapabilityDefinition[] = [

    GenerateDocumentCapabilityDefinition,

    WorkspaceInstallCapabilityDefinition,

    OrganizeDriveCapabilityDefinition,

    UpdateSheetRowCapabilityDefinition,

    AppendSheetRowCapabilityDefinition,

    ReadSheetCapabilityDefinition,

    FindSheetRowCapabilityDefinition,

    DeleteSheetRowCapabilityDefinition,

    ReadCalendarCapabilityDefinition,

    ReadGmailCapabilityDefinition,

    CreateCalendarEventCapabilityDefinition,

    UpdateCalendarEventCapabilityDefinition,

    SendGmailCapabilityDefinition,

    DeleteCalendarEventCapabilityDefinition,

  ];

  /**
   * Returns every capability.
   */
  public getAll(): CapabilityDefinition[] {

    return this.capabilities;

  }

  /**
   * Returns a stable capability catalog
   * for cognitive consumers such as the Brain.
   */
  public getAvailableCapabilities(): Array<{
    id: string;
    name: string;
    description: string;
  }> {

    return this.capabilities.map(
      capability => ({
        id: capability.id,
        name: capability.name,
        description: capability.description,
      }),
    );

  }

  /**
   * Finds one capability.
   */
  public findById(
    id: string,
  ): CapabilityDefinition | undefined {

    return this.capabilities.find(

      capability => capability.id === id,

    );

  }

  /**
   * Checks whether a capability exists.
   */
  public has(
    id: string,
  ): boolean {

    return this.findById(id) !== undefined;

  }

}
