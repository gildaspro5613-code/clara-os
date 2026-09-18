import { BREVO_CAPABILITIES } from "@/lib/connectors/brevo";

type Parameter = { type: string; description: string; required: boolean };
export type BrevoCommercialCapability = {
  readonly id: string; readonly name: string; readonly description: string;
  readonly version: string; readonly category: string;
  readonly inputSchema: Record<string, Parameter>;
};
const p=(type:string,description:string,required=false):Parameter=>({type,description,required});
const def=(id:string,name:string,description:string,inputSchema:Record<string,Parameter>):BrevoCommercialCapability=>({
  id,name,description,version:"2.0.0",category:"Commercial",inputSchema,
});
export const BrevoCommercialCapabilityDefinitions: BrevoCommercialCapability[] = [
  def(BREVO_CAPABILITIES.CONTACT_SEARCH,"Search Brevo contacts","Find a commercial contact in the native Brevo directory.",{identifier:p("string","Email address or Brevo contact identifier."),limit:p("number","Maximum contacts to return.")}),
  def(BREVO_CAPABILITIES.CONTACT_UPSERT,"Create or update Brevo contact","Create or update a commercial contact directly in Brevo.",{email:p("string","Contact email address.",true),attributes:p("object","Commercial contact attributes."),listIds:p("array","Brevo list identifiers to attach.")}),
  def(BREVO_CAPABILITIES.CONTACT_LIST_MANAGE,"Manage Brevo list membership","Add or remove contacts from a Brevo list.",{listId:p("number","Brevo list identifier.",true),action:p("string","add or remove.",true),emails:p("array","Contact email addresses."),contactIds:p("array","Brevo contact identifiers.")}),
  def(BREVO_CAPABILITIES.LIST_READ,"Read Brevo lists","Read native Brevo commercial lists.",{listId:p("number","Optional Brevo list identifier."),limit:p("number","Maximum lists to return.")}),
  def(BREVO_CAPABILITIES.LIST_CREATE,"Create Brevo list","Create a native Brevo contact list.",{name:p("string","List name.",true),folderId:p("number","Brevo folder identifier.",true)}),
  def(BREVO_CAPABILITIES.TEMPLATE_SEARCH,"Search Brevo templates","Find transactional email templates in Brevo.",{templateId:p("number","Optional template identifier."),templateStatus:p("boolean","Filter active/inactive templates.")}),
  def(BREVO_CAPABILITIES.TEMPLATE_CREATE,"Create Brevo template","Create a transactional email template in Brevo.",{templateName:p("string","Template name.",true),subject:p("string","Email subject.",true),sender:p("object","Sender email/name.",true),htmlContent:p("string","HTML content.")}),
  def(BREVO_CAPABILITIES.EMAIL_PREPARE,"Prepare Brevo email","Prepare a transactional email without sending it.",{to:p("array","Recipients.",true),templateId:p("number","Template identifier."),params:p("object","Template parameters."),subject:p("string","Email subject."),htmlContent:p("string","HTML content."),textContent:p("string","Plain-text content.")}),
  def(BREVO_CAPABILITIES.EMAIL_SEND,"Send Brevo email","Send an approved transactional email through Brevo.",{to:p("array","Recipients.",true),templateId:p("number","Template identifier."),params:p("object","Template parameters."),subject:p("string","Email subject."),htmlContent:p("string","HTML content."),textContent:p("string","Plain-text content.")}),
  def(BREVO_CAPABILITIES.CAMPAIGN_READ,"Read Brevo campaigns","Read native Brevo email campaigns.",{campaignId:p("number","Optional campaign identifier."),limit:p("number","Maximum campaigns to return."),status:p("string","Campaign status filter.")}),
  def(BREVO_CAPABILITIES.CAMPAIGN_PREPARE,"Create Brevo campaign draft","Create a campaign draft in Brevo without sending it.",{name:p("string","Campaign name.",true),subject:p("string","Campaign subject.",true),sender:p("object","Campaign sender.",true),recipients:p("object","Recipient/exclusion list identifiers.",true),templateId:p("number","Optional template identifier."),htmlContent:p("string","Optional HTML content.")}),
  def(BREVO_CAPABILITIES.CAMPAIGN_UPDATE,"Update Brevo campaign","Update an existing Brevo campaign draft.",{campaignId:p("number","Campaign identifier.",true),changes:p("object","Campaign fields to update.",true)}),
  def(BREVO_CAPABILITIES.CAMPAIGN_SEND,"Send Brevo campaign","Send an approved Brevo email campaign now.",{campaignId:p("number","Campaign identifier.",true)}),
  def(BREVO_CAPABILITIES.STATS_READ,"Read Brevo statistics","Read transactional or campaign performance statistics.",{mode:p("string","events, aggregate, or campaign."),campaignId:p("number","Campaign identifier for campaign statistics."),startDate:p("string","Start date."),endDate:p("string","End date."),event:p("string","Transactional event filter.")}),
];
