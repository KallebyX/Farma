export const DOSAGE_FORM_LABELS = [
  { value: "TABLET", label: "Comprimido" },
  { value: "CAPSULE", label: "Cápsula" },
  { value: "LIQUID", label: "Líquido" },
  { value: "DROPS", label: "Gotas" },
  { value: "INJECTION", label: "Injeção" },
  { value: "CREAM", label: "Creme" },
  { value: "OINTMENT", label: "Pomada" },
  { value: "INHALER", label: "Inalador" },
  { value: "PATCH", label: "Adesivo" },
  { value: "OTHER", label: "Outro" },
] as const;

export const FORM_LABELS: Record<string, string> = Object.fromEntries(
  DOSAGE_FORM_LABELS.map((f) => [f.value, f.label]),
);
