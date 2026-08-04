/**
 * ============================================
 * CLARA OS
 * Business Module
 * --------------------------------------------
 * File : business-engine.ts
 * Responsibility :
 * Provides access to business resources.
 * ============================================
 */

import { BusinessRegistry } from "./registry/business-registry";

/**
 * Business Engine.
 */
export class BusinessEngine {

  /**
   * Constructor.
   */
  constructor(
    private readonly registry: BusinessRegistry,
  ) {}

  /**
   * Returns company information.
   */
  public getCompany() {
    return this.registry.company;
  }

  /**
   * Returns available applications.
   */
  public getApplications() {
    return this.registry.applications;
  }

  /**
   * Returns commercial offers.
   */
  public getOffers() {
    return this.registry.offers;
  }

  /**
   * Returns pricing rules.
   */
  public getPricing() {
    return this.registry.pricing;
  }

  /**
   * Returns branding.
   */
  public getBranding() {
    return this.registry.branding;
  }

  /**
   * Returns document templates.
   */
  public getDocuments() {
    return this.registry.documents;
  }

  /**
   * Returns distribution channels.
   */
  public getDistribution() {
    return this.registry.distribution;
  }

}