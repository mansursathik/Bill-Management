// Simulated OCR extraction - generates realistic extracted data from "bill images"

const vendors = [
  "Reliance Digital", "Amazon India", "Flipkart", "BigBasket", "Swiggy",
  "Zomato", "Uber India", "Ola Cabs", "MakeMyTrip", "BookMyShow",
  "Staples India", "HP Store", "Dell Technologies", "Microsoft India",
  "Adobe Systems", "Jio Mart", "D-Mart", "Spencer's", "Metro Cash & Carry",
  "Office Depot India",
];

const categories = [
  "travel", "office_supplies", "meals", "equipment", "software", "utilities", "marketing", "other",
] as const;

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate() {
  const now = new Date();
  const daysAgo = randomBetween(0, 30);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString().split("T")[0];
}

export interface OcrResult {
  vendorName: string;
  amount: number;
  billDate: string;
  category: typeof categories[number];
  confidence: number;
  fieldConfidences: {
    vendorName: number;
    amount: number;
    billDate: number;
  };
}

export function simulateOcrExtraction(_fileName: string): OcrResult {
  const vendor = vendors[randomBetween(0, vendors.length - 1)];
  const category = categories[randomBetween(0, categories.length - 1)];
  const amount = randomBetween(100, 50000);
  const billDate = randomDate();

  const vendorConf = Math.random() * 0.3 + 0.7; // 0.7 - 1.0
  const amountConf = Math.random() * 0.2 + 0.8; // 0.8 - 1.0
  const dateConf = Math.random() * 0.25 + 0.75; // 0.75 - 1.0
  const overallConf = (vendorConf + amountConf + dateConf) / 3;

  return {
    vendorName: vendor,
    amount,
    billDate,
    category,
    confidence: Math.round(overallConf * 100) / 100,
    fieldConfidences: {
      vendorName: Math.round(vendorConf * 100) / 100,
      amount: Math.round(amountConf * 100) / 100,
      billDate: Math.round(dateConf * 100) / 100,
    },
  };
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return "text-green-600 bg-green-50 border-green-200";
  if (confidence >= 0.75) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-red-600 bg-red-50 border-red-200";
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "High";
  if (confidence >= 0.75) return "Medium";
  return "Low";
}
