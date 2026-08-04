/**
 * ============================================
 * CLARA OS
 * Business Module
 * --------------------------------------------
 * File : business-registry.ts
 * Responsibility :
 * Central registry containing
 * every business resource.
 * ============================================
 */

import { Application } from "../models/application";
import { Offer } from "../models/offer";
import { Pricing } from "../models/pricing";
import { Company } from "../models/company";
import { Branding } from "../models/branding";
import { DistributionChannel } from "../models/distribution-channel";
import { DocumentTemplate } from "../models/document-template";

/**
 * Business registry.
 */
export interface BusinessRegistry {

  /**
   * Available applications.
   */
  applications: Application[];

  /**
   * Commercial offers.
   */
  offers: Offer[];

  /**
   * Pricing rules.
   */
  pricing: Pricing[];

  /**
   * Company information.
   */
  company: Company;

  /**
   * Business branding.
   */
  branding: Branding;

  /**
   * Distribution channels.
   */
  distribution: DistributionChannel[];

  /**
   * Document templates.
   */
  documents: DocumentTemplate[];

}