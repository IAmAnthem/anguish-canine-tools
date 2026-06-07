import autoPlanDemoJson from "../../data/reference/autoplan-demo.json" with { type: "json" };

export type AutoPlanPackage = {
  schemaVersion: 1;
  kind: "autoplan-package";
  exportedAt: string;
  packageId: string;
  packageName: string;
  sourceSnapshot: AutoPlanSourceSnapshot;
  request: AutoPlanRequest;
  lines: AutoPlanLine[];
};

export type AutoPlanSourceSnapshot = {
  source: "canonical-repo-data";
  integrity: "verified" | "needs-work";
  notes: string;
};

export type AutoPlanRequest = {
  cooperatingHumanIds: string[];
  advancingHumanId: string;
  advancingCharacterIds: string[];
  requestedAltCount: number;
  cyclesPerLine: number;
  notes: string;
};

export type AutoPlanLine = {
  lineId: string;
  advancingCharacterId: string;
  lineLabel: string;
  status: "planned" | "in-progress" | "completed";
  cycles: AutoPlanCycle[];
};

export type AutoPlanCycle = {
  cycleId: string;
  cycleNumber: number;
  advancingCharacterId: string;
  supportCharacterId: string | null;
  goal: string;
  estimatedCarryForwardId: string;
  status: "planned" | "executed" | "blocked";
};

export type AutoPlanSummary = {
  packageName: string;
  cooperatingHumans: string[];
  advancingHumanId: string;
  lineCount: number;
  cyclesPerLine: number;
  totalCycles: number;
};

export function getAutoPlanDemoPackage(): AutoPlanPackage {
  return autoPlanDemoJson as AutoPlanPackage;
}

export function getAutoPlanSummary(pkg: AutoPlanPackage): AutoPlanSummary {
  return {
    packageName: pkg.packageName,
    cooperatingHumans: [...pkg.request.cooperatingHumanIds],
    advancingHumanId: pkg.request.advancingHumanId,
    lineCount: pkg.lines.length,
    cyclesPerLine: pkg.request.cyclesPerLine,
    totalCycles: pkg.lines.reduce((sum, line) => sum + line.cycles.length, 0)
  };
}
