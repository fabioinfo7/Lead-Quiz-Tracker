/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QuizAnswer {
  question: string;
  answer: string;
}

export interface Lead {
  id: string;
  campaign_id: string;
  campaign_name?: string;
  product_name?: string;
  name: string;
  email: string;
  age: number;
  quiz_answers: QuizAnswer[];
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  product_name: string;
  created_at: string;
}

export interface AnalyticsSummary {
  campaignId: string;
  campaignName: string;
  productName: string;
  visits: number;
  ctaClicks: number;
  conversionRate: number; // percentage of visits that became leads
  avgScroll: number; // average scroll percentage
  submissions: number;
}

export interface DailyStat {
  date: string;
  visits: number;
  submissions: number;
}

export interface DatabaseConfig {
  host: string;
  user: string;
  database: string;
  port: number;
  password?: string;
}
