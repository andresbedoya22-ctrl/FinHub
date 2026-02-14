export type ProductType = "vehicle" | "home" | "life" | "business";

export type ProductRef = {
  id: string;
  section: "private" | "business";
  subsection: string;
  productType: ProductType;
  coverages: string[];
};

export const INSURANCE_PRODUCTS: ProductRef[] = [
  { id: "car", section: "private", subsection: "vehicle", productType: "vehicle", coverages: ["oc", "miniCasco", "autoCasco", "roadside"] },
  { id: "motorbike", section: "private", subsection: "vehicle", productType: "vehicle", coverages: ["liability", "theft", "damage"] },
  { id: "life", section: "private", subsection: "life", productType: "life", coverages: ["death", "funeral", "familySupport"] },
  { id: "home", section: "private", subsection: "home", productType: "home", coverages: ["liability", "accidents", "contents", "legal", "travel"] },
  { id: "businessVehicle", section: "business", subsection: "vehicle", productType: "business", coverages: ["liability", "damage", "roadside"] },
  { id: "avb", section: "business", subsection: "liability", productType: "business", coverages: ["liability", "legal", "thirdParty"] },
  { id: "zzpAccident", section: "business", subsection: "selfEmployed", productType: "business", coverages: ["workAccident", "disability", "dailyPay"] },
  { id: "toolsInVehicle", section: "business", subsection: "operations", productType: "business", coverages: ["tools", "materials", "transport"] },
];

export function getProductsByType(type: ProductType): ProductRef[] {
  return INSURANCE_PRODUCTS.filter((item) => item.productType === type);
}

export function isInsuranceType(value: string): value is ProductType {
  return value === "vehicle" || value === "home" || value === "life" || value === "business";
}
