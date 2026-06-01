// Tipos e constantes da descoberta — seguros pra importar em client components.
import type { TrafficEstimate, Verdict } from "./scoring";

export type CompanySize = "small" | "medium" | "large";

export const SIZE_META: Record<CompanySize, { label: string; range: string; description: string }> = {
  small: {
    label: "Pequenas",
    range: "até R$50 mi/ano",
    description: "faturamento total anual de até R$ 50 milhões",
  },
  medium: {
    label: "Médias",
    range: "R$50 mi – R$500 mi/ano",
    description: "faturamento total anual entre R$ 50 milhões e R$ 500 milhões",
  },
  large: {
    label: "Grandes",
    range: "acima de R$500 mi/ano",
    description: "faturamento total anual acima de R$ 500 milhões",
  },
};

export type DiscoveredCompany = {
  company: string;
  briefRationale: string;
  estimatedScore?: number;      // 0-100 — estimativa rápida de fit como cliente RBBT Sales
  estimatedVerdict?: Verdict;    // veredito estimado: vender | qualificar | passar
  estimatedRevenue?: string;
  monthlyTraffic?: TrafficEstimate;
  category?: string;
  size?: CompanySize;            // porte atribuído pelo modelo (útil quando há multi-select)
  sources?: string[];
};
