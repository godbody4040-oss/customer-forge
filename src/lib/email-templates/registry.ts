import type { ComponentType } from "react";
import { template as automationMessageTemplate } from "./automation-message";
import { template as leadAlertTemplate } from "./lead-alert";
import { template as growthAssessmentTemplate } from "./growth-assessment";
import {
  lifecycleBookingFollowUpTemplate,
  lifecycleSetupReminderTemplate,
  lifecycleWelcomeTemplate,
  lifecycleWinbackTemplate,
} from "./lifecycle";

import {
  canceledTemplate,
  planChangedTemplate,
  saleAlertTemplate,
  welcomeTemplate,
} from "./billing-lifecycle";

export interface TemplateEntry {
  component: ComponentType<any>;
  subject: string | ((data: Record<string, any>) => string);
  displayName?: string;
  previewData?: Record<string, any>;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  "automation-message": automationMessageTemplate,
  "lead-alert": leadAlertTemplate,
  "growth-assessment": growthAssessmentTemplate,
  "billing-welcome": welcomeTemplate,
  "billing-sale-alert": saleAlertTemplate,
  "billing-canceled": canceledTemplate,
  "billing-plan-changed": planChangedTemplate,
  "lifecycle-welcome": lifecycleWelcomeTemplate,
  "lifecycle-setup-reminder": lifecycleSetupReminderTemplate,
  "lifecycle-booking-followup": lifecycleBookingFollowUpTemplate,
  "lifecycle-winback": lifecycleWinbackTemplate,
};
