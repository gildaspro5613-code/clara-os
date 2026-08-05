/**
 * ============================================
 * CLARA OS
 * Business Module
 * --------------------------------------------
 * File : business-engine.ts
 * Responsibility :
 * Central business engine.
 * ============================================
 */

import { Application } from "./models/application";
import { BusinessRegistry } from "./registry/business-registry";

/**
 * Business engine.
 */
export class BusinessEngine {

  /**
   * Constructor.
   */
  constructor(

    private readonly registry: BusinessRegistry,

  ) {}

  /**
   * Returns every application.
   */
  public getApplications(): Application[] {

    return this.registry.applications;

  }

  /**
   * Returns one application.
   */
  public getApplication(
    id: string,
  ): Application | undefined {

    return this.registry.applications.find(

      application => application.id === id,

    );

  }

  /**
   * Returns every offer.
   */
  public getOffers() {

    return this.registry.offers;

  }

  /**
   * Returns company information.
   */
  public getCompany() {

    return this.registry.company;

  }

  /**
   * Returns branding.
   */
  public getBranding() {

    return this.registry.branding;

  }

}